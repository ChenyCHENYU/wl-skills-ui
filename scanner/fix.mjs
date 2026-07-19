/**
 * 自动修复（A 类：CSS 可覆盖 + template 属性补齐 + 颜色 token 化）
 * 替代旧的 scripts/batch-fix.py，使用与 scanner 一致的容差逻辑
 *
 * 修复项：
 *   - el-table-column: 缺 align="center"        → 添加
 *   - el-input / el-select: 缺 size="small"     → 添加
 *   - el-date-picker: 缺 style="width:100%"     → 添加
 *   - el-table: 缺 empty-text="暂无数据"        → 添加
 *   - <style>/<template> 内可映射 hex 颜色      → 替换为 var(--el-color-*)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createSnapshot } from "./snapshot.mjs";
import { TOKEN_MAP } from "./rules/_shared.mjs";

const FIXES = {
  "el-input": [{ attr: "size", value: "small" }],
  "el-select": [{ attr: "size", value: "small" }],
  "el-date-picker": [{ attr: "style", value: "width:100%" }],
  "el-table": [{ attr: "empty-text", value: "暂无数据" }],
  "el-table-column": [{ attr: "align", value: "center", replaceStatic: true }],
  BaseTable: [
    { attr: "empty-text", value: "暂无数据" },
    { attr: "render-type", value: "agGrid", replaceStatic: true },
  ],
};

export const FIXED_RULE_IDS = Object.freeze([
  "R001",
  "R002",
  "R003",
  "R006",
  "R007",
  "R012",
  "R014",
  "R016",
  "R017",
  "R021",
]);

function parseTag(content, pos, tagName) {
  let i = pos + tagName.length + 1;
  let inSingle = false,
    inDouble = false;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (!inSingle && !inDouble) {
      if (content.slice(i, i + 2) === "/>")
        return { text: content.slice(pos, i + 2), end: i + 2 };
      if (ch === ">") return { text: content.slice(pos, i + 1), end: i + 1 };
    }
    i++;
  }
  return { text: content.slice(pos), end: content.length };
}

function addAttrIfMissing(tagText, tagName, attr, value, replaceStatic = false) {
  // 已存在（含动态绑定 :attr=）则跳过
  const re = new RegExp(
    `:?${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`,
  );
  if (re.test(tagText)) {
    if (!replaceStatic) return { text: tagText, changed: false };
    const staticRe = new RegExp(
      `(\\s${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*)(["'])[^"']*\\2`,
    );
    if (!staticRe.test(tagText)) return { text: tagText, changed: false };
    const text = tagText.replace(staticRe, `$1"${value}"`);
    return { text, changed: text !== tagText };
  }
  const newTag = tagText.replace(
    `<${tagName}`,
    `<${tagName} ${attr}="${value}"`,
  );
  return { text: newTag, changed: true };
}

function fixTemplateAttrs(content) {
  const tagPattern = new RegExp(
    `<(${Object.keys(FIXES)
      .sort((a, b) => b.length - a.length)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})(?=\\s|>|/>)`,
    "g",
  );
  let result = "";
  let pos = 0;
  let changes = 0;
  let m;
  // 按位置遍历，配合 parseTag 处理嵌套引号
  while (true) {
    tagPattern.lastIndex = pos;
    m = tagPattern.exec(content);
    if (!m) {
      result += content.slice(pos);
      break;
    }
    result += content.slice(pos, m.index);
    const tagName = m[1];
    let { text, end } = parseTag(content, m.index, tagName);
    const fixes = [...FIXES[tagName]];
    if (tagName === "el-table-column" && text.includes('type="selection"')) {
      fixes.push({ attr: "header-align", value: "center" });
    }
    for (const { attr, value, replaceStatic } of fixes) {
      const r = addAttrIfMissing(text, tagName, attr, value, replaceStatic);
      text = r.text;
      if (r.changed) changes++;
    }
    result += text;
    pos = end;
  }
  return { content: result, changes };
}

function fixHexColors(content) {
  let changes = 0;
  let result = content;

  function replaceMappedHex(body) {
    return body.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
      const replacement = TOKEN_MAP[match.toLowerCase()];
      if (!replacement) return match;
      changes++;
      return replacement;
    });
  }

  // Style 块内
  result = result.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (full, body) => {
    return full.replace(body, replaceMappedHex(body));
  });

  // Template 中 scanner 可识别的映射色全部替换；script 颜色需业务色板语义，不自动改。
  result = result.replace(/<template[^>]*>([\s\S]*?)<\/template>/g, (full, body) =>
    full.replace(body, replaceMappedHex(body)),
  );

  return { content: result, changes };
}

function* walkVue(dir, excludes) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (excludes.some((x) => e.name === x)) continue;
      yield* walkVue(join(dir, e.name), excludes);
    } else if (e.name.endsWith(".vue")) {
      yield join(dir, e.name);
    }
  }
}

/**
 * 执行修复
 * @param {object} opts { target, exclude, dryRun, projectRoot, noSnapshot }
 * @returns {{ totalFiles, changedFiles, totalChanges, snapshotId? }}
 */
export function runFix({
  target,
  exclude = ["node_modules", "dist", ".git", "SelectPopupCom"],
  dryRun = false,
  projectRoot,
  noSnapshot = false,
}) {
  const changedFiles = [];
  const changedAbsPaths = [];
  let totalChanges = 0;
  let totalFiles = 0;

  // 第一遍：收集所有需要改动的文件及其内容
  const pending = [];
  for (const filePath of walkVue(target, exclude)) {
    totalFiles++;
    const original = readFileSync(filePath, "utf8");
    let content = original;
    let changes = 0;
    const r1 = fixTemplateAttrs(content);
    content = r1.content;
    changes += r1.changes;
    const r2 = fixHexColors(content);
    content = r2.content;
    changes += r2.changes;
    if (changes > 0 && content !== original) {
      pending.push({ filePath, original, content, changes });
      changedAbsPaths.push(filePath);
    }
  }

  // 创建快照（fix 前保存原始内容）。失败即停止，避免不可回退写入。
  let snapshotId = null;
  if (!dryRun && !noSnapshot && changedAbsPaths.length > 0) {
    const root = projectRoot || resolve(target, "..");
    const snap = createSnapshot({
      projectRoot: root,
      targetDir: target,
      filePaths: changedAbsPaths,
      command: "fix",
    });
    snapshotId = snap.id;
  }

  // 第二遍：写入文件
  const written = [];
  try {
    for (const { filePath, original, content, changes } of pending) {
      if (!dryRun) {
        writeFileSync(filePath, content, "utf8");
        written.push({ filePath, original });
      }
      changedFiles.push({
        file: relative(target, filePath).replace(/\\/g, "/"),
        changes,
      });
      totalChanges += changes;
    }
  } catch (error) {
    for (const { filePath, original } of written.reverse()) {
      writeFileSync(filePath, original, "utf8");
    }
    throw new Error(`自动修复写入失败，已回滚本轮改动：${error.message}`, { cause: error });
  }

  return { totalFiles, changedFiles, totalChanges, snapshotId };
}
