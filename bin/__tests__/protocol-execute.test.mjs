import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = path.resolve(import.meta.dirname, "../..");
const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
const cli = path.join(repo, "bin/wl-ui.js");
const selected = "src/views/Selected/index.vue";

function fixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wl-ui-public-execute-"));
  try {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true, devDependencies: { [pkg.name]: pkg.version, vue: "^3.4.0" } }));
    fs.mkdirSync(path.join(root, "node_modules/@agile-team"), { recursive: true });
    fs.symlinkSync(repo, path.join(root, "node_modules", pkg.name), "dir");
    fs.mkdirSync(path.dirname(path.join(root, selected)), { recursive: true });
    fs.writeFileSync(path.join(root, selected), '<template><el-table><el-table-column prop="name" align="center"/></el-table></template>\n');
    const installed = spawnSync(process.execPath, [cli, "init", "--editor", "all", "--profile", "native-element"], { cwd: root, encoding: "utf8", timeout: 30000 });
    assert.equal(installed.status, 0, installed.stderr || installed.stdout);
    callback(root);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function request(root, input) {
  const file = path.join(root, "request.json");
  fs.writeFileSync(file, JSON.stringify({ projectRoot: root, ...input }));
  const called = spawnSync(process.execPath, [cli, "protocol", "request", "--input-file", file, "--json"], { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.equal(called.signal, null, called.stderr);
  return { ...JSON.parse(called.stdout), cliExitCode: called.status };
}

function plan(root, runId, task = "检查当前 Vue 代码") {
  const planned = request(root, { operation: "task", task, runId, targets: [selected] });
  assert.equal(planned.ok, true);
  return planned.result;
}

function execute(root, runId, extra = {}) {
  return request(root, { operation: "execute", runId, executorId: "scan", parameters: { targets: [selected], rules: ["R001"] }, ...extra });
}

test("公开 execute 复用原 scan：规则子集与真实失败保留，同 runId 状态回查", () => fixture(root => {
  const source = fs.readFileSync(path.join(root, selected));
  assert.ok(plan(root, "passed").integration.allowedExecutors.includes("scan"));
  const passed = execute(root, "passed");
  assert.equal(passed.ok, true, JSON.stringify(passed));
  assert.equal(passed.cliExitCode, 0);
  assert.equal(passed.result.execution.exitCode, 0);
  assert.equal(passed.result.execution.signal, null);
  assert.equal(passed.result.integration.runId, "passed");
  assert.equal(passed.result.integration.executionStatus, "completed");
  assert.deepEqual(fs.readFileSync(path.join(root, selected)), source);
  const report = JSON.parse(passed.result.execution.stdout);
  assert.equal(report.summary.fileCount, 1);
  assert.equal(report.issues.length, 0);
  const status = request(root, { operation: "status", runId: "passed" });
  assert.equal(status.result.integration.executionStatus, passed.result.integration.executionStatus);
  assert.equal(status.result.tools[0].tool, "scan");
  assert.deepEqual(status.result.tools[0].checkedFiles.map(file => file.path), [selected]);
  assert.deepEqual(status.result.tools[0].summary.rules.map(rule => rule.id), ["R001"]);
  fs.writeFileSync(path.join(root, selected), '<template><el-table><el-table-column prop="name"/></el-table></template>\n');
  plan(root, "failed");
  const failed = execute(root, "failed");
  assert.equal(failed.ok, true, JSON.stringify(failed));
  assert.equal(failed.result.execution.exitCode, 1);
  assert.equal(failed.result.integration.executionStatus, "failed");
  assert.equal(failed.result.integration.validationStatus, "failed");
  assert.ok(JSON.parse(failed.result.execution.stdout).issues.some(issue => issue.rule === "R001"));
}));

test("execute 省略 rules 沿用计划 R 子集，不调用或显示计划外 R038", () => fixture(root => {
  fs.writeFileSync(path.join(root, selected), '<template><el-table><el-table-column prop="name" align="center"/></el-table><el-button>新增</el-button></template>\n');
  const planned = plan(root, "default-plan-rules");
  const expected = planned.integration.ruleRefs.map(rule => rule.legacyId).filter(id => /^R\d{3}$/.test(id)).sort();
  assert.ok(expected.includes("R001"));
  assert.equal(expected.includes("R038"), false);
  const called = execute(root, "default-plan-rules", { parameters: { targets: [selected] } });
  assert.equal(called.ok, true, JSON.stringify(called));
  assert.equal(called.result.execution.exitCode, 0);
  const report = JSON.parse(called.result.execution.stdout);
  assert.equal(report.issues.some(issue => issue.rule === "R038"), false);
  assert.deepEqual(called.result.tools[0].summary.rules.map(rule => rule.id).sort(), expected);
  assert.equal(called.result.tools[0].checks.some(check => check.id === "R038"), false);
}));

test("execute 未知执行器、计划外规则/目标与额外字段在原 scanner 前拒绝，计划不变", () => fixture(root => {
  const planned = plan(root, "rejected");
  const planFile = path.join(root, planned.recordPath);
  const files = fs.readdirSync(path.dirname(planFile));
  const before = fs.readFileSync(planFile);
  const cases = [
    [{ executorId: "unknown" }, "unsupported-executor"],
    [{ parameters: { targets: [] } }, "invalid-executor-input"],
    [{ parameters: { targets: [selected], rules: ["R999"] } }, "rule-mismatch"],
    [{ parameters: { targets: [selected], rules: ["R038"] } }, "rule-mismatch"],
    [{ parameters: { targets: ["src/views/Other/index.vue"] } }, "target-mismatch"],
    [{ parameters: { targets: [selected], command: "fix" } }, "invalid-executor-input"],
    [{ targets: [selected] }, "invalid-executor-input"],
  ];
  for (const [input, code] of cases) {
    const rejected = execute(root, "rejected", input);
    assert.equal(rejected.ok, false, JSON.stringify(input));
    assert.equal(rejected.cliExitCode, 2);
    assert.equal(rejected.error.code, code);
    assert.deepEqual(fs.readFileSync(planFile), before);
    assert.deepEqual(fs.readdirSync(path.dirname(planFile)), files);
    assert.equal(request(root, { operation: "status", runId: "rejected" }).result.executionStatus, "not-executed");
  }
}));

test("execute 需要本项目有效检查计划：解释、过期、禁用与未知 runId 均拒绝", () => fixture(root => {
  plan(root, "explain", "解释当前 Vue 样式，不要检查");
  assert.equal(execute(root, "explain").ok, false);
  plan(root, "stale");
  fs.appendFileSync(path.join(root, selected), "<!-- changed after inspect -->\n");
  assert.equal(execute(root, "stale").ok, false);
  assert.equal(request(root, { operation: "status", runId: "stale" }).result.executionStatus, "not-executed");
  plan(root, "disabled");
  fs.writeFileSync(path.join(root, ".wl-skills-scope.json"), JSON.stringify({ schemaVersion: 1, projectType: "pc", packages: { ui: false } }));
  assert.equal(execute(root, "disabled").ok, false);
  assert.equal(execute(root, "unknown-run").ok, false);
  assert.equal(fs.existsSync(path.join(root, ".wl-skills-ui/runs/unknown-run")), false);
}));

test("公开 execute 在原 scanner 前拒绝目录中越界的 Vue 叶子，任务回执零新增", () => fixture(root => {
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wl-ui-external-source-"));
  try {
    const external = path.join(outsideRoot, "Outside.vue");
    const source = '<template><el-table-column prop="external"/></template>';
    fs.writeFileSync(external, source);
    fs.symlinkSync(external, path.join(root, "src/views/Selected/Outside.vue"));
    const target = "src/views/Selected";
    const planned = request(root, { operation: "task", task: "检查当前 Vue 代码", targets: [target], runId: "external-leaf" });
    assert.equal(planned.ok, true);
    const record = path.join(root, planned.result.recordPath);
    const bytes = fs.readFileSync(record);
    const files = fs.readdirSync(path.dirname(record));
    const rejected = execute(root, "external-leaf", { parameters: { targets: [target] } });
    assert.equal(rejected.ok, false, JSON.stringify(rejected));
    assert.equal(rejected.error.code, "invalid-executor-input");
    assert.deepEqual(fs.readFileSync(record), bytes);
    assert.deepEqual(fs.readdirSync(path.dirname(record)), files);
    assert.equal(fs.readFileSync(external, "utf8"), source);
  } finally { fs.rmSync(outsideRoot, { recursive: true, force: true }); }
}));

test("复制项目不能重用原根任务计划：status 过期、execute 身份拒绝且零新回执", () => fixture(root => {
  const planned = plan(root, "copied-plan");
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "wl-ui-copied-project-"));
  try {
    fs.cpSync(root, copy, { recursive: true, verbatimSymlinks: true });
    const record = path.join(copy, planned.recordPath);
    const bytes = fs.readFileSync(record);
    const files = fs.readdirSync(path.dirname(record));
    const status = request(copy, { operation: "status", runId: "copied-plan" });
    assert.equal(status.result.planStale, true);
    assert.equal(status.result.ready, false);
    assert.equal(status.result.integration.ready, false);
    const rejected = execute(copy, "copied-plan");
    assert.equal(rejected.ok, false);
    assert.equal(rejected.error.code, "identity-mismatch");
    assert.deepEqual(fs.readFileSync(record), bytes);
    assert.deepEqual(fs.readdirSync(path.dirname(record)), files);
  } finally { fs.rmSync(copy, { recursive: true, force: true }); }
}));
