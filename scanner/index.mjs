#!/usr/bin/env node
/**
 * wl-skills-ui — UI 风格对齐扫描器（CLI）
 *
 * 用法：
 *   wl-scan scan --target <path>          # 风格扫描
 *   wl-scan scan --target <path> --only R001,R016
 *   wl-scan scan --target <path> --skip R031-R037
 *   wl-scan scan --target <path> --outFile report.md
 *   wl-scan scan --target <path> --output json
 *   wl-scan check --project <path>        # 接入完整性检查
 *   wl-scan fix --target <path>           # 自动修复 A 类问题
 *   wl-scan fix --target <path> --dry-run
 *   wl-scan all --project <path>          # 接入检查 + 风格扫描 + 报告
 *   wl-scan init                          # 打印接入指引
 *   wl-scan drift --baseline <f> --current <f>  # 漂移检测
 *   wl-scan exempt init --target <path>          # 生成 .wl-exempt.json 豁免模板
 *   wl-scan snapshot list                  # 列出快照
 *   wl-scan snapshot rollback [--id <id>]  # 回退到快照（默认最新）
 *   wl-scan snapshot diff [--id <id>]      # 查看快照与当前差异
 *   wl-scan snapshot clean [--keep <N>]    # 清理旧快照
 *
 * 兼容旧用法：
 *   wl-scan --target <path>               # 等价于 scan
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { parseArgs } from "node:util";
import { getRules } from "./rules/index.mjs";
const rules = getRules();
import { generateReport } from "./report.mjs";
import { checkIntegration } from "./integration.mjs";
import { runFix } from "./fix.mjs";
import { createCoverageCollector, recommendFlows } from "./coverage.mjs";
import {
  listSnapshots,
  rollbackSnapshot,
  diffSnapshot,
  cleanSnapshots,
} from "./snapshot.mjs";
import { loadExemptConfig } from "./exempt.mjs";

const args = process.argv.slice(2);
const SUBCOMMANDS = new Set([
  "scan",
  "check",
  "fix",
  "all",
  "init",
  "drift",
  "exempt",
  "snapshot",
]);
let subcommand = "scan";
if (args.length > 0 && SUBCOMMANDS.has(args[0])) {
  subcommand = args.shift();
}

const { values } = parseArgs({
  args,
  options: {
    target: { type: "string", default: "./src" },
    project: { type: "string", default: "." },
    output: { type: "string", default: "markdown" },
    exclude: { type: "string", default: "node_modules,dist,.git" },
    outFile: { type: "string", default: "" },
    "dry-run": { type: "boolean", default: false },
    "fail-on-error": { type: "boolean", default: false },
    layer: { type: "string", default: "" },
    vendor: { type: "string", default: "" },
    mode: { type: "string", default: "" },
    id: { type: "string", default: "" },
    keep: { type: "string", default: "5" },
    "no-snapshot": { type: "boolean", default: false },
    exempt: { type: "string", default: "" },
    baseline: { type: "string", default: "" },
    current: { type: "string", default: "" },
    only: { type: "string", default: "" },
    skip: { type: "string", default: "" },
  },
  strict: false,
});

// ── 公共：扫描逻辑 ──────────────────────────────────────────────────────
function extractBlock(content, tag) {
  const re = new RegExp(`(<${tag}[^>]*>)([\\s\\S]*?)(</${tag}>)`);
  const match = content.match(re);
  if (!match) return null;
  const lineOffset = content
    .slice(0, content.indexOf(match[0]))
    .split("\n").length;
  return { text: match[2], lineOffset };
}
function extractTemplate(content) {
  const m = content.match(/(<template[^>]*>)([\s\S]*?)(<\/template>)/);
  if (!m) return { text: content, lineOffset: 0 };
  const lineOffset =
    content.slice(0, content.indexOf(m[0])).split("\n").length - 1;
  return { text: m[0], lineOffset };
}

function* walkVue(dir, excludeDirs) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (excludeDirs.some((ex) => entry.name === ex)) continue;
      yield* walkVue(join(dir, entry.name), excludeDirs);
    } else if (entry.name.endsWith(".vue")) {
      yield join(dir, entry.name);
    }
  }
}

function checkScriptOps(content, relPath) {
  const issues = [];
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (/^\s*operations:\s*\[/.test(line) && !line.trim().startsWith("//")) {
      issues.push({
        file: relPath,
        line: idx + 1,
        rule: "R013",
        category: "button",
        severity: "error",
        description: "columnsDef 使用旧格式 operations: [...] 文字按钮",
        suggestion:
          "改为 defaultSlot: ({ row }) => renderOps([...]) 图标按钮系统",
      });
    }
  });
  return issues;
}

function runScan(targetDir, excludeDirs, exemptConfig) {
  const allIssues = [];
  const exemptedIssues = [];
  let fileCount = 0;
  let exemptFileCount = 0;
  const exempt = exemptConfig || { isExempt: () => false };
  const coverage = createCoverageCollector();

  for (const filePath of walkVue(targetDir, excludeDirs)) {
    fileCount++;
    const content = readFileSync(filePath, "utf8");
    const { text: template, lineOffset } = extractTemplate(content);
    const relPath = relative(targetDir, filePath).replace(/\\/g, "/");
    coverage.addFile(relPath, template, content);

    // 整文件豁免
    if (exempt.isExempt(relPath)) {
      exemptFileCount++;
      continue;
    }

    const fileIssues = [];

    for (const rule of rules) {
      if (typeof rule.check === "function") {
        fileIssues.push(...rule.check(template, relPath, lineOffset));
      }
    }

    const styleBlock = extractBlock(content, "style");
    if (styleBlock) {
      for (const rule of rules) {
        if (typeof rule.checkStyle === "function") {
          fileIssues.push(
            ...rule.checkStyle(styleBlock.text, relPath, styleBlock.lineOffset),
          );
        }
      }
    }

    const scriptBlock = extractBlock(content, "script");
    if (scriptBlock) {
      for (const rule of rules) {
        if (typeof rule.checkScript === "function") {
          fileIssues.push(
            ...rule.checkScript(
              scriptBlock.text,
              relPath,
              scriptBlock.lineOffset,
            ),
          );
        }
      }
    }

    fileIssues.push(...checkScriptOps(content, relPath));

    // 规则级豁免过滤
    for (const issue of fileIssues) {
      if (exempt.isExempt(relPath, issue.rule)) {
        exemptedIssues.push({ ...issue, exempted: true });
      } else {
        allIssues.push(issue);
      }
    }
  }
  return {
    allIssues,
    exemptedIssues,
    fileCount,
    exemptFileCount,
    coverage: coverage.result(),
  };
}

// ── 公共：规则范围展开（R031-R037 → R031,R032,...,R037）────────────────────
function expandRuleRange(input) {
  const set = new Set();
  for (const part of input.split(",").map((s) => s.trim())) {
    const rangeMatch = part.match(/^(R)(\d+)-(R)?(\d+)$/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[2]);
      const end = parseInt(rangeMatch[4]);
      for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
        set.add("R" + String(i).padStart(3, "0"));
      }
    } else {
      set.add(part.toUpperCase());
    }
  }
  return set;
}

// ── 公共：按 layer / vendor / mode 过滤 ─────────────────────────────────────
function applyFilters(issues) {
  let out = issues;
  if (values.layer) {
    const allow = new Set(values.layer.split(",").map((s) => s.trim()));
    out = out.filter((i) => allow.has(i.layer));
  }
  if (values.vendor) {
    const allow = new Set(values.vendor.split(",").map((s) => s.trim()));
    out = out.filter((i) => i.vendor && allow.has(i.vendor));
  }
  if (values.mode === "skin") {
    // 化妆模式：只关注 L0/L1/L2，排除 L3/L4
    out = out.filter((i) => ["L0", "L1", "L2"].includes(i.layer));
  } else if (values.mode === "native") {
    // 原生模式：全部 layer
  }
  // --only R001,R016 → 仅保留指定规则
  if (values.only) {
    const allow = expandRuleRange(values.only);
    out = out.filter((i) => allow.has(i.rule));
  }
  // --skip R031-R037 → 排除指定规则
  if (values.skip) {
    const deny = expandRuleRange(values.skip);
    out = out.filter((i) => !deny.has(i.rule));
  }
  return out;
}

// ── 子命令分发 ──────────────────────────────────────────────────────────
const excludeDirs = values.exclude.split(",").map((s) => s.trim());

if (subcommand === "init") {
  console.log(`# wl-skills-ui 接入指引

1. 安装依赖：
   pnpm add @agile-team/wl-skills-ui

2. 在 index.html <head> 最先加载 tokens.css：
   <link rel="stylesheet" href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css" />

3. 在全局 SCSS 入口（如 src/assets/style/main.scss）追加：
   @use '@agile-team/wl-skills-ui/styles' as *;
   // 化妆模式：@use '@agile-team/wl-skills-ui/styles/presets/skin' as *;

4. 在 src/main.ts 中注册 runtime（可选，仅当业务侧用到 defineColumns）：
   import { installCommonPreset } from '@agile-team/wl-skills-ui/runtime/common-preset';
   installCommonPreset();

5. 业务列定义改用 defineColumns：
   import { defineColumns, renderOps } from '@agile-team/wl-skills-ui/runtime';

6. 验证：
   npx wl-ui check --project .
   npx wl-ui scan --target src
`);
  process.exit(0);
}

if (subcommand === "check") {
  const projectRoot = resolve(values.project);
  const checks = checkIntegration(projectRoot);
  if (values.output === "json") {
    console.log(JSON.stringify({ projectRoot, checks }, null, 2));
  } else {
    console.log(`# wl-skills-ui 接入完整性检查\n`);
    console.log(`项目根目录：${projectRoot}\n`);
    for (const c of checks) {
      const icon = c.ok ? "✅" : c.severity === "error" ? "❌" : "⚠️";
      console.log(`${icon} ${c.id} — ${c.description}`);
      if (!c.ok && c.suggestion) console.log(`   → ${c.suggestion}`);
    }
  }
  const hasError = checks.some((c) => !c.ok && c.severity === "error");
  process.exit(values["fail-on-error"] && hasError ? 1 : 0);
}

if (subcommand === "exempt") {
  const sub = args[0] || "init";
  if (sub === "init") {
    const { existsSync } = await import("node:fs");
    const projectRoot = resolve(values.project);
    const targetDir = resolve(values.target);
    const outPath = join(projectRoot, ".wl-exempt.json");
    if (existsSync(outPath)) {
      console.log(`⚠️  ${outPath} 已存在，跳过生成。如需重新生成请先删除。`);
      process.exit(0);
    }
    // 智能扫描目标目录下常见的个性化子目录
    const EXEMPT_KEYWORDS = [
      "big-screen",
      "dashboard",
      "map-view",
      "topology",
      "flow-designer",
      "report-designer",
      "chart",
      "3d",
      "canvas",
      "screen",
      "monitor",
      "cockpit",
      "visual",
    ];
    const smartPaths = [];
    function walkForExempt(dir, depth = 0) {
      if (depth > 4) return;
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
          const rel = relative(targetDir, join(dir, entry.name)).replace(
            /\\/g,
            "/",
          );
          if (
            EXEMPT_KEYWORDS.some((kw) => entry.name.toLowerCase().includes(kw))
          ) {
            smartPaths.push(rel + "/**");
          } else {
            walkForExempt(join(dir, entry.name), depth + 1);
          }
        }
      } catch {
        /* ignore permission errors */
      }
    }
    if (existsSync(targetDir)) walkForExempt(targetDir);
    const { generateExemptTemplate } = await import("./exempt.mjs");
    const template = JSON.parse(generateExemptTemplate());
    if (smartPaths.length > 0) {
      template.exemptPaths = [
        ...new Set([...smartPaths, ...template.exemptPaths]),
      ];
      template.description += `（自动扫描 ${targetDir} 发现 ${smartPaths.length} 个候选目录）`;
    }
    writeFileSync(outPath, JSON.stringify(template, null, 2) + "\n", "utf8");
    console.log(`✅ 已生成 ${outPath}`);
    if (smartPaths.length > 0) {
      console.log(`   自动发现 ${smartPaths.length} 个候选豁免目录:`);
      for (const p of smartPaths) console.log(`     ${p}`);
    }
    console.log(`   请人工审核后提交至版本库。`);
  }
  process.exit(0);
}

if (subcommand === "drift") {
  const { driftFromFiles, formatDriftText, formatDriftJson } =
    await import("./drift.mjs");
  const baselinePath = resolve(values.baseline || ".wl-baseline.json");
  const currentPath = resolve(values.current);
  if (!values.current) {
    console.error(
      "用法: wl-scan drift --baseline .wl-baseline.json --current .wl-current.json",
    );
    process.exit(1);
  }
  const result = driftFromFiles(baselinePath, currentPath);
  if (values.output === "json") {
    console.log(formatDriftJson(result));
  } else {
    console.log(formatDriftText(result));
  }
  const hasNew = result.gained.count > 0;
  process.exit(values["fail-on-error"] && hasNew ? 1 : 0);
}

if (subcommand === "snapshot") {
  const projectRoot = resolve(values.project);
  const sub = args[0] || "list";
  if (sub === "list") {
    const snaps = listSnapshots(projectRoot);
    if (snaps.length === 0) {
      console.log("暂无快照。");
      process.exit(0);
    }
    console.log(`# 快照列表（共 ${snaps.length} 个）\n`);
    for (const s of snaps) {
      console.log(
        `  ${s.id}  ${s.createdAt}  ${s.command}  ${s.totalFiles} 个文件  ${s.targetDir}`,
      );
    }
  } else if (sub === "rollback") {
    const result = rollbackSnapshot(
      projectRoot,
      values.id || undefined,
      values["dry-run"],
    );
    const mode = values["dry-run"] ? "[DRY-RUN] " : "";
    console.log(
      `${mode}回退快照 ${result.snapshotId}：还原 ${result.restoredFiles.length} 个文件`,
    );
    if (result.skippedFiles.length > 0) {
      console.log(`  跳过（文件已删除）：${result.skippedFiles.join(", ")}`);
    }
    for (const f of result.restoredFiles) console.log(`  ✔ ${f}`);
  } else if (sub === "diff") {
    const diffs = diffSnapshot(projectRoot, values.id || undefined);
    for (const d of diffs) {
      const icon =
        d.status === "changed" ? "🔸" : d.status === "unchanged" ? "✅" : "❌";
      console.log(`  ${icon} ${d.file} — ${d.status}`);
    }
  } else if (sub === "clean") {
    const removed = cleanSnapshots(projectRoot, parseInt(values.keep) || 5);
    console.log(`清理完成，删除 ${removed} 个旧快照。`);
  }
  process.exit(0);
}

if (subcommand === "fix") {
  const targetDir = resolve(values.target);
  const projectRoot = resolve(values.project);
  const result = runFix({
    target: targetDir,
    exclude: excludeDirs,
    dryRun: values["dry-run"],
    projectRoot,
    noSnapshot: values["no-snapshot"],
  });
  const mode = values["dry-run"] ? "[DRY-RUN] " : "";
  console.log(
    `${mode}扫描 ${result.totalFiles} 个文件，修改 ${result.changedFiles.length} 个文件，共 ${result.totalChanges} 处改动：`,
  );
  for (const { file, changes } of result.changedFiles.sort((a, b) =>
    a.file.localeCompare(b.file),
  )) {
    console.log(`  ${file}: ${changes} 处`);
  }
  if (result.snapshotId) {
    console.log(`\n📸 已创建快照: ${result.snapshotId}`);
    console.log(
      `   回退命令: npx wl-scan snapshot rollback --id ${result.snapshotId}`,
    );
  }
  if (values["dry-run"])
    console.log(
      `\n[DRY-RUN 模式] 未实际写入文件。去掉 --dry-run 后重新运行即可应用。`,
    );
  process.exit(0);
}

if (subcommand === "all") {
  const projectRoot = resolve(values.project);
  const targetDir =
    values.target === "./src"
      ? join(projectRoot, "src")
      : resolve(values.target);
  const integration = checkIntegration(projectRoot);
  const exemptConfig = loadExemptConfig(
    projectRoot,
    values.exempt || undefined,
  );
  const { allIssues, exemptedIssues, fileCount, exemptFileCount, coverage } =
    runScan(targetDir, excludeDirs, exemptConfig);
  const filtered = applyFilters(allIssues);
  const recommendations = recommendFlows({ issues: filtered, coverage });
  const report = generateReport(filtered, fileCount, values.output, {
    integration,
    exemptFileCount,
    exemptedIssueCount: exemptedIssues.length,
    exemptPaths: exemptConfig.exemptPaths,
    coverage,
    recommendations,
  });
  if (values.outFile) {
    writeFileSync(values.outFile, report, "utf8");
    console.error(`[wl-scan] 报告已写入: ${values.outFile}`);
  } else {
    console.log(report);
  }
  const hasError =
    allIssues.some((i) => i.severity === "error") ||
    integration.some((c) => !c.ok && c.severity === "error");
  process.exit(values["fail-on-error"] && hasError ? 1 : 0);
}

// 默认：scan（兼容旧用法）
{
  const targetDir = resolve(values.target);
  const projectRoot = resolve(values.project);
  const exemptConfig = loadExemptConfig(
    projectRoot,
    values.exempt || undefined,
  );
  const { allIssues, exemptedIssues, fileCount, exemptFileCount, coverage } =
    runScan(targetDir, excludeDirs, exemptConfig);
  const filtered = applyFilters(allIssues);
  const recommendations = recommendFlows({ issues: filtered, coverage });
  const report = generateReport(filtered, fileCount, values.output, {
    exemptFileCount,
    exemptedIssueCount: exemptedIssues.length,
    exemptPaths: exemptConfig.exemptPaths,
    coverage,
    recommendations,
  });
  if (values.outFile) {
    writeFileSync(values.outFile, report, "utf8");
    console.error(`[wl-scan] 报告已写入: ${values.outFile}`);
  } else {
    console.log(report);
  }

  // ── baseline 漂移检测（--baseline <file>）────────────────────────────────
  let driftResult = null;
  if (values.baseline) {
    const { existsSync: fileExists } = await import("node:fs");
    const baselinePath = resolve(values.baseline);
    if (fileExists(baselinePath)) {
      const { drift, formatDriftText, formatDriftJson } =
        await import("./drift.mjs");
      const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
      const currentData = { issues: filtered };
      driftResult = drift(baseline, currentData);
      console.error("");
      if (values.output === "json") {
        console.error(formatDriftJson(driftResult));
      } else {
        console.error(formatDriftText(driftResult));
      }
    } else {
      console.error(`[wl-scan] 基线文件不存在: ${baselinePath}，跳过漂移检测`);
    }
  }

  const hasError = filtered.some((i) => i.severity === "error");
  const hasDriftNew = driftResult && driftResult.gained.count > 0;
  process.exit(values["fail-on-error"] && (hasError || hasDriftNew) ? 1 : 0);
}
