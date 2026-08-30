import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getRules, normalizeIssue } from "../rules/index.mjs";
import { listRules } from "../../standards/rules-loader.mjs";
import { FIXED_RULE_IDS } from "../fix.mjs";

describe("rule contracts", () => {
  it("metadata 与实现一一对应，运行期字段由元数据覆盖", () => {
    const metadata = listRules();
    const implementations = getRules();
    assert.deepEqual(
      implementations.map((rule) => rule.id).sort(),
      metadata.map((rule) => rule.id).sort(),
    );
    const byId = new Map(metadata.map((rule) => [rule.id, rule]));
    for (const rule of implementations) {
      const meta = byId.get(rule.id);
      assert.equal(rule.category, meta.category, `${rule.id}.category`);
      assert.equal(rule.severity, meta.severity, `${rule.id}.severity`);
      assert.equal(rule.name, meta.title, `${rule.id}.name`);
    }
    const normalized = normalizeIssue({
      rule: "R013",
      category: "button",
      severity: "error",
      file: "A.vue",
      line: 1,
    });
    assert.equal(normalized.category, "layout");
    assert.equal(normalized.severity, "review");
  });

  it("autoFixable 目录与 fixer 实现完全一致", () => {
    const expected = listRules()
      .filter((rule) => rule.autoFixable)
      .map((rule) => rule.id)
      .sort();
    assert.deepEqual([...FIXED_RULE_IDS].sort(), expected);
  });
});
