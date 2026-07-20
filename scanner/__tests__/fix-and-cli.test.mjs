import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runFix } from "../fix.mjs";
import {
  createSnapshot,
  listSnapshots,
  rollbackSnapshot,
} from "../snapshot.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const packageVersion = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8"),
).version;
const cleanup = [];

function tempProject() {
  const root = mkdtempSync(join(tmpdir(), "wl-ui-test-"));
  cleanup.push(root);
  mkdirSync(join(root, "src"), { recursive: true });
  return root;
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [join(repoRoot, "bin", "wl-ui.js"), ...args], {
    cwd,
    encoding: "utf8",
  });
}

afterEach(() => {
  while (cleanup.length > 0) rmSync(cleanup.pop(), { recursive: true, force: true });
});

describe("fixer 闭环", () => {
  it("修复与目录声明一致，并自动创建可回退快照", () => {
    const root = tempProject();
    const file = join(root, "src", "Demo.vue");
    const original = `<template>
  <BaseTable cid="demo" render-type="elTable" />
  <el-table><el-table-column type="selection" align="left" /></el-table>
  <el-input /><el-select /><el-date-picker />
  <span style="color:#409eff">示例</span>
</template>
<script setup>const chartColor = "#409eff";</script>
<style>.demo { color: #f56c6c; }</style>
`;
    writeFileSync(file, original, "utf8");

    const result = runFix({ target: join(root, "src"), projectRoot: root });
    const fixed = readFileSync(file, "utf8");
    assert.equal(result.changedFiles.length, 1);
    assert.ok(result.snapshotId);
    assert.match(fixed, /BaseTable[^>]*render-type="agGrid"[^>]*empty-text="暂无数据"|BaseTable[^>]*empty-text="暂无数据"[^>]*render-type="agGrid"/);
    assert.match(fixed, /el-table-column[^>]*align="center"[^>]*header-align="center"|el-table-column[^>]*header-align="center"[^>]*align="center"/);
    assert.match(fixed, /el-input[^>]*size="small"/);
    assert.match(fixed, /el-date-picker[^>]*style="width:100%"/);
    assert.doesNotMatch(fixed, /<template>[\s\S]*#409eff[\s\S]*<\/template>/);
    assert.match(fixed, /<script setup>const chartColor = "#409eff";<\/script>/);
    assert.equal(listSnapshots(root).length, 1);

    rollbackSnapshot(root, result.snapshotId);
    assert.equal(readFileSync(file, "utf8"), original);
  });

  it("快照目标越界时失败关闭，不写入目标文件", () => {
    const project = tempProject();
    const outside = tempProject();
    const file = join(outside, "src", "Outside.vue");
    const original = "<template><el-input /></template>\n";
    writeFileSync(file, original, "utf8");
    assert.throws(
      () => runFix({ target: join(outside, "src"), projectRoot: project }),
      /必须位于项目根目录内/,
    );
    assert.equal(readFileSync(file, "utf8"), original);
  });

  it("拒绝被篡改快照中的路径穿越", () => {
    const root = tempProject();
    const file = join(root, "src", "Demo.vue");
    writeFileSync(file, "<template />\n", "utf8");
    const snap = createSnapshot({
      projectRoot: root,
      targetDir: join(root, "src"),
      filePaths: [file],
      command: "test",
    });
    const manifest = JSON.parse(readFileSync(snap.path, "utf8"));
    manifest.files = { "../escape.vue": Buffer.from("escape").toString("base64") };
    writeFileSync(snap.path, JSON.stringify(manifest), "utf8");
    assert.throws(() => rollbackSnapshot(root, snap.id), /快照文件越界/);
  });
});

describe("统一 CLI", () => {
  it("提供版本、拒绝未知命令并转发 audit/drift/exempt", () => {
    const root = tempProject();
    writeFileSync(join(root, "src", "Clean.vue"), "<template><div /></template>\n", "utf8");
    const version = runCli(["--version"], root);
    assert.equal(version.status, 0);
    assert.equal(version.stdout.trim(), packageVersion);

    const unknown = runCli(["unknown"], root);
    assert.notEqual(unknown.status, 0);
    assert.match(unknown.stderr, /未知命令/);

    const audit = runCli(["audit", "--target", "src", "--output", "json"], root);
    assert.equal(audit.status, 0, audit.stderr);
    assert.ok(Array.isArray(JSON.parse(audit.stdout).issues));

    writeFileSync(join(root, "base.json"), '{"issues":[]}\n', "utf8");
    writeFileSync(join(root, "current.json"), '{"issues":[]}\n', "utf8");
    const drift = runCli([
      "drift",
      "--baseline",
      "base.json",
      "--current",
      "current.json",
    ], root);
    assert.equal(drift.status, 0, drift.stderr);

    const exempt = runCli(["exempt", "init", "--project", ".", "--target", "src"], root);
    assert.equal(exempt.status, 0, exempt.stderr);
    assert.match(readFileSync(join(root, ".wl-exempt.json"), "utf8"), /exemptPaths/);

    const preset = runCli(["add-preset", "my-biz", "--project", "."], root);
    assert.equal(preset.status, 0, preset.stderr);
    const presetSource = readFileSync(join(root, "src", "wl-ui", "presets", "my-biz.ts"), "utf8");
    assert.match(presetSource, /installMyBizPreset/);
    assert.match(presetSource, /from '@agile-team\/wl-skills-ui\/runtime'/);
  });
});
