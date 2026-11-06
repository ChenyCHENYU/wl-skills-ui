import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { decideTask, taskCatalog } from "../task-integration.mjs";
import { protocol } from "../protocol-cli.mjs";

const packageRoot = path.resolve(import.meta.dirname, "../..");
const cases = [
  ["对齐 Element Plus 组件组的禁用态与圆角", "element/component-family"],
  ["整理详情页的分组信息和操作栏版式", "layouts/detail-page"],
  ["编辑共用的弹窗表单需要规范布局", "layouts/form-dialog"],
  ["重排搜索区、工具栏和表格分页的布局", "layouts/list-page"],
  ["左侧组织树右侧列表需要联动伸缩", "layouts/tree-list"],
  ["审计当前目录的视觉规范并输出报告", "ops/audit"],
  ["预览并处理已经确认可安全自动修复的样式问题", "ops/fix"],
  ["将 Skin 模式按模块迁移到 Native 原生模式", "ops/migrate"],
  ["检查当前页面的样式规范违规", "ops/scan"],
  ["把间距值改用 CSS 变量统一管理", "runtime/design-tokens"],
  ["迁移旧版 UI 运行时，确认升级兼容", "runtime/migration"],
  ["c-date-picker 的边框与其他控件不一致", "vendors/c-components"],
  ["jh-tree 和 jh-button 的视觉边界需要对齐", "vendors/jh-components"],
  ["业务自有 CustPicker 组件需要探测覆盖位置", "vendors/custom-wrappers"],
  ["识别这个陌生控件的实际 DOM 后给诊断", "vendors/unknown-wrapper"],
  ["BaseTable 列头和分页间距不一致，检查封装表格的样式边界", "vendors/base-table"],
];
for (const [task, id] of cases) test(`${task} selects ${id}`, () => {
  const result = decideTask({ task, targets: ["src/views/index.vue"] });
  assert.equal(result.status, "matched");
  assert.deepEqual(result.selectedSkills, [id]);
  assert.match(result.skillDetails[0].name, /[\u4e00-\u9fff]/);
});
for (const task of ["调整表格和弹窗", "修复表单弹窗布局，同时检查另一个弹窗边框", "审计视觉规范，并统一引用设计变量", "先检查BaseTable，再调整树形左右分栏"]) test(`${task} retains independent stages`, () => {
  const result = decideTask({ task, targets: ["src/views/index.vue"] });
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.selectedSkills, []);
});
test("ordinary visual changes remain baseline; denied work is not authorized", () => {
  assert.equal(decideTask({ task: "把按钮文字改短一点", targets: ["src/views/index.vue"] }).status, "baseline");
  const denied = decideTask({ task: "不要调整表单弹窗布局，只解释规范", targets: ["src/views/index.vue"] });
  assert.equal(denied.action.checksAllowed, false);
  assert.deepEqual(denied.selectedSkills, []);
});
test("inventory reuses canonical Chinese metadata", () => {
  for (const skill of taskCatalog()) {
    const exposed = protocol.describe().inventory.skills.find((item) => item.id === skill.id);
    assert.equal(exposed.name, skill.name);
    assert.equal(exposed.description, skill.description);
    assert.match(skill.name, /[\u4e00-\u9fff]/);
    assert.match(skill.description, /[\u4e00-\u9fff]/);
  }
});
test("public CLI and protocol honor explicit IDs, action and project scope", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wl-ui-explicit-"));
  const metadata = (adopted = true, projectType = "pc") => {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true, dependencies: adopted ? { "@agile-team/wl-skills-ui": "*", vue: "^3.4.0" } : {} }));
    fs.writeFileSync(path.join(root, ".wl-skills-scope.json"), JSON.stringify({ schemaVersion: 1, projectType }));
  };
  const cli = (args) => {
    const result = spawnSync(process.execPath, [path.join(packageRoot, "bin/wl-ui.js"), ...args, "--json"], { cwd: root, encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  };
  try {
    metadata();
    fs.mkdirSync(path.join(root, "node_modules/@agile-team"), { recursive: true });
    fs.symlinkSync(packageRoot, path.join(root, "node_modules/@agile-team/wl-skills-ui"), "dir");
    const task = "只列计划，不要扫描";
    const direct = cli(["route", task, "--project", root, "--skill", "ops/audit"]);
    const request = path.join(root, "request.json");
    fs.writeFileSync(request, JSON.stringify({ protocolVersion: 1, operation: "route", projectRoot: root, task, skill: "ops/audit" }));
    const envelope = cli(["protocol", "request", "--input-file", request]);
    for (const result of [direct, envelope.result]) {
      assert.deepEqual(result.selectedSkills, ["ops/audit"]);
      assert.equal(result.selectionEvidence, "explicit-skill-id");
      assert.equal(result.action.checksAllowed, false);
      assert.equal(result.action.businessWritesAuthorized, false);
    }
    assert.equal(cli(["route", task, "--project", root, "--skill", "unpublished"]).status, "gap");
    for (const [adopted, type] of [[false, "pc"], [true, "mobile"]]) {
      metadata(adopted, type);
      const result = cli(["route", "检查样式", "--project", root, "--skill", "ops/audit"]);
      assert.equal(result.status, "not-applicable");
      assert.deepEqual(result.selectedSkills, []);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
