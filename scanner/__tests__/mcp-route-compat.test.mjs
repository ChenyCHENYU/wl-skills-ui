import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const packageRoot = path.resolve(import.meta.dirname, "../..");
function withProject(adopted, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wl-ui-route-compat-"));
  try {
    if (adopted) {
      const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
      fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ dependencies: { [pkg.name]: pkg.version, vue: "3.5.0" } }));
      fs.mkdirSync(path.join(root, "node_modules/@agile-team"), { recursive: true });
      fs.symlinkSync(packageRoot, path.join(root, "node_modules/@agile-team/wl-skills-ui"), "dir");
    }
    callback(root);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function call(root, messages) {
  const result = spawnSync(process.execPath, [path.join(packageRoot, "mcp/server.js")], {
    cwd: root, env: { ...process.env, WL_PROJECT_ROOT: root },
    input: messages.map((message) => JSON.stringify(message)).join("\n") + "\n", encoding: "utf8", timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split("\n").map((line) => JSON.parse(line));
}
function tool(id, name, args) { return { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }; }

for (const task of ["不要扫描表格，只解释规范", "只解释表格规范，不要扫描", "不要迁移 tokens，只分析当前布局", "写诗", "统一表格视觉", "美化登录页面", "优化交互体验", "不要美化页面，只解释主题配置", "我不想美化页面，只解释布局", "不是让你修复样式，只解释布局", "我并不是让你修复样式，只解释布局", "我暂时不想切换主题，只解释实现思路", "不是只解释，而是修复样式"]) {
  test(`legacy route shares real scope/action/selection and stays read-only: ${task}`, () => withProject(true, (root) => {
    const replies = call(root, [tool(1, "wl_ui_route_intent", { text: task }), tool(2, "wl_ui_route", { task })]);
    const legacy = replies[0].result.structuredContent;
    const unified = replies[1].result.structuredContent;
    assert.deepEqual(legacy.action, unified.action);
    assert.equal(legacy.status, unified.status);
    assert.equal(legacy.ready, unified.ready);
    assert.deepEqual(legacy.recommendedSkills, unified.selectedSkills);
    assert.deepEqual(legacy.requiredChecks, unified.requiredChecks);
    assert.equal(legacy.scope.projectRoot, unified.scope.projectRoot);
    if (["美化登录页面", "优化交互体验"].includes(task)) {
      assert.equal(unified.status, "baseline");
      assert.equal(unified.action.mode, "apply");
      assert.equal(unified.action.checksAllowed, true);
      assert.equal(unified.ready, true);
    }
    if (["我不想美化页面，只解释布局", "不是让你修复样式，只解释布局", "我并不是让你修复样式，只解释布局", "我暂时不想切换主题，只解释实现思路"].includes(task)) {
      assert.equal(unified.action.mode, "explain");
      assert.equal(unified.action.checksAllowed, false);
      assert.deepEqual(unified.selectedSkills, []);
    }
    if (unified.action.checksAllowed === false || unified.ready === false) assert.deepEqual(legacy.recommendedTools, []);
    else assert.deepEqual(legacy.recommendedTools, ["wl_ui_scan"]);
    assert.equal(replies[0].result._meta, undefined);
    assert.equal(fs.existsSync(path.join(root, ".wl-skills/state/ui/runs")), false);
  }));
}

for (const adopted of [false, true]) {
  test(`beautification routing keeps project scope before domain matching: ${adopted ? "mobile" : "unadopted"}`, () => withProject(adopted, (root) => {
    if (adopted) {
      const file = path.join(root, "package.json");
      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      pkg.dependencies["@dcloudio/uni-app"] = "3.0.0";
      fs.writeFileSync(file, JSON.stringify(pkg));
    }
    const replies = call(root, [tool(1, "wl_ui_route_intent", { text: "美化登录页面并优化交互体验" }), tool(2, "wl_ui_route", { task: "美化登录页面并优化交互体验" })]);
    const legacy = replies[0].result.structuredContent;
    const unified = replies[1].result.structuredContent;
    assert.equal(unified.scope.status, "not-applicable");
    assert.equal(unified.scope.reason, adopted ? "mobile-project-excluded" : "package-not-adopted-in-target-project");
    assert.equal(unified.ready, false);
    assert.deepEqual(legacy.recommendedTools, []);
    assert.deepEqual(legacy.recommendedSkills, []);
    assert.equal(fs.existsSync(path.join(root, ".wl-skills/state/ui/runs")), false);
  }));
}

test("legacy routing respects an unadopted project and prompt starts with routing", () => withProject(false, (root) => {
  const replies = call(root, [tool(1, "wl_ui_route_intent", { text: "统一表格视觉" }), tool(2, "wl_ui_skill_prompt", {})]);
  const legacy = replies[0].result.structuredContent;
  assert.equal(legacy.scope.status, "not-applicable");
  assert.deepEqual(legacy.recommendedSkills, []);
  assert.deepEqual(legacy.recommendedTools, []);
  const prompt = replies[1].result.content[0].text;
  assert.match(prompt, /先调用 wl_ui_route/);
  assert.match(prompt, /action.checksAllowed=false/);
  assert.match(prompt, /不自动扫描或修复/);
  assert.equal(replies[1].result._meta, undefined);
  assert.equal(fs.existsSync(path.join(root, ".wl-skills/state/ui/runs")), false);
}));
