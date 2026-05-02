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
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TOKEN_MAP } from "./rules/_shared.mjs";

const FIXES = {
  'el-input':        [{ attr: 'size', value: 'small' }],
  'el-select':       [{ attr: 'size', value: 'small' }],
  'el-date-picker':  [{ attr: 'style', value: 'width:100%' }],
  'el-table':        [{ attr: 'empty-text', value: '暂无数据' }],
  'el-table-column': [{ attr: 'align', value: 'center' }],
};

function parseTag(content, pos, tagName) {
  let i = pos + tagName.length + 1;
  let inSingle = false, inDouble = false;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (!inSingle && !inDouble) {
      if (content.slice(i, i + 2) === '/>') return { text: content.slice(pos, i + 2), end: i + 2 };
      if (ch === '>') return { text: content.slice(pos, i + 1), end: i + 1 };
    }
    i++;
  }
  return { text: content.slice(pos), end: content.length };
}

function addAttrIfMissing(tagText, tagName, attr, value) {
  // 已存在（含动态绑定 :attr=）则跳过
  const re = new RegExp(`:?${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`);
  if (re.test(tagText)) return { text: tagText, changed: false };
  const newTag = tagText.replace(`<${tagName}`, `<${tagName} ${attr}="${value}"`);
  return { text: newTag, changed: true };
}

function fixTemplateAttrs(content) {
  const tagPattern = new RegExp(
    `<(${Object.keys(FIXES).sort((a, b) => b.length - a.length).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'g'
  );
  let result = '';
  let pos = 0;
  let changes = 0;
  let m;
  // 按位置遍历，配合 parseTag 处理嵌套引号
  while (true) {
    tagPattern.lastIndex = pos;
    m = tagPattern.exec(content);
    if (!m) { result += content.slice(pos); break; }
    result += content.slice(pos, m.index);
    const tagName = m[1];
    let { text, end } = parseTag(content, m.index, tagName);
    for (const { attr, value } of FIXES[tagName]) {
      const r = addAttrIfMissing(text, tagName, attr, value);
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
  // 匹配 <style> 块和 template 中的 color="" / style="" 属性
  let result = content.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
    const hex = match.toLowerCase();
    const repl = TOKEN_MAP[hex];
    if (!repl) return match;
    changes++;
    return repl;
  });
  // 但仅在 <style> 块和 attribute 值中替换太激进，需要限制：
  // 改为：只替换出现在 <style>...</style> 内、color="..."、style="..."、:style="..." 中
  // 重新实现：
  changes = 0;
  result = content;

  // Style 块内
  result = result.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (full, body) => {
    const newBody = body.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
      const hex = match.toLowerCase();
      if (TOKEN_MAP[hex]) { changes++; return TOKEN_MAP[hex]; }
      return match;
    });
    return full.replace(body, newBody);
  });

  // template 中的 color="#xxx" / color='#xxx'
  result = result.replace(/(\bcolor\s*=\s*)(["'])(#[0-9a-fA-F]{3,8})\2/g, (full, pre, q, hex) => {
    const lo = hex.toLowerCase();
    if (TOKEN_MAP[lo]) { changes++; return `${pre}${q}${TOKEN_MAP[lo]}${q}`; }
    return full;
  });

  return { content: result, changes };
}

function* walkVue(dir, excludes) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (excludes.some(x => e.name === x)) continue;
      yield* walkVue(join(dir, e.name), excludes);
    } else if (e.name.endsWith('.vue')) {
      yield join(dir, e.name);
    }
  }
}

/**
 * 执行修复
 * @param {object} opts { target, exclude, dryRun }
 * @returns {{ totalFiles: number, changedFiles: Array<{file, changes}>, totalChanges: number }}
 */
export function runFix({ target, exclude = ['node_modules', 'dist', '.git', 'SelectPopupCom'], dryRun = false }) {
  const changedFiles = [];
  let totalChanges = 0;
  let totalFiles = 0;
  for (const filePath of walkVue(target, exclude)) {
    totalFiles++;
    const original = readFileSync(filePath, 'utf8');
    let content = original;
    let changes = 0;
    const r1 = fixTemplateAttrs(content); content = r1.content; changes += r1.changes;
    const r2 = fixHexColors(content);     content = r2.content; changes += r2.changes;
    if (changes > 0 && content !== original) {
      if (!dryRun) writeFileSync(filePath, content, 'utf8');
      changedFiles.push({ file: relative(target, filePath).replace(/\\/g, '/'), changes });
      totalChanges += changes;
    }
  }
  return { totalFiles, changedFiles, totalChanges };
}
