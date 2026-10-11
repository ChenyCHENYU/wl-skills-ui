import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repo = resolve(import.meta.dirname, "../..");
test("external workspace store keeps own rule and execution evidence fresh or explicitly stale", () => {
  const temporary = realpathSync(mkdtempSync(join(tmpdir(), "ui-external-store-")));
  const project = join(temporary, "workspace/apps/admin");
  const physical = join(temporary, "workspace/node_modules/.pnpm/ui-fixture/node_modules/@agile-team/wl-skills-ui");
  try {
    mkdirSync(project, { recursive: true });mkdirSync(physical, { recursive: true });
    for (const file of ["bin", "scanner", "standards", "skills", "mcp", "SKILL.md", "package.json"]) cpSync(join(repo, file), join(physical, file), { recursive: true });
    const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
    writeFileSync(join(project, "package.json"), JSON.stringify({ private: true, devDependencies: { [pkg.name]: pkg.version, vue: "^3.4.0" } }));
    const logical = join(project, "node_modules", pkg.name);
    mkdirSync(dirname(logical), { recursive: true });symlinkSync(relative(dirname(logical), physical), logical, "dir");
    mkdirSync(join(project, "src"));writeFileSync(join(project, "src/Form.vue"), '<template><el-input size="small" /></template>');
    const run = args => {
      const result = spawnSync(process.execPath, [join(physical, "bin/wl-ui.js"), ...args], { cwd: project, encoding: "utf8", timeout: 30000 });
      assert.equal(result.status, 0, result.stderr);return result.stdout;
    };
    run(["init", "--editor", "agents-generic", "--profile", "native-element", "--skills-only"]);
    assert.equal(JSON.parse(run(["doctor-host", "--host", "codex", "--json"])).entryReadiness, "ready");
    const plan = JSON.parse(run(["task", "检查表单样式", "--target", "src/Form.vue", "--json", "--run-id", "external-store"]));
    assert.equal(plan.ready, true);assert.deepEqual(plan.selectedSkills, ["element/el-form"]);
    const status = () => JSON.parse(run(["status", "--run-id", plan.runId, "--json"]));
    const before = status();assert.equal(before.planStale, false);
    const snapshot = before.records.find(record => record.kind === "task-decision").ruleSnapshot;
    assert.ok(snapshot.targets.includes(`node_modules/${pkg.name}/standards/rules.json`));
    assert.ok(snapshot.targets.includes(`node_modules/${pkg.name}/scanner/rules`));
    run(["scan", "--target", "src/Form.vue", "--run-id", plan.runId, "--output", "summary"]);
    assert.equal(status().stale, false);
    const rules = join(physical, "standards/rules.json");const original = readFileSync(rules);
    appendFileSync(rules, "\n");assert.equal(status().planStale, true);assert.equal(status().stale, true);
    writeFileSync(rules, original);assert.equal(status().stale, false);
    appendFileSync(join(physical, "scanner/rules/form.mjs"), "\n// isolated fixture change\n");
    assert.equal(status().planStale, true);assert.equal(status().stale, true);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
