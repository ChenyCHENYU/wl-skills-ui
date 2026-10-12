import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cli = resolve(import.meta.dirname, "../../bin/wl-ui.js");
const mcp = resolve(import.meta.dirname, "../../mcp/server.js");
function fixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "ui-cli-input-"));
  const source = '<template><el-input /><el-button>新增</el-button></template>\n';
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/Demo.vue"), source);
  const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", timeout: 30000 });
  try { callback(root, source, run); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test("scan rejects unknown rules, flags and conflicting scope before checks or records", () => fixture((root, source, run) => {
  const cases = [
    ["--only", "R999"], ["--only=R0066"], ["--only", "R006,"], ["--skip", "R999"],
    ["--only", "R000-R9999999999"], ["--typo-rule", "R006"],
    ["--target=src", "--target=other"], ["--target="], ["--target", " "],
    ["src/Demo.vue"], ["--only="], ["--run-id="],
  ];
  for (const args of cases) {
    const rejected = run(["scan", ...args, "--output", "json", "--fail-on-error"]);
    assert.equal(rejected.status, 1, JSON.stringify(args));
    const report = JSON.parse(rejected.stdout);
    assert.equal(report.ok, false);assert.equal(report.error.code, "invalid-input");
    assert.equal(report.executionStatus, "not-executed");assert.equal(report.validationStatus, "unverified");
    assert.deepEqual(report.checkedFiles, []);
    assert.equal(existsSync(join(root, ".wl-skills-ui/runs")), false, JSON.stringify(args));
    assert.equal(readFileSync(join(root, "src/Demo.vue"), "utf8"), source);
  }
}));

test("registered single/range rules still expose real failures with caller runId", () => fixture((root, source, run) => {
  for (const args of [["--only", "R038"], ["--only=R038-R038"], ["--only", "r038"]]) {
    const checked = run(["scan", "--target", "src/Demo.vue", ...args, "--output", "json", "--fail-on-error", "--run-id", "registered-rule"]);
    assert.equal(checked.status, 1, checked.stderr);
    const report = JSON.parse(checked.stdout);
    assert.equal(report.runId, "registered-rule");assert.equal(report.validationStatus, "failed");
    assert.ok(report.issues.some(issue => issue.rule === "R038"));
    assert.equal(existsSync(join(root, ".wl-skills-ui/runs/registered-rule")), true);
    assert.equal(readFileSync(join(root, "src/Demo.vue"), "utf8"), source);
  }
}));

test("help and unknown suboperations do not start checks or create files", () => fixture((root, source, run) => {
  const help = run(["scan", "--help"]);
  assert.equal(help.status, 0, help.stderr);assert.match(help.stdout, /wl-ui scan/);
  for (const args of [["snapshot", "unknown"], ["exempt", "unknown"], ["snapshot", "list", "extra"]]) {
    const rejected = run([...args, "--output=summary"]);
    assert.equal(rejected.status, 1);
    assert.equal(JSON.parse(rejected.stdout).error.code, "invalid-input");
  }
  assert.equal(existsSync(join(root, ".wl-skills-ui")), false);
  assert.equal(readFileSync(join(root, "src/Demo.vue"), "utf8"), source);
}));

test("MCP uses the same registered selector boundary before execution or records", () => fixture((root, source) => {
  for (const tool of ["wl_ui_scan", "wl_ui_fix_dry_run"]) {
    const runId = tool + "-invalid-rule";
    const request = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: { target: "src", only: "R999", ...(tool === "wl_ui_scan" ? { output: "summary" } : {}), runId } } };
    const called = spawnSync(process.execPath, [mcp], { cwd: root, encoding: "utf8", timeout: 30000, env: { ...process.env, WL_PROJECT_ROOT: root }, input: JSON.stringify(request) + "\n" });
    assert.equal(called.status, 0, called.stderr);
    const response = JSON.parse(called.stdout);
    assert.equal(response.error.code, -32602);assert.match(response.error.message, /规则.*R999/);
    assert.equal(response.result, undefined);
    assert.equal(existsSync(join(root, ".wl-skills-ui/runs")), false);
    assert.equal(readFileSync(join(root, "src/Demo.vue"), "utf8"), source);
  }
}));
