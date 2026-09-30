/**
 * scanner/rules/_shared.mjs — 规则引擎公共工具
 * 所有规则文件均从此处 import 工具函数和 TOKEN_MAP
 */

let cachedLineText = null;
let cachedLineStarts = [0];

/** 计算匹配位置的行号；同一代码块的所有 issue 复用一次换行索引。 */
export function lineOf(text, matchIndex, lineOffset = 0) {
  if (text !== cachedLineText) {
    cachedLineText = text;
    cachedLineStarts = [0];
    for (let index = text.indexOf("\n"); index >= 0; index = text.indexOf("\n", index + 1)) {
      cachedLineStarts.push(index + 1);
    }
  }
  let low = 0;
  let high = cachedLineStarts.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (cachedLineStarts[middle] <= matchIndex) low = middle + 1;
    else high = middle;
  }
  return low + lineOffset;
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
/**
 * 判定标签文本中布尔属性是否为真（`:attr="true"`、裸 attr、`attr="true"`）。
 * 规则与 fixer 共用同一实现，避免"扫描报问题但 fix 不修"的判定漂移。
 */
export function hasTrueBooleanAttr(tagText, attr) {
  return new RegExp(
    `(?:^|\\s)(?::${attr}\\s*=\\s*["']true["']|${attr}(?:\\s*=\\s*["'](?:true|)["'])?)(?=\\s|/?>)`,
  ).test(tagText);
}

export function inferMeta(category) {
  if (!category) return { layer: "L1", vendor: "element" };
  if (category === "color" || category === "token" || category === "style")
    return { layer: "L0", vendor: null };
  if (
    [
      "table",
      "form",
      "dialog",
      "button",
      "tag",
      "pagination",
      "input",
      "card",
      "tabs",
      "descriptions",
      "tree",
      "drawer",
      "upload",
      "steps",
      "overlay",
      "navigation",
      "feedback",
    ].includes(category)
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

let cachedTagTemplate = null;
let cachedTagsByName = new Map();

/**
 * 查找完整 HTML/Vue 标签（处理多行、引号嵌套）。规则按文件串行执行，
 * 因此只缓存最近一个 template：避免 40+ 规则重复扫描，又不长期持有项目源码。
 */
export function findTags(template, tagName) {
  if (template !== cachedTagTemplate) {
    cachedTagTemplate = template;
    cachedTagsByName = new Map();
  }
  const cached = cachedTagsByName.get(tagName);
  if (cached) return cached;
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
  cachedTagsByName.set(tagName, results);
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
  "#2254f4": "var(--el-color-primary)",
  "#002a8f": "var(--el-color-primary)",
  "#1a3f9a": "var(--el-color-primary-light-1)",
  "#3355a5": "var(--el-color-primary-light-2)",
  "#4d6ab1": "var(--el-color-primary-light-3)",
  "#667fbc": "var(--el-color-primary-light-4)",
  "#8094c7": "var(--el-color-primary-light-5)",
  "#99aad2": "var(--el-color-primary-light-6)",
  "#b2bfdd": "var(--el-color-primary-light-7)",
  "#ccd4e9": "var(--el-color-primary-light-8)",
  "#e5eaf4": "var(--el-color-primary-light-9)",
  "#002681": "var(--el-color-primary-dark-1)",
  "#002272": "var(--el-color-primary-dark-2)",
  "#001d64": "var(--el-color-primary-dark-3)",
  "#001956": "var(--el-color-primary-dark-4)",
  "#1890ff": "var(--el-color-primary)",
  "#fb2323": "var(--el-color-danger)",
  "#f56c6c": "var(--el-color-danger)",
  "#bb2d3f": "var(--el-color-danger)",
  "#f5222d": "var(--el-color-danger)",
  "#0cc859": "var(--el-color-success)",
  "#67c23a": "var(--el-color-success)",
  "#52c41a": "var(--el-color-success)",
  "#2bb268": "var(--el-color-success)",
  "#ffaf27": "var(--el-color-warning)",
  "#e6a23c": "var(--el-color-warning)",
  "#faad14": "var(--el-color-warning)",
  "#ea9a13": "var(--el-color-warning)",
  "#ecf5ff": "var(--el-color-primary-light-9)",
};
