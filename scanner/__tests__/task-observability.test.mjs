import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, readdirSync, rmSync, cpSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const packageRoot = resolve(import.meta.dirname, "../..");
const cleanup = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "ui-task-"));
  cleanup.push(root);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "package.json"), '{"name":"fixture","private":true,"devDependencies":{"@agile-team/wl-skills-ui":"*"}}');
  return root;
}
function run(root, args) {
  return spawnSync(process.execPath, [join(packageRoot, "bin/wl-ui.js"), ...args, "--project", root], { cwd: root, encoding: "utf8", timeout: 30000 });
}
afterEach(() => cleanup.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe("UI real execution evidence", () => {
  it("plans against real project-internal pnpm canonical symlinks without requiring siblings", () => {
    const root = fixture();
    const physical = join(root, "node_modules/.pnpm/ui-fixture/node_modules/@agile-team/wl-skills-ui");
    mkdirSync(physical, { recursive: true });
    cpSync(join(packageRoot, "skills"), join(physical, "skills"), { recursive: true });
    cpSync(join(packageRoot, "standards"), join(physical, "standards"), { recursive: true });
    cpSync(join(packageRoot, "SKILL.md"), join(physical, "SKILL.md"));
    mkdirSync(join(root, "node_modules/@agile-team"));
    symlinkSync("../.pnpm/ui-fixture/node_modules/@agile-team/wl-skills-ui", join(root, "node_modules/@agile-team/wl-skills-ui"), "dir");
    const planned = run(root, ["task", "修复样式", "--target", "src", "--json"]);
    assert.equal(planned.status, 0, planned.stderr);
    const decision = JSON.parse(planned.stdout);
    assert.equal(decision.status, "matched");
    assert.equal(decision.ready, true);
    assert.deepEqual(decision.missingInputs, []);
    assert.equal(decision.executionStatus, "not-executed");
    assert.equal(JSON.parse(run(root, ["status", "--run-id", decision.runId, "--json"]).stdout).planStale, false);
  });
  it("reports requested unsupported capabilities and unknown skills as gaps", () => {
    const root = fixture();
    for (const args of [["生成图片"], ["修复样式", "--skill", "unreleased-capability"]]) {
      const result = run(root, ["route", ...args, "--json"]);
      assert.equal(result.status, 0, result.stderr);
      const decision = JSON.parse(result.stdout);
      assert.equal(decision.status, "gap");
      assert.equal(decision.ready, false);
      assert.ok(decision.gaps.length > 0);
    }
  });
  it("routes baseline and negative cases without declaring execution", () => {
    const root = fixture();
    const initial = readdirSync(root);
    for (const [text, target, expected] of [["修改文字", "src/Test.vue", "baseline"], ["修复样式", "src/Test.vue", "matched"], ["帮我写诗", "", "not-applicable"], ["表单和表格", "src/Test.vue", "ambiguous"]]) {
      const result = run(root, ["route", text, "--target", target, "--json"]);
      assert.equal(result.status, 0, result.stderr);
      const decision = JSON.parse(result.stdout);
      assert.equal(decision.routingStatus || decision.status, expected);
      if (decision.applicable === true) { assert.equal(decision.status, "gap"); assert.equal(decision.ready, false); }
      else assert.deepEqual(decision.applicableConstraints, []);
      assert.equal(decision.contentLoaded, "unverified");
    }
    assert.deepEqual(readdirSync(root), initial);
  });

  it("reports completed execution independently from failed checks, and records actual rule calls", () => {
    const root = fixture();
    const vue = join(root, "src/Demo.vue");
    writeFileSync(vue, '<template><el-button>新增</el-button></template>\n');
    const plan = JSON.parse(run(root, ["task", "修改按钮", "--target", "src", "--json"]).stdout);
    const scanned = run(root, ["scan", "--target", "src", "--output", "summary", "--run-id", plan.runId]);
    assert.equal(scanned.status, 0, scanned.stderr);
    const report = JSON.parse(scanned.stdout);
    assert.equal(report.runId, plan.runId);
    assert.equal(report.executionStatus, "completed");
    assert.equal(report.validationStatus, "failed");
    assert.ok(report.receiptPath);
    const status = JSON.parse(run(root, ["status", "--json", "--run-id", plan.runId]).stdout);
    assert.equal(status.tools.length, 1);
    assert.deepEqual(status.tools[0].checkedFiles.map((file) => file.path), ["src/Demo.vue"]);
    assert.ok(status.tools[0].summary.rules.some((rule) => rule.calls > 0));
    assert.equal(status.stale, false);
    appendFileSync(vue, "<!-- changed -->\n");
    assert.equal(JSON.parse(run(root, ["status", "--json", "--run-id", plan.runId]).stdout).stale, true);
  });

  it("never reports an empty scan as passed", () => {
    const root = fixture();
    const scanned = run(root, ["scan", "--target", "src", "--output", "summary"]);
    assert.equal(scanned.status, 0, scanned.stderr);
    assert.equal(JSON.parse(scanned.stdout).validationStatus, "unverified");
  });

  it("rejects actual malformed SFC syntax even when source rule filters would hide it", () => {
    const root = fixture();
    writeFileSync(join(root, "src/Bad.vue"), '<template><div><p></div></template><script setup>const broken = ;</script><style scoped>.demo { display: block; }</style>');
    const scanned = run(root, ["scan", "--target", "src", "--output", "json", "--only", "R043", "--skip", "SFC_PARSE", "--fail-on-error"]);
    assert.equal(scanned.status, 1, scanned.stderr);
    const report = JSON.parse(scanned.stdout);
    assert.equal(report.validationStatus, "failed");
    assert.ok(report.parsing.errors.length > 0);
    assert.ok(report.issues.some((issue) => issue.rule === "SFC_PARSE"));
    const status = JSON.parse(run(root, ["status", "--json", "--run-id", report.runId]).stdout);
    assert.equal(status.tools[0].checks.find((check) => check.id === "sfc-parse").status, "failed");
  });

  it("installs and cleans only its gateway and retains modified content", () => {
    const root = fixture();
    assert.equal(run(root, ["init", "--editor", "agents-generic", "--skills-only"]).status, 0);
    const gateway = join(root, ".agents/skills/wl-skills-ui/SKILL.md");
    assert.deepEqual(readdirSync(join(root, ".agents/skills")), ["wl-skills-ui"]);
    appendFileSync(gateway, "\nUser instruction\n");
    assert.equal(run(root, ["update", "--force", "--skills-only"]).status, 0);
    assert.equal(run(root, ["clean"]).status, 0);
    assert.match(readFileSync(gateway, "utf8"), /User instruction/);
  });

  it("MCP scan retains two statuses and task correlation in actual returned evidence", () => {
    const root = fixture();
    writeFileSync(join(root, "src/Demo.vue"), '<template><el-button>新增</el-button></template>');
    const response = spawnSync(process.execPath, [join(packageRoot, "mcp/server.js")], { cwd: root, encoding: "utf8", timeout: 30000, env: { ...process.env, WL_PROJECT_ROOT: root }, input: `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "wl_ui_scan", arguments: { target: "src", runId: "mcp-real-check", output: "summary" } } })}\n` });
    assert.equal(response.status, 0, response.stderr);
    const result = JSON.parse(response.stdout).result;
    const report = JSON.parse(result.content[0].text);
    assert.equal(result.isError, false);
    assert.equal(report.executionStatus, "completed");
    assert.equal(report.validationStatus, "failed");
    assert.equal(report.runId, "mcp-real-check");
    assert.equal(result._meta.wlExecution.runId, report.runId);
  });
});
