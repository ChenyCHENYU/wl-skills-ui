/**
 * protocol-routing.test.mjs — ui 路由准确性逐技能语料（预期经人工复核冻结）
 * ui 是依赖型包：安装态通过真实打包产物 npm 安装到隔离项目验证。
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs, { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { protocol, runOperation } = await import("../protocol-cli.mjs");
const cases = JSON.parse((await import("node:fs")).readFileSync(path.join(here, "protocol-routing-cases.json"), "utf8"));
const PKG_ROOT = path.join(here, "..", "..");

const state = { installedRoot: null, tarball: null };

function tempRoot() {
  return mkdtempSync(path.join(tmpdir(), "wl-ui-routing-"));
}

function routeAt(projectRoot, task) {
  if (!fs.existsSync(path.join(projectRoot, "package.json"))) fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ devDependencies: { "@agile-team/wl-skills-ui": "*" } }));
  return protocol.request({ operation: "route", projectRoot, task }, runOperation);
}

before(() => {
  const packDir = tempRoot();
  const pack = spawnSync("npm", ["pack", "--pack-destination", packDir, "--ignore-scripts"], { cwd: PKG_ROOT, encoding: "utf8", timeout: 180000 });
  assert.equal(pack.status, 0, pack.stderr);
  state.tarball = path.join(packDir, pack.stdout.trim().split("\n").pop());
  state.installedRoot = tempRoot();
  assert.equal(spawnSync("npm", ["init", "-y"], { cwd: state.installedRoot, encoding: "utf8" }).status, 0);
  const install = spawnSync("npm", ["i", state.tarball], { cwd: state.installedRoot, encoding: "utf8", timeout: 180000 });
  assert.equal(install.status, 0, install.stderr);
}, 600000);

for (const item of cases) {
  const expectedBare = item.skill ? "gap" : item.status;
  const expectedInstalled = item.installedStatus || (item.skill ? "matched" : item.status);

  test(`已声明接入但未初始化：「${item.task}」→ ${expectedBare}${item.skill ? ` + ${item.skill}` : ""}`, () => {
    const envelope = routeAt(tempRoot(), item.task);
    assert.equal(envelope.ok, true);
    const decision = envelope.result.decision || envelope.result;
    assert.equal(decision.status, expectedBare);
    if (item.skill) assert.ok(decision.selectedSkills.includes(item.skill), `应选中 ${item.skill}，实际 ${decision.selectedSkills}`);
    else assert.equal((decision.selectedSkills || []).length, 0);
  });

  test(`已安装（真实打包产物）：「${item.task}」→ ${expectedInstalled}${item.skill ? ` + ${item.skill}` : ""}`, () => {
    const envelope = routeAt(state.installedRoot, item.task);
    assert.equal(envelope.ok, true);
    const decision = envelope.result.decision || envelope.result;
    assert.equal(decision.status, expectedInstalled);
    if (item.skill) assert.ok(decision.selectedSkills.includes(item.skill));
  });
}

test.after(() => {
  if (state.tarball) rmSync(path.dirname(state.tarball), { recursive: true, force: true });
});
