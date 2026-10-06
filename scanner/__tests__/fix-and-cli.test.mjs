import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
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
  <el-table>
    <el-table-column type="selection" align="left" />
    <el-table-column prop="customerName" label="客户名称" />
  </el-table>
  <el-button plain icon="Plus">新增</el-button>
  <el-button @click="close">取消</el-button>
  <BaseToolbar :items="toolbars" />
  <el-input /><el-select /><el-date-picker style="color:red" /><el-time-picker />
  <span style="color:#409eff">示例</span>
</template>
<script setup>const chartColor = "#409eff";</script>
<style>.demo { color: #f56c6c; }</style>
`;
    writeFileSync(file, original, "utf8");

    const result = runFix({
      target: join(root, "src"),
      projectRoot: root,
      profile: "legacy-jh-ag",
    });
    const fixed = readFileSync(file, "utf8");
    assert.equal(result.changedFiles.length, 1);
    assert.ok(result.snapshotId);
    assert.equal(result.profile, "legacy-jh-ag");
    assert.ok(result.planHash);
    assert.match(fixed, /BaseTable[^>]*render-type="agGrid"[^>]*empty-text="暂无数据"|BaseTable[^>]*empty-text="暂无数据"[^>]*render-type="agGrid"/);
    assert.match(fixed, /el-table-column[^>]*align="center"[^>]*header-align="center"|el-table-column[^>]*header-align="center"[^>]*align="center"/);
    assert.match(
      fixed,
      /el-table-column[^>]*prop="customerName"[^>]*show-overflow-tooltip|el-table-column[^>]*show-overflow-tooltip[^>]*prop="customerName"/,
    );
    assert.match(fixed, /el-button[^>]*type="primary"[^>]*>新增<\/el-button>/);
    assert.match(fixed, /el-button[^>]*size="small"[^>]*icon="Plus"[^>]*>新增<\/el-button>|el-button[^>]*icon="Plus"[^>]*size="small"[^>]*>新增<\/el-button>/);
    assert.match(fixed, /el-button[^>]*icon="Close"[^>]*>取消<\/el-button>/);
    assert.match(fixed, /BaseToolbar[^>]*size="small"/);
    assert.doesNotMatch(fixed, /el-button[^>]*\splain(?:\s|=|>)/);
    assert.match(fixed, /el-input[^>]*size="small"/);
    assert.match(fixed, /el-date-picker[^>]*size="small"/);
    assert.match(fixed, /el-date-picker[^>]*style="color:red;width:100%"/);
    assert.match(fixed, /el-time-picker[^>]*size="small"/);
    assert.match(fixed, /el-time-picker[^>]*style="width:100%"/);
    assert.doesNotMatch(fixed, /<template>[\s\S]*#409eff[\s\S]*<\/template>/);
    assert.match(fixed, /<script setup>const chartColor = "#409eff";<\/script>/);
    assert.equal(listSnapshots(root).length, 1);

    rollbackSnapshot(root, result.snapshotId);
    assert.equal(readFileSync(file, "utf8"), original);
  });

  it("native profile 不会把 BaseTable 强制迁移到 AG Grid", () => {
    const root = tempProject();
    const file = join(root, "src", "Native.vue");
    writeFileSync(
      file,
      '<template><BaseTable cid="native" render-type="elTable" /></template>\n',
      "utf8",
    );
    const result = runFix({
      target: join(root, "src"),
      projectRoot: root,
      profile: "native-element",
      dryRun: true,
    });
    assert.equal(result.changedFiles.length, 0);
    assert.ok(!result.enabledRules.includes("R021"));
    assert.match(readFileSync(file, "utf8"), /render-type="elTable"/);
  });

  it("only/skip 与计划哈希约束真实写入范围", () => {
    const root = tempProject();
    const file = join(root, "src", "Scoped.vue");
    writeFileSync(
      file,
      "<template><el-input /><el-button>取消</el-button></template>\n",
      "utf8",
    );
    const preview = runFix({
      target: join(root, "src"),
      projectRoot: root,
      dryRun: true,
      only: new Set(["R006"]),
    });
    assert.deepEqual(preview.enabledRules, ["R006"]);
    assert.deepEqual(preview.changesByRule, { R006: 1 });
    const applied = runFix({
      target: join(root, "src"),
      projectRoot: root,
      only: new Set(["R006"]),
      expectedPlanHash: preview.planHash,
      noSnapshot: true,
    });
    assert.equal(applied.planHash, preview.planHash);
    assert.match(readFileSync(file, "utf8"), /el-input size="small"/);
    assert.doesNotMatch(readFileSync(file, "utf8"), /icon="Close"/);

    writeFileSync(file, '<template><el-select /></template>\n', "utf8");
    assert.throws(
      () =>
        runFix({
          target: join(root, "src"),
          projectRoot: root,
          only: new Set(["R006"]),
          expectedPlanHash: preview.planHash,
          noSnapshot: true,
        }),
      /修复计划已变化/,
    );
    assert.equal(readFileSync(file, "utf8"), '<template><el-select /></template>\n');
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

  it("单文件编辑器只维护路由区块并在 clean 时保留用户内容", () => {
    const root = tempProject();
    writeFileSync(join(root, "package.json"), '{"name":"router-test"}\n', "utf8");
    writeFileSync(join(root, "AGENTS.md"), "# Project rules\n\nKeep me.\n", "utf8");
    writeFileSync(
      join(root, ".mcp.json"),
      '{"mcpServers":{"existing":{"command":"existing"}}}\n',
      "utf8",
    );

    const init = runCli(
      [
        "init",
        "--project",
        root,
        "--editor",
        "agents-generic",
        "--profile",
        "native-element",
        "--skills-only",
      ],
      root,
    );
    assert.equal(init.status, 0, init.stderr);
    const installed = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.match(installed, /# Project rules/);
    assert.match(installed, /wl-skills-ui:begin/);
    assert.match(installed, /node_modules\/@agile-team\/wl-skills-ui\/SKILL\.md/);
    assert.ok(installed.length < 12_000, `router too large: ${installed.length}`);

    const update = runCli(
      ["update", "--project", root, "--editor", "agents-generic", "--force"],
      root,
    );
    assert.equal(update.status, 0, update.stderr);
    const updated = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.equal((updated.match(/wl-skills-ui:begin/g) || []).length, 1);

    const clean = runCli(["clean", "--project", root], root);
    assert.equal(clean.status, 0, clean.stderr);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), "# Project rules\n\nKeep me.\n");
    assert.equal(existsSync(join(root, ".wl-ui-profile.json")), false);
    const mcp = JSON.parse(readFileSync(join(root, ".mcp.json"), "utf8"));
    assert.deepEqual(mcp, { mcpServers: { existing: { command: "existing" } } });
  });

  it("init 不会覆盖无法解析的用户 MCP 配置", () => {
    const root = tempProject();
    const invalidMcp = "{ keep: user-owned }\n";
    writeFileSync(join(root, "package.json"), '{"name":"invalid-mcp-test"}\n', "utf8");
    writeFileSync(join(root, ".mcp.json"), invalidMcp, "utf8");
    writeFileSync(
      join(root, ".wl-ui-profile.json"),
      '{"schema":1,"profile":"native-element","owner":"user"}\n',
      "utf8",
    );

    const init = runCli(
      [
        "init",
        "--project",
        root,
        "--editor",
        "agents-generic",
        "--profile",
        "native-element",
        "--skills-only",
      ],
      root,
    );
    assert.equal(init.status, 0, init.stderr);
    assert.match(init.stderr, /(?:跳过|保留) \.mcp\.json/);
    assert.equal(readFileSync(join(root, ".mcp.json"), "utf8"), invalidMcp);

    const manifest = JSON.parse(
      readFileSync(join(root, ".wl-skills-ui-manifest.json"), "utf8"),
    );
    assert.equal(manifest.files[".mcp.json"], undefined);
    assert.equal(manifest.managedJson[".mcp.json"], undefined);

    const clean = runCli(["clean", "--project", root], root);
    assert.equal(clean.status, 0, clean.stderr);
    assert.equal(readFileSync(join(root, ".mcp.json"), "utf8"), invalidMcp);
    assert.match(readFileSync(join(root, ".wl-ui-profile.json"), "utf8"), /"owner":"user"/);
  });
});

describe("profile 兼容承诺（1.13）", () => {
  function hybridProject() {
    // 平台子应用形态：native 运行时 + jh 封装依赖 + 联邦 AG Grid +
    // 全量 styles 引入（包根入口写法）。
    const root = tempProject();
    mkdirSync(join(root, "src", "assets", "style"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "hybrid-fixture",
        dependencies: {
          vue: "~3.2.25",
          "element-plus": "2.2.6-prod.3",
          "@jhlc/common-core": "3.1.0-prod.14",
          "@originjs/vite-plugin-federation": "1.4.1-jh.3",
        },
      }),
      "utf8",
    );
    writeFileSync(
      join(root, "index.html"),
      '<link rel="stylesheet" href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css" />\n',
      "utf8",
    );
    writeFileSync(
      join(root, "src", "assets", "style", "main.scss"),
      '@use "@agile-team/wl-skills-ui/styles" as *;\n',
      "utf8",
    );
    writeFileSync(
      join(root, "src", "main.ts"),
      'import "@agile-team/wl-skills-ui/runtime/auto";\n',
      "utf8",
    );
    return root;
  }

  it("未显式声明 profile 时按兼容口径校验，全量写法不判红", () => {
    const root = hybridProject();
    const check = runCli(["check", "--project", root], root);
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /I002 — 全局样式入口 .* 已引入/);
    assert.match(check.stdout, /I003 — runtime 已可用/);
    assert.doesNotMatch(check.stdout, /未引入 @agile-team\/wl-skills-ui\/styles\/presets/);
    assert.equal(existsSync(join(root, ".wl-ui-profile.json")), false);
  });

  it("显式声明 native-jh-ag 后严格校验仍全绿（styles 全量写法与 runtime/auto 别名）", () => {
    const root = hybridProject();
    writeFileSync(
      join(root, ".wl-ui-profile.json"),
      JSON.stringify({ schema: 1, profile: "native-jh-ag" }),
      "utf8",
    );
    const check = runCli(["check", "--project", root], root);
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /I002 — 全局样式入口 .* 已引入/);
    assert.match(check.stdout, /I003 — runtime 已引入/);
    for (const line of check.stdout.split("\n")) {
      if (line.includes("I00")) assert.match(line, /✅/);
    }
  });

  it("init 自动识别只建议、不落盘 profile 配置；显式 --profile 才写入", () => {
    const root = hybridProject();
    const suggest = runCli(
      ["init", "--project", root, "--editor", "agents-generic", "--skills-only", "--dry-run"],
      root,
    );
    assert.equal(suggest.status, 0, suggest.stderr);
    assert.match(suggest.stdout, /未写入 \.wl-ui-profile\.json/);
    assert.doesNotMatch(suggest.stdout, /\[dry-run\] 写入 \.wl-ui-profile\.json/);

    const explicit = runCli(
      [
        "init",
        "--project",
        root,
        "--editor",
        "agents-generic",
        "--profile",
        "native-jh-ag",
        "--skills-only",
        "--dry-run",
      ],
      root,
    );
    assert.equal(explicit.status, 0, explicit.stderr);
    assert.match(explicit.stdout, /\[dry-run\] 写入 \.wl-ui-profile\.json/);
  });
});
