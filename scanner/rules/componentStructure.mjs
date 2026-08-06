import { readFileSync } from "node:fs";
import { issue, lineOf } from "./_shared.mjs";

const registry = JSON.parse(
  readFileSync(
    new URL("../../standards/component-structures.json", import.meta.url),
    "utf8",
  ),
);
const knownRootClasses = new Set(
  registry.contracts.flatMap((contract) => contract.knownRootClasses || []),
);

const CLASS_ATTRIBUTE = /class\s*=\s*["']([^"']+)["']/g;
const COMPOSITE_NAME = /(?:multi|multiple|picker|tags?|input-number|split)/i;

export function findUnknownCompositeRoots(template) {
  const findings = [];
  let match;
  while ((match = CLASS_ATTRIBUTE.exec(template)) !== null) {
    const classValue = match[1];
    const classes = classValue.split(/\s+/).filter(Boolean);
    if (classes.some((name) => knownRootClasses.has(name))) continue;

    const isHybridElementWrapper =
      classes.includes("el-input") && classes.includes("el-input__wrapper");
    const looksComposite = COMPOSITE_NAME.test(classValue);
    const nearby = template.slice(match.index, match.index + 1600);
    const containsInputStructure =
      /<el-(?:input|select|autocomplete|cascader)\b|el-(?:input|select)__wrapper/.test(
        nearby,
      );

    if (isHybridElementWrapper || (looksComposite && containsInputStructure)) {
      findings.push({ index: match.index, classValue });
    }
  }
  CLASS_ATTRIBUTE.lastIndex = 0;
  return findings;
}

export const componentStructureRules = [
  {
    id: "R040",
    category: "composite",
    severity: "review",
    name: "未知复合控件结构必须先登记边框与高度契约",
    check(template, file, lineOffset) {
      return findUnknownCompositeRoots(template).map((finding) =>
        issue(
          file,
          lineOf(template, finding.index, lineOffset),
          "R040",
          "composite",
          "review",
          `发现未登记的疑似复合控件结构：class="${finding.classValue}"`,
          "先核对真实 DOM，明确 root/边框所有者/内部无描边层/高度策略/Teleport 出口，再登记到 standards/component-structures.json；禁止直接扩大普通 Element 选择器。",
          { layer: "L2", vendor: "common-core" },
        ),
      );
    },
  },
];
