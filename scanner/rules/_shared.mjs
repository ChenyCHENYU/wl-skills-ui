/**
 * scanner/rules/_shared.mjs — 规则引擎公共工具
 * 所有规则文件均从此处 import 工具函数和 TOKEN_MAP
 */

/** 计算匹配位置的行号 */
export function lineOf(text, matchIndex, lineOffset = 0) {
  return text.slice(0, matchIndex).split("\n").length + lineOffset;
}

/** 构造 issue 对象（自动推断 layer/vendor，规则可通过 meta 覆盖） */
export function issue(
  file,
  line,
  rule,
  category,
  severity,
  description,
  suggestion,
  meta = {},
) {
  const inferred = inferMeta(category);
  return {
    file,
    line,
    rule,
    category,
    severity,
    description,
    suggestion,
    layer: meta.layer ?? inferred.layer,
    vendor: meta.vendor ?? inferred.vendor,
  };
}

/**
 * 根据 category 推断 layer + vendor 默认值
 *   - color/token  → L0 / —
 *   - table/form/dialog/button/tag → L1 / element
 *   - vendor-base / vendor-jh / vendor-c / vendor-custom / vendor-ag → L2 / 对应 vendor
 *   - layout-* → L3 / —
 *   - runtime-* → L4 / —
 */
export function inferMeta(category) {
  if (!category) return { layer: "L1", vendor: "element" };
  if (category === "color" || category === "token" || category === "style")
    return { layer: "L0", vendor: null };
  if (
    ["table", "form", "dialog", "button", "tag", "pagination", "input"].includes(
      category,
    )
  )
    return { layer: "L1", vendor: "element" };
  if (category.startsWith("vendor-")) {
    return { layer: "L2", vendor: category.replace("vendor-", "") };
  }
  if (category.startsWith("layout-")) {
    return { layer: "L3", vendor: null };
  }
  if (category.startsWith("runtime-")) {
    return { layer: "L4", vendor: null };
  }
  return { layer: "L1", vendor: "element" };
}

/** 查找完整 HTML/Vue 标签（处理多行、引号嵌套） */
export function findTags(template, tagName) {
  const results = [];
  const pattern = new RegExp(`<${tagName}(?=[\\s/>])`, "g");
  let m;
  while ((m = pattern.exec(template)) !== null) {
    const start = m.index;
    let i = start + tagName.length + 1;
    let inSingle = false,
      inDouble = false;
    while (i < template.length) {
      const ch = template[i];
      if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (!inSingle && !inDouble) {
        if (template.slice(i, i + 2) === "/>") {
          i += 2;
          break;
        }
        if (ch === ">") {
          i += 1;
          break;
        }
      }
      i++;
    }
    results.push({ text: template.slice(start, i), index: start });
  }
  return results;
}

/**
 * CSS Token 映射表（hex → CSS 变量）
 * 供 R016 / R017 / R018 共同使用
 */
export const TOKEN_MAP = {
  "#409eff": "var(--el-color-primary)",
  "#3a7afe": "var(--el-color-primary)",
  "#4368ff": "var(--el-color-primary)",
  "#002a8f": "var(--el-color-primary)",
  "#1890ff": "var(--el-color-primary)",
  "#fb2323": "var(--el-color-danger)",
  "#f56c6c": "var(--el-color-danger)",
  "#bb2d3f": "var(--el-color-danger)",
  "#f5222d": "var(--el-color-danger)",
  "#0cc859": "var(--el-color-success)",
  "#67c23a": "var(--el-color-success)",
  "#52c41a": "var(--el-color-success)",
  "#ffaf27": "var(--el-color-warning)",
  "#e6a23c": "var(--el-color-warning)",
  "#faad14": "var(--el-color-warning)",
  "#ecf5ff": "var(--el-color-primary-light-9)",
};
