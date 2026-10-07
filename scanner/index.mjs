#!/usr/bin/env node
/**
 * wl-skills-ui — UI 风格对齐扫描器（CLI）
 *
 * 用法：
 *   wl-scan scan --target <path>          # 风格扫描
 *   wl-scan audit --target <path>         # 只读全量审计（scan 别名）
 *   wl-scan scan --target <path> --only R001,R016
 *   wl-scan scan --target <path> --skip R031-R037
 *   wl-scan scan --target <path> --outFile report.md
 *   wl-scan scan --target <path> --output json
 *   wl-scan scan --target <path> --changed [--base origin/main]
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
import { generateReport } from "./report.mjs";
import { checkIntegration } from "./integration.mjs";
import { runFix } from "./fix.mjs";
import { recommendFlows } from "./coverage.mjs";
import {
  listSnapshots,
  rollbackSnapshot,
  diffSnapshot,
  cleanSnapshots,
} from "./snapshot.mjs";
import { loadExemptConfig } from "./exempt.mjs";
import { collectChangedVueFiles } from "./changed.mjs";
import { SFC_PARSER_MODES } from "./sfc-parser.mjs";
import { resolveProjectProfile } from "../standards/profiles-loader.mjs";
import { scanFiles } from "./engine.mjs";
import { beginUiCheck, finishUiCheck, scanFacts, integrationFacts, core } from "../bin/task-integration.mjs";

const args = process.argv.slice(2);
const SUBCOMMANDS = new Set([
  "scan",
  "audit",
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
} else if (args.length > 0 && !args[0].startsWith("-")) {
  console.error(`[wl-scan] 未知命令：${args[0]}`);
  process.exit(1);
}
const isAudit = subcommand === "audit";

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
    profile: { type: "string", default: "" },
    id: { type: "string", default: "" },
    keep: { type: "string", default: "5" },
    "no-snapshot": { type: "boolean", default: false },
    "plan-hash": { type: "string", default: "" },
    "refresh-baseline": { type: "boolean", default: false },
    exempt: { type: "string", default: "" },
    baseline: { type: "string", default: "" },
    current: { type: "string", default: "" },
    only: { type: "string", default: "" },
    skip: { type: "string", default: "" },
    changed: { type: "boolean", default: false },
    "changed-fallback": { type: "string", default: "error" },
    base: { type: "string", default: "HEAD" },
    parser: { type: "string", default: "auto" },
    limit: { type: "string", default: "100" },
    cursor: { type: "string", default: "0" },
    "run-id": { type: "string" },
  },
  strict: false,
});

// ── 公共：扫描逻辑 ──────────────────────────────────────────────────────
if (!SFC_PARSER_MODES.includes(values.parser)) {
  console.error(
    `[wl-scan] --parser 仅支持 ${SFC_PARSER_MODES.join(" / ")}，当前为 ${values.parser}`,
  );
  process.exit(1);
}

let profileResolution;
try {
  profileResolution = resolveProjectProfile({
    projectRoot: values.project,
    profile: values.profile || undefined,
    mode: values.mode || undefined,
  });
} catch (error) {
  console.error(`[wl-scan] ${error.message}`);
  process.exit(1);
}
if (!["error", "full"].includes(values["changed-fallback"])) {
  console.error(
    `[wl-scan] --changed-fallback 仅支持 error / full，当前为 ${values["changed-fallback"]}`,
  );
  process.exit(1);
}
const activeProfile = profileResolution.profile;
const rules = getRules({ profile: activeProfile.id });

function resolveTarget(projectRoot, target) {
  return resolve(projectRoot, target || "src");
}

function runScan(
  targetDir,
  excludeDirs,
  exemptConfig,
  fileFilter = null,
  scanOptions = {},
) {
  return scanFiles({
    targetDir,
    excludeDirs,
    exemptConfig,
    fileFilter,
    parser: scanOptions.parser || values.parser,
    projectRoot: scanOptions.projectRoot || process.cwd(),
    rules,
    profile: activeProfile,
  });
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
  return [...new Set([...out, ...issues.filter((issue) => issue.rule === "SFC_PARSE")])];
}

// ── 子命令分发 ──────────────────────────────────────────────────────────
const excludeDirs = values.exclude.split(",").map((s) => s.trim());
const execution = ["scan", "audit", "check", "all", "fix"].includes(subcommand)
  ? beginUiCheck(resolve(values.project), [subcommand === "check" ? "." : values.target], subcommand, values["run-id"])
  : null;
let executionEvidence;
function recordUiFacts(facts) {
  executionEvidence = finishUiCheck(execution, facts);
  console.error(core.formatStatus(core.readStatus(execution.opts)));
  return executionEvidence;
}
process.once("exit", (code) => {
  if (execution && !executionEvidence) recordUiFacts({ exitCode: code, validationStatus: "unverified", checks: [], summary: { reason: "Command stopped before checks completed" } });
});
let latestChangedInfo = null;

function changedFileFilter(projectRoot, targetDir) {
  if (!values.changed) {
    latestChangedInfo = { requested: false, fallback: false };
    return null;
  }
  const result = collectChangedVueFiles({
    projectRoot,
    targetDir,
    base: values.base,
  });
  if (result.fallback) {
    latestChangedInfo = {
      requested: true,
      fallback: true,
      reason: result.reason,
    };
    if (values["changed-fallback"] === "error") {
      console.error(`[wl-scan] 增量范围解析失败：${result.reason}`);
      console.error("如确需全量扫描，请显式传入 --changed-fallback full");
      process.exit(1);
    }
    console.error(`[wl-scan] 增量范围解析失败，已安全回退全量扫描：${result.reason}`);
    return null;
  }
  latestChangedInfo = {
    requested: true,
    fallback: false,
    files: result.files.size,
    base: values.base,
  };
  console.error(`[wl-scan] 增量模式：扫描 ${result.files.size} 个变更 Vue 文件`);
  return result.files;
}

if (subcommand === "init") {
  console.log(`# wl-skills-ui 接入指引

1. 安装依赖：
   pnpm add @agile-team/wl-skills-ui

2. 在 index.html <head> 最先加载 tokens.css：
   <link rel="stylesheet" href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css" />

3. 在全局 SCSS 入口（如 src/assets/style/main.scss）追加：
   @use '@agile-team/wl-skills-ui/${activeProfile.stylePreset}' as *;

4. 在 src/main.ts 中安装 Profile 对应的包级保护：
   import '@agile-team/wl-skills-ui/${activeProfile.runtimePreset}';

5. 业务列定义改用 defineColumns：
   import { defineColumns, renderOps } from '@agile-team/wl-skills-ui/runtime';

6. 验证：
   npx wl-ui check --project .
   npx wl-ui scan --target src --profile ${activeProfile.id} --output summary
`);
  process.exit(0);
}

if (subcommand === "check") {
  const projectRoot = resolve(values.project);
  // 严格校验只认显式声明的 profile（--profile / .wl-ui-profile.json /
  // 安装清单）；依赖自动识别仅用于建议口径，保证升级不把存量绿灯判红。
  const enforcedProfile = profileResolution.explicit ? activeProfile : null;
  const checks = checkIntegration(projectRoot, enforcedProfile);
  const evidence = recordUiFacts(integrationFacts(checks, values["fail-on-error"] && checks.some((check) => !check.ok && check.severity === "error") ? 1 : 0));
  if (values.output === "json") {
    console.log(
      JSON.stringify(
        {
          projectRoot,
          profile: {
            id: activeProfile.id,
            source: profileResolution.source,
            explicit: profileResolution.explicit,
          },
          checks,
          ...evidence,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`# wl-skills-ui 接入完整性检查\n`);
    console.log(`项目根目录：${projectRoot}\n`);
    if (!profileResolution.explicit) {
      console.log(
        `ℹ️ 未显式声明 profile（当前按 ${activeProfile.id} 自动识别）。使用兼容口径校验；` +
          `如需严格校验请创建 .wl-ui-profile.json 或 npx wl-ui init --profile <id>。\n`,
      );
    }
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
    const targetDir = resolveTarget(projectRoot, values.target);
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
          const rel = relative(projectRoot, join(dir, entry.name)).replace(
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
  const projectRoot = resolve(values.project);
  const targetDir = resolveTarget(projectRoot, values.target);
  let result;
  try {
    result = runFix({
      target: targetDir,
      exclude: excludeDirs,
      dryRun: values["dry-run"],
      projectRoot,
      noSnapshot: values["no-snapshot"],
      profile: activeProfile.id,
      only: values.only ? expandRuleRange(values.only) : undefined,
      skip: values.skip ? expandRuleRange(values.skip) : undefined,
      expectedPlanHash: values["plan-hash"] || undefined,
    });
  } catch (error) {
    console.error(`[wl-scan] ${error.message}`);
    process.exit(1);
  }
  if (values.output !== "json") {
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
    console.log(`\n修复计划哈希: ${result.planHash}`);
    console.log(`Profile: ${result.profile}`);
  }
  const verification = runScan(
    targetDir,
    excludeDirs,
    loadExemptConfig(projectRoot, values.exempt || undefined),
    null,
    { parser: values.parser, projectRoot },
  );
  const remaining = applyFilters(verification.allIssues);
  const remainingErrors = remaining.filter((issue) => issue.severity === "error");
  const evidence = recordUiFacts({ ...scanFacts(verification, remaining), exitCode: values["fail-on-error"] && remainingErrors.length > 0 ? 1 : 0 });
  if (values.output === "json") {
    console.log(
      JSON.stringify(
        {
          ...result,
          ...evidence,
          verification: {
            remaining: remaining.length,
            errors: remainingErrors.length,
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`\n复检：剩余 ${remaining.length} 项，其中 error ${remainingErrors.length} 项。`);
  }
  process.exit(values["fail-on-error"] && remainingErrors.length > 0 ? 1 : 0);
}

if (subcommand === "all") {
  const projectRoot = resolve(values.project);
  const targetDir = resolveTarget(projectRoot, values.target);
  // 与 check 同口径：仅显式声明的 profile 驱动严格接入校验。
  const integration = checkIntegration(
    projectRoot,
    profileResolution.explicit ? activeProfile : null,
  );
  const exemptConfig = loadExemptConfig(
    projectRoot,
    values.exempt || undefined,
  );
  const {
    allIssues,
    exemptedIssues,
    fileCount,
    exemptFileCount,
    coverage,
    parsing,
    ruleExecutions,
    checkedFiles,
  } = runScan(
      targetDir,
      excludeDirs,
      exemptConfig,
      changedFileFilter(projectRoot, targetDir),
      { parser: values.parser, projectRoot },
    );
  const filtered = applyFilters(allIssues);
  const recommendations = recommendFlows({
    issues: filtered,
    coverage,
    profile: activeProfile,
  });
  const scanResult = { fileCount, exemptFileCount, ruleExecutions, parsing, checkedFiles };
  const facts = scanFacts(scanResult, filtered);
  facts.checks.push(...integrationFacts(integration).checks);
  const evidence = recordUiFacts({ ...facts, exitCode: values["fail-on-error"] && (filtered.some((issue) => issue.severity === "error") || integration.some((check) => !check.ok && check.severity === "error")) ? 1 : 0 });
  const report = generateReport(filtered, fileCount, values.output, {
    execution: evidence,
    integration,
    exemptFileCount,
    exemptedIssueCount: exemptedIssues.length,
    exemptPaths: exemptConfig.exemptPaths,
    coverage,
    parsing,
    ruleExecutions,
    recommendations,
    profile: { id: activeProfile.id, source: profileResolution.source },
    changed: latestChangedInfo,
    limit: values.limit,
    cursor: values.cursor,
  });
  if (values.outFile) {
    writeFileSync(values.outFile, report, "utf8");
    console.error(`[wl-scan] 报告已写入: ${values.outFile}`);
  } else {
    console.log(report);
  }
  const hasError =
    filtered.some((i) => i.severity === "error") ||
    integration.some((c) => !c.ok && c.severity === "error");
  process.exit(values["fail-on-error"] && hasError ? 1 : 0);
}

// 默认：scan（兼容旧用法）
{
  const projectRoot = resolve(values.project);
  const targetDir = resolveTarget(projectRoot, values.target);
  const exemptConfig = loadExemptConfig(
    projectRoot,
    values.exempt || undefined,
  );
  const {
    allIssues,
    exemptedIssues,
    fileCount,
    exemptFileCount,
    coverage,
    parsing,
    ruleExecutions,
    checkedFiles,
  } = runScan(
      targetDir,
      excludeDirs,
      exemptConfig,
      changedFileFilter(projectRoot, targetDir),
      { parser: values.parser, projectRoot },
    );
  const filtered = applyFilters(allIssues);
  const recommendations = recommendFlows({
    issues: filtered,
    coverage,
    profile: activeProfile,
  });
  const evidence = recordUiFacts({ ...scanFacts({ fileCount, exemptFileCount, ruleExecutions, parsing, checkedFiles }, filtered), exitCode: values["fail-on-error"] && filtered.some((issue) => issue.severity === "error") ? 1 : 0 });
  const report = generateReport(filtered, fileCount, values.output, {
    execution: evidence,
    exemptFileCount,
    exemptedIssueCount: exemptedIssues.length,
    exemptPaths: exemptConfig.exemptPaths,
    coverage,
    parsing,
    recommendations,
    profile: { id: activeProfile.id, source: profileResolution.source },
    changed: latestChangedInfo,
    limit: values.limit,
    cursor: values.cursor,
  });
  if (values.outFile) {
    writeFileSync(values.outFile, report, "utf8");
    console.error(`[wl-scan] 报告已写入: ${values.outFile}`);
  } else {
    console.log(report);
  }

  if (isAudit && values["refresh-baseline"]) {
    const baselinePath = resolve(projectRoot, values.baseline || ".wl-baseline.json");
    const baseline = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      issues: filtered,
    };
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    console.error(`[wl-scan] 基线已刷新: ${baselinePath}`);
  }

  // ── baseline 漂移检测（--baseline <file>）────────────────────────────────
  let driftResult = null;
  if (values.baseline && !values["refresh-baseline"]) {
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
