/**
 * protocol-routing.test.mjs — ui 路由准确性逐技能语料（预期经人工复核冻结）
 * ui 是依赖型包：安装态通过真实打包产物解包到隔离项目，复用已冻结依赖，验证过程不访问 registry。
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
const temporaryRoots = new Set();

function tempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "wl-ui-routing-"));
  temporaryRoots.add(root);
  return root;
}

function routeInstalled(projectRoot, task) {
  const input = path.join(projectRoot, "route-request.json");
  fs.writeFileSync(input, JSON.stringify({ operation: "route", projectRoot, task }));
  const installedCli = path.join(projectRoot, "node_modules/@agile-team/wl-skills-ui/bin/wl-ui.js");
  const called = spawnSync(process.execPath, [installedCli, "protocol", "request", "--input-file", input, "--json"], { cwd: projectRoot, encoding: "utf8", timeout: 30000 });
  assert.equal(called.status, 0, called.error?.message || called.stderr || called.stdout);
  return JSON.parse(called.stdout);
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
  const installedPackage = path.join(state.installedRoot, "node_modules/@agile-team/wl-skills-ui");
  fs.mkdirSync(installedPackage, { recursive: true });
  const unpacked = spawnSync("tar", ["-xzf", state.tarball, "--strip-components=1", "-C", installedPackage], { encoding: "utf8", timeout: 30000 });
  assert.equal(unpacked.status, 0, unpacked.stderr);
  // Test the packed runtime/resources rather than a source-checkout package link.
  // Only its already-frozen third-party dependencies come from this checkout.
  fs.symlinkSync(path.join(PKG_ROOT, "node_modules"), path.join(installedPackage, "node_modules"), "dir");
  const packedMetadata = JSON.parse(fs.readFileSync(path.join(installedPackage, "package.json"), "utf8"));
  fs.writeFileSync(path.join(state.installedRoot, "package.json"), JSON.stringify({ private: true, dependencies: { [packedMetadata.name]: packedMetadata.version, vue: "^3.4.0" } }));

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
    const envelope = routeInstalled(state.installedRoot, item.task);
    assert.equal(envelope.ok, true);
    const decision = envelope.result.decision || envelope.result;
    assert.equal(decision.status, expectedInstalled);
    if (item.skill) assert.ok(decision.selectedSkills.includes(item.skill));
  });
}

test.after(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
});
