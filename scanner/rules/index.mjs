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

export const BUILT_IN_RULES = [
  ...tableRules,
  ...formRules,
  ...buttonRules,
  ...colorRules,
  ...dialogRules,
  ...tagRules,
];

const _externalRules = [];

/**
 * 注册外部自定义规则（插件式扩展）
 * @param {Array} rules - 规则对象数组，每条规则需含 id / category / severity / check 方法
 */
export function addRules(rules) {
  for (const r of rules) {
    if (!r.id || typeof r.check !== "function")
      throw new Error(
        `[wk-scan] addRules: 规则 "${r.id}" 必须提供 id 和 check() 方法`,
      );
    _externalRules.push(r);
  }
}

/** 返回全部规则（内置 + 外部插件） */
export function getRules() {
  return [...BUILT_IN_RULES, ..._externalRules];
}

/** 按 ID 查找规则 */
export function getRuleById(id) {
  return getRules().find((r) => r.id === id);
}

/** 兼容：直接 default 导出全部规则数组 */
export default getRules;
