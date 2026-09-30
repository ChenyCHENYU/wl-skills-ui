/**
 * 自动修复（A 类：CSS 可覆盖 + template 属性补齐 + 颜色 token 化）
 * 替代旧的 scripts/batch-fix.py，使用与 scanner 一致的容差逻辑
 *
 * 修复项：
 *   - el-table-column: 缺 align="center"        → 添加
 *   - el-input / el-select: 缺 size="small"     → 添加
 *   - el-date/time-picker: 缺 size / width       → 添加或合并
 *   - el-button / BaseToolbar: 缺 small          → 添加
 *   - 静态语义按钮: 缺 icon                      → 按文案确定性补齐
 *   - el-table: 缺 empty-text="暂无数据"        → 添加
 *   - 创建类主按钮: 缺 primary / 误用 plain    → 纠正
 *   - el-table 普通数据列: 缺 overflow tooltip → 添加
 *   - <style>/<template> 内可映射 hex 颜色      → 替换为 var(--el-color-*)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createSnapshot } from "./snapshot.mjs";
import { TOKEN_MAP, hasTrueBooleanAttr } from "./rules/_shared.mjs";
import { CREATE_ACTION_LABEL, STATIC_BUTTON_ICON_BY_LABEL } from "./rules/button.mjs";
import { getRules } from "./rules/index.mjs";
import { walkVue } from "./engine.mjs";

const FIXES = {
  "el-input": [{ rule: "R006", attr: "size", value: "small" }],
  "el-select": [{ rule: "R006", attr: "size", value: "small" }],
  "el-date-picker": [
    { rule: "R006", attr: "size", value: "small" },
    { rule: "R007", attr: "style", value: "width:100%", mergeStyle: true },
  ],
  "el-time-picker": [
    { rule: "R006", attr: "size", value: "small" },
    { rule: "R007", attr: "style", value: "width:100%", mergeStyle: true },
  ],
  "el-button": [{ rule: "R041", attr: "size", value: "small" }],
  ElButton: [{ rule: "R041", attr: "size", value: "small" }],
  "base-toolbar": [{ rule: "R041", attr: "size", value: "small" }],
  BaseToolbar: [{ rule: "R041", attr: "size", value: "small" }],
  "el-table": [{ rule: "R002", attr: "empty-text", value: "暂无数据" }],
  "el-table-column": [
    { rule: "R001", attr: "align", value: "center", replaceStatic: true },
  ],
  BaseTable: [
    { rule: "R003", attr: "empty-text", value: "暂无数据" },
    {
      rule: "R021",
      attr: "render-type",
      value: "agGrid",
      replaceStatic: true,
    },
  ],
};

export const FIXED_RULE_IDS = Object.freeze([
  "R001",
  "R002",
  "R003",
  "R043",
  "R006",
  "R007",
  "R012",
  "R014",
  "R016",
  "R017",
  "R021",
  "R038",
  "R039",
  "R041",
]);

function incrementRule(changesByRule, rule, amount = 1) {
  changesByRule[rule] = (changesByRule[rule] || 0) + amount;
}

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

function addAttrIfMissing(
  tagText,
  tagName,
  attr,
  value,
  replaceStatic = false,
  booleanAttr = false,
  mergeStyle = false,
) {
  // 已存在（含动态绑定 :attr=）则跳过
  const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (
    booleanAttr &&
    new RegExp(`(?:^|\\s):?${escapedAttr}(?=\\s|=|/?>)`).test(tagText)
  ) {
    return { text: tagText, changed: false };
  }
  const re = new RegExp(
    `:?${escapedAttr}\\s*=`,
  );
  if (re.test(tagText)) {
    if (mergeStyle && attr === "style" && !/:style\s*=/.test(tagText)) {
      const staticStyleRe = /(\sstyle\s*=\s*)(["'])([^"']*)\2/;
      const match = tagText.match(staticStyleRe);
      if (!match) return { text: tagText, changed: false };
      if (/(?:^|;)\s*(?:width|inline-size)\s*:/.test(match[3])) {
        return { text: tagText, changed: false };
      }
      const separator = match[3].trim() === "" || /;\s*$/.test(match[3]) ? "" : ";";
      const merged = `${match[3]}${separator}${value}`;
      return {
        text: tagText.replace(staticStyleRe, `$1$2${merged}$2`),
        changed: true,
      };
    }
    if (!replaceStatic) return { text: tagText, changed: false };
    const staticRe = new RegExp(
      `(\\s${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*)(["'])[^"']*\\2`,
    );
    if (!staticRe.test(tagText)) return { text: tagText, changed: false };
    const text = tagText.replace(staticRe, `$1"${value}"`);
    return { text, changed: text !== tagText };
  }
  if (booleanAttr) {
    return {
      text: tagText.replace(`<${tagName}`, `<${tagName} ${attr}`),
      changed: true,
    };
  }
  const newTag = tagText.replace(
    `<${tagName}`,
    `<${tagName} ${attr}="${value}"`,
  );
  return { text: newTag, changed: true };
}

function fixTemplateAttrs(content, enabledRules) {
  const tagPattern = new RegExp(
    `<(${Object.keys(FIXES)
      .sort((a, b) => b.length - a.length)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})(?=\\s|>|/>)`,
    "g",
  );
  let result = "";
  let pos = 0;
  const changesByRule = {};
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
    const fixes = FIXES[tagName].filter(({ rule }) => enabledRules.has(rule));
    if (tagName === "el-table-column" && text.includes('type="selection"')) {
      if (enabledRules.has("R014")) {
        fixes.push({ rule: "R014", attr: "header-align", value: "center" });
      }
    }
    if (
      tagName === "el-table-column" &&
      /(?:^|\s):?prop\s*=/.test(text) &&
      !/(?:^|\s)type\s*=\s*["'](?:selection|index|expand)["']/.test(text)
    ) {
      if (enabledRules.has("R039")) {
        fixes.push({
          rule: "R039",
          attr: "show-overflow-tooltip",
          value: "",
          booleanAttr: true,
        });
      }
    }
    for (const {
      rule,
      attr,
      value,
      replaceStatic,
      booleanAttr,
      mergeStyle,
    } of fixes) {
      const r = addAttrIfMissing(
        text,
        tagName,
        attr,
        value,
        replaceStatic,
        booleanAttr,
        mergeStyle,
      );
      text = r.text;
      if (r.changed) incrementRule(changesByRule, rule);
    }
    result += text;
    pos = end;
  }
  return { content: result, changesByRule };
}

function fixDialogTableEmpty(content) {
  let changes = 0;
  const result = content.replace(
    /<(el-dialog|ElDialog)\b[\s\S]*?<\/\1>/g,
    (dialog) =>
      dialog.replace(/<el-table(?=\s|>|\/>)[^>]*>/g, (tagText) => {
        const fixed = addAttrIfMissing(
          tagText,
          "el-table",
          "empty-text",
          "暂无数据",
        );
        if (fixed.changed) changes++;
        return fixed.text;
      }),
  );
  return { content: result, changes };
}

function fixSemanticButtonIcons(content) {
  let changes = 0;
  const result = content.replace(
    /<(el-button|ElButton)\b[\s\S]*?<\/\1>/g,
    (button, tagName) => {
      const openEnd = button.indexOf(">");
      if (openEnd < 0) return button;
      let opening = button.slice(0, openEnd + 1);
      if (/:?icon\s*=/.test(opening) || /<el-icon\b/.test(button)) return button;
      if (hasTrueBooleanAttr(opening, "link") || hasTrueBooleanAttr(opening, "text")) {
        return button;
      }
      const label = button
        .slice(openEnd + 1, button.lastIndexOf(`</${tagName}>`))
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, "");
      const icon = STATIC_BUTTON_ICON_BY_LABEL.find(([pattern]) =>
        pattern.test(label),
      )?.[1];
      if (!icon) return button;
      const iconResult = addAttrIfMissing(opening, tagName, "icon", icon);
      if (!iconResult.changed) return button;
      opening = iconResult.text;
      changes++;
      return opening + button.slice(openEnd + 1);
    },
  );
  return { content: result, changes };
}

function fixPrimaryActionButtons(content) {
  let changes = 0;
  const result = content.replace(
    /<el-button\b[\s\S]*?<\/el-button>/g,
    (button) => {
      const openEnd = button.indexOf(">");
      if (openEnd < 0) return button;
      let opening = button.slice(0, openEnd + 1);
      const label = button.slice(openEnd + 1, button.lastIndexOf("</el-button>"));
      if (!CREATE_ACTION_LABEL.test(label)) return button;
      if (/:type\s*=/.test(opening)) return button;
      if (hasTrueBooleanAttr(opening, "link") || hasTrueBooleanAttr(opening, "text"))
        return button;

      const typeResult = addAttrIfMissing(
        opening,
        "el-button",
        "type",
        "primary",
        true,
      );
      opening = typeResult.text;
      if (typeResult.changed) changes++;

      const withoutPlain = opening
        .replace(/\s+:plain\s*=\s*["']true["']/g, "")
        .replace(/\s+plain\s*=\s*["'](?:true|)["']/g, "")
        .replace(/\s+plain(?=\s|\/?>)/g, "");
      if (withoutPlain !== opening) {
        opening = withoutPlain;
        changes++;
      }
      return opening + button.slice(openEnd + 1);
    },
  );
  return { content: result, changes };
}

function fixHexColors(content, enabledRules) {
  const changesByRule = {};
  let result = content;

  function replaceMappedHex(body, rule) {
    return body.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
      const replacement = TOKEN_MAP[match.toLowerCase()];
      if (!replacement) return match;
      incrementRule(changesByRule, rule);
      return replacement;
    });
  }

  // Style 块内
  if (enabledRules.has("R016")) {
    result = result.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (full, body) => {
      return full.replace(body, replaceMappedHex(body, "R016"));
    });
  }

  // Template 中 scanner 可识别的映射色全部替换；script 颜色需业务色板语义，不自动改。
  if (enabledRules.has("R017")) {
    result = result.replace(
      /<template[^>]*>([\s\S]*?)<\/template>/g,
      (full, body) => full.replace(body, replaceMappedHex(body, "R017")),
    );
  }

  return { content: result, changesByRule };
}

/**
 * 执行修复
 * @param {object} opts { target, exclude, dryRun, projectRoot, noSnapshot }
 * @returns {{ totalFiles, changedFiles, totalChanges, snapshotId? }}
 */
export function runFix({
  target,
  exclude = ["node_modules", "dist", ".git"],
  dryRun = false,
  projectRoot,
  noSnapshot = false,
  profile = "native-element",
  only,
  skip,
  expectedPlanHash,
}) {
  const enabledRules = new Set(FIXED_RULE_IDS);
  const profileRules = new Set(getRules({ profile }).map(({ id }) => id));
  for (const rule of [...enabledRules]) {
    if (!profileRules.has(rule)) enabledRules.delete(rule);
  }
  if (only) {
    for (const rule of [...enabledRules]) {
      if (!only.has(rule)) enabledRules.delete(rule);
    }
  }
  if (skip) {
    for (const rule of skip) enabledRules.delete(rule);
  }

  const changedFiles = [];
  const changedAbsPaths = [];
  const changesByRule = {};
  let totalChanges = 0;
  let totalFiles = 0;

  // 第一遍：收集所有需要改动的文件及其内容
  const pending = [];
  for (const filePath of walkVue(target, exclude)) {
    totalFiles++;
    const original = readFileSync(filePath, "utf8");
    let content = original;
    let changes = 0;
    const fileRules = {};
    const collect = (result, fallbackRule) => {
      content = result.content;
      if (fallbackRule && result.changes) {
        incrementRule(fileRules, fallbackRule, result.changes);
        changes += result.changes;
      }
      for (const [rule, count] of Object.entries(result.changesByRule || {})) {
        incrementRule(fileRules, rule, count);
        changes += count;
      }
    };

    const r1 = fixTemplateAttrs(content, enabledRules);
    collect(r1);

    if (enabledRules.has("R012")) {
      collect(fixDialogTableEmpty(content), "R012");
    }

    if (enabledRules.has("R038")) {
      collect(fixPrimaryActionButtons(content), "R038");
    }

    if (enabledRules.has("R043")) {
      collect(fixSemanticButtonIcons(content), "R043");
    }

    const r4 = fixHexColors(content, enabledRules);
    collect(r4);
    if (changes > 0 && content !== original) {
      pending.push({ filePath, original, content, changes, rules: fileRules });
      changedAbsPaths.push(filePath);
    }
  }

  pending.sort((a, b) => a.filePath.localeCompare(b.filePath));
  const root = projectRoot || resolve(target, "..");
  const planHash = createHash("sha256")
    .update(
      JSON.stringify({
        profile,
        enabledRules: [...enabledRules].sort(),
        files: pending.map(({ filePath, original, content }) => ({
          file: relative(root, filePath).replace(/\\/g, "/"),
          before: createHash("sha256").update(original).digest("hex"),
          after: createHash("sha256").update(content).digest("hex"),
        })),
      }),
    )
    .digest("hex");

  if (expectedPlanHash && expectedPlanHash !== planHash) {
    throw new Error(
      `修复计划已变化：期望 ${expectedPlanHash}，当前 ${planHash}。请重新执行 --dry-run。`,
    );
  }

  // 创建快照（fix 前保存原始内容）。失败即停止，避免不可回退写入。
  let snapshotId = null;
  if (!dryRun && !noSnapshot && changedAbsPaths.length > 0) {
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
    for (const { filePath, original, content, changes, rules } of pending) {
      if (!dryRun) {
        writeFileSync(filePath, content, "utf8");
        written.push({ filePath, original });
      }
      changedFiles.push({
        file: relative(target, filePath).replace(/\\/g, "/"),
        changes,
        rules,
      });
      totalChanges += changes;
      for (const [rule, count] of Object.entries(rules)) {
        incrementRule(changesByRule, rule, count);
      }
    }
  } catch (error) {
    for (const { filePath, original } of written.reverse()) {
      writeFileSync(filePath, original, "utf8");
    }
    throw new Error(`自动修复写入失败，已回滚本轮改动：${error.message}`, { cause: error });
  }

  return {
    totalFiles,
    changedFiles,
    totalChanges,
    changesByRule,
    enabledRules: [...enabledRules].sort(),
    profile,
    planHash,
    snapshotId,
  };
}
