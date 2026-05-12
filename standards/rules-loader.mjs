// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// standards/rules-loader.mjs — R-rule 共享加载器
//
// 所有读取方（scanner / MCP / check-docs / Vite 插件 / 未来 ESLint 插件）统一
// 从这里取 R-rule 元数据。rules.json 是唯一事实源，禁止其它文件再写规则定义。
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_JSON_PATH = join(__dirname, "rules.json");

let _cache = null;

export function loadRules() {
  if (_cache) return _cache;
  _cache = JSON.parse(readFileSync(RULES_JSON_PATH, "utf8"));
  return _cache;
}

export function listRules({ category, severity, autoFixable } = {}) {
  let { rules } = loadRules();
  if (category) rules = rules.filter((r) => r.category === category);
  if (severity) rules = rules.filter((r) => r.severity === severity);
  if (autoFixable !== undefined)
    rules = rules.filter((r) => Boolean(r.autoFixable) === autoFixable);
  return rules;
}

export function getRule(id) {
  const { rules } = loadRules();
  return (
    rules.find((r) => r.id === id) ||
    rules.find((r) => Array.isArray(r.aliases) && r.aliases.includes(id)) ||
    null
  );
}

export function listCategories() {
  return loadRules().categories;
}

export function getSeverityLevels() {
  return loadRules().severityLevels;
}

/** 按 category 分组返回 { table: [...], form: [...], ... } */
export function groupByCategory() {
  const out = {};
  for (const r of loadRules().rules) {
    (out[r.category] ||= []).push(r);
  }
  return out;
}

/** 生成简短摘要表（id | severity | title），供 SKILL.md 指针式引用 */
export function buildRuleSummary(ids) {
  const rules = ids.map((id) => getRule(id)).filter(Boolean);
  return rules.map((r) => ({
    id: r.id,
    severity: r.severity,
    category: r.category,
    title: r.title,
  }));
}
