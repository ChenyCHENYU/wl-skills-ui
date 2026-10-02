import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formRules } from "../rules/form.mjs";

const rule = formRules.find((item) => item.id === "R008");
const scan = (template) => rule.check(template, "Form.vue", 0);
const wideRule = formRules.find((item) => item.id === "R044");
const scanWide = (template) => wideRule.check(template, "Form.vue", 0);

describe("R008 form label-width", () => {
  it("recognizes native and Base form static attributes", () => {
    const issues = scan(`
      <el-form label-width="132px" />
      <BaseForm label-width="104px" :items="items" />
      <BaseQuery labelWidth='120px' :items="queryItems" />
    `);
    assert.equal(issues.length, 3);
    assert.deepEqual(issues.map((item) => item.line), [2, 3, 4]);
    assert.ok(issues.every((item) => item.severity === "info"));
  });

  it("does not flag wide, dynamic, or unrelated attributes", () => {
    const issues = scan(`
      <BaseForm label-width="220px" />
      <BaseForm :label-width="labelWidth" />
      <div label-width="100px" />
      <BaseForm note='label-width="100px"' />
    `);
    assert.equal(issues.length, 0);
  });
});

describe("R044 dense multi-column form label budget", () => {
  it("reviews wide fixed labels with multi-column BaseForm and native form", () => {
    const issues = scanWide(`
      <BaseForm label-width="260px" :columns="actualColumns" />
      <el-form label-width="240px" columns="2" />
      <BaseForm labelWidth="280px" :columns="2" />
    `);
    assert.equal(issues.length, 3);
    assert.deepEqual(issues.map((item) => item.line).sort(), [2, 3, 4]);
    assert.ok(issues.every((item) => item.severity === "review"));
  });

  it("reviews a bound label width with a wide literal fallback", () => {
    const issues = scanWide(`
      <BaseForm :label-width="definition.actualLabelWidth || '260px'" :columns="actualColumns" />
      <el-form :label-width="compact ? '160px' : '260px'" columns="3" />
    `);
    assert.equal(issues.length, 2);
    assert.ok(issues.every((item) => item.severity === "review"));
  });

  it("ignores single-column, narrower, and unknown dynamic label widths", () => {
    assert.equal(scanWide(`
      <BaseForm label-width="260px" columns="1" />
      <BaseForm label-width="184px" :columns="3" />
      <BaseForm :label-width="labelWidth" :columns="3" />
      <BaseQuery label-width="260px" :columns="3" />
    `).length, 0);
  });
});
