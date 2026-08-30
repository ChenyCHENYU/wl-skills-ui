/**
 * scanner/rules/index.mjs — 规则注册中心
 *
 * 内置规则按类别拆分在各子文件中。
 * 支持外部插件通过 addRules(rules) 动态注入自定义规则。
 *
 * 导出：
 *   - BUILT_IN_RULES     内置规则数组（只读）
 *   - addRules(rules)    注册外部规则（插件式扩展）
 *   - getRules()         获取当前全部规则（内置 + 外部）
 *   - getRuleById(id)    按 ID 查找规则
 */
import { tableRules } from "./table.mjs";
import { formRules } from "./form.mjs";
import { buttonRules } from "./button.mjs";
import { colorRules } from "./color.mjs";
import { dialogRules } from "./dialog.mjs";
import { tagRules } from "./tag.mjs";
import { componentFamilyRules } from "./componentFamily.mjs";
import { componentStructureRules } from "./componentStructure.mjs";
import { semanticRules } from "./semantic.mjs";
import { loadRules } from "../../standards/rules-loader.mjs";
import { inferMeta } from "./_shared.mjs";
import { ruleEnabledForProfile } from "../../standards/profiles-loader.mjs";

const IMPLEMENTATIONS = [
  ...tableRules,
  ...formRules,
  ...buttonRules,
  ...colorRules,
  ...dialogRules,
  ...tagRules,
  ...componentFamilyRules,
  ...componentStructureRules,
  ...semanticRules,
];

const RULE_METADATA = loadRules().rules;
const METADATA_BY_ID = new Map(RULE_METADATA.map((rule) => [rule.id, rule]));
const IMPLEMENTATION_BY_ID = new Map(
  IMPLEMENTATIONS.map((rule) => [rule.id, rule]),
);

if (IMPLEMENTATION_BY_ID.size !== IMPLEMENTATIONS.length) {
  throw new Error("[wl-scan] scanner 规则实现存在重复 R-id");
}
for (const metadata of RULE_METADATA) {
  if (!IMPLEMENTATION_BY_ID.has(metadata.id)) {
    throw new Error(`[wl-scan] 规则 ${metadata.id} 已注册但缺少 scanner 实现`);
  }
}
for (const implementation of IMPLEMENTATIONS) {
  if (!METADATA_BY_ID.has(implementation.id)) {
    throw new Error(`[wl-scan] scanner 规则 ${implementation.id} 未在 rules.json 注册`);
  }
}

function hydrateRule(implementation) {
  const metadata = METADATA_BY_ID.get(implementation.id);
  return Object.freeze({
    ...implementation,
    ...metadata,
    name: metadata.title,
  });
}

export const BUILT_IN_RULES = Object.freeze(
  IMPLEMENTATIONS.map(hydrateRule).sort((a, b) => a.id.localeCompare(b.id)),
);

const _externalRules = [];

/**
 * 注册外部自定义规则（插件式扩展）
 * @param {Array} rules - 规则对象数组，每条规则需含 id / category / severity / check 方法
 */
export function addRules(rules) {
  for (const r of rules) {
    if (!r.id || typeof r.check !== "function")
      throw new Error(
        `[wl-scan] addRules: 规则 "${r.id}" 必须提供 id 和 check() 方法`,
      );
    _externalRules.push(r);
  }
}

/** 返回全部规则（内置 + 外部插件） */
export function getRules({ profile } = {}) {
  const builtIn = profile
    ? BUILT_IN_RULES.filter((rule) => ruleEnabledForProfile(rule, profile))
    : BUILT_IN_RULES;
  return [...builtIn, ..._externalRules];
}

/** 用 rules.json 覆盖实现内的重复元数据，确保过滤、报表和 MCP 口径一致。 */
export function normalizeIssue(issue) {
  const metadata = METADATA_BY_ID.get(issue.rule);
  if (!metadata) return issue;
  const inferred = inferMeta(metadata.category);
  return {
    ...issue,
    category: metadata.category,
    severity: metadata.severity,
    layer: metadata.layer ?? inferred.layer,
    vendor: metadata.vendor ?? inferred.vendor,
  };
}

/** 按 ID 查找规则 */
export function getRuleById(id, options) {
  return getRules(options).find((r) => r.id === id);
}

/** 兼容：直接 default 导出全部规则数组 */
export default getRules;
