import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formRules } from "../rules/form.mjs";

const rule = formRules.find((item) => item.id === "R008");
const scan = (template) => rule.check(template, "Form.vue", 0);

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
