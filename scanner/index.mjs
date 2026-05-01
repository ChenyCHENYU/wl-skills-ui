#!/usr/bin/env node
/**
 * wk-skills-ui — UI 风格对齐扫描器（CLI）
 *
 * 用法：
 *   wk-scan scan --target <path>          # 风格扫描
 *   wk-scan scan --target <path> --outFile report.md
 *   wk-scan scan --target <path> --output json
 *   wk-scan check --project <path>        # 接入完整性检查
 *   wk-scan fix --target <path>           # 自动修复 A 类问题
 *   wk-scan fix --target <path> --dry-run
 *   wk-scan all --project <path>          # 接入检查 + 风格扫描 + 报告
 *   wk-scan init                          # 打印接入指引
 *
 * 兼容旧用法：
 *   wk-scan --target <path>               # 等价于 scan
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { parseArgs } from "node:util";
import { getRules } from "./rules/index.mjs";
const rules = getRules();
import { generateReport } from "./report.mjs";
import { checkIntegration } from "./integration.mjs";
import { runFix } from "./fix.mjs";

const args = process.argv.slice(2);
const SUBCOMMANDS = new Set(["scan", "check", "fix", "all", "init"]);
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

function runScan(targetDir, excludeDirs) {
  const allIssues = [];
  let fileCount = 0;
  for (const filePath of walkVue(targetDir, excludeDirs)) {
    fileCount++;
    const content = readFileSync(filePath, "utf8");
    const { text: template, lineOffset } = extractTemplate(content);
    const relPath = relative(targetDir, filePath).replace(/\\/g, "/");

    for (const rule of rules) {
      if (typeof rule.check === "function") {
        allIssues.push(...rule.check(template, relPath, lineOffset));
      }
    }

    const styleBlock = extractBlock(content, "style");
    if (styleBlock) {
      for (const rule of rules) {
        if (typeof rule.checkStyle === "function") {
          allIssues.push(
            ...rule.checkStyle(styleBlock.text, relPath, styleBlock.lineOffset),
          );
        }
      }
    }

    const scriptBlock = extractBlock(content, "script");
    if (scriptBlock) {
      for (const rule of rules) {
        if (typeof rule.checkScript === "function") {
          allIssues.push(
            ...rule.checkScript(
              scriptBlock.text,
              relPath,
              scriptBlock.lineOffset,
            ),
          );
        }
      }
    }

    allIssues.push(...checkScriptOps(content, relPath));
  }
  return { allIssues, fileCount };
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
  return out;
}

// ── 子命令分发 ──────────────────────────────────────────────────────────
const excludeDirs = values.exclude.split(",").map((s) => s.trim());

if (subcommand === "init") {
  console.log(`# wk-skills-ui 接入指引

1. 安装依赖：
   pnpm add wk-skills-ui

2. 在 index.html <head> 最先加载 tokens.css：
   <link rel="stylesheet" href="/node_modules/wk-skills-ui/dist/tokens.css" />

3. 在全局 SCSS 入口（如 src/assets/style/main.scss）追加：
   @use 'wk-skills-ui/dist' as *;
   // 可选 portal 视觉增强：@use 'wk-skills-ui/dist/portal.scss';

4. 在 src/main.ts 中注册 runtime（可选，仅当业务侧用到 defineColumns）：
   import { installCommonPreset } from 'wk-skills-ui/runtime/common-preset';
   installCommonPreset();

5. 业务列定义改用 defineColumns：
   import { defineColumns, renderOps } from 'wk-skills-ui/runtime';

6. 验证：
   npx wk-scan check --project .
   npx wk-scan scan --target src
`);
  process.exit(0);
}

if (subcommand === "check") {
  const projectRoot = resolve(values.project);
  const checks = checkIntegration(projectRoot);
  if (values.output === "json") {
    console.log(JSON.stringify({ projectRoot, checks }, null, 2));
  } else {
    console.log(`# wk-skills-ui 接入完整性检查\n`);
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

if (subcommand === "fix") {
  const targetDir = resolve(values.target);
  const result = runFix({
    target: targetDir,
    exclude: excludeDirs,
    dryRun: values["dry-run"],
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
  const { allIssues, fileCount } = runScan(targetDir, excludeDirs);
  const filtered = applyFilters(allIssues);
  const report = generateReport(filtered, fileCount, values.output, {
    integration,
  });
  if (values.outFile) {
    writeFileSync(values.outFile, report, "utf8");
    console.error(`[wk-scan] 报告已写入: ${values.outFile}`);
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
  const { allIssues, fileCount } = runScan(targetDir, excludeDirs);
  const filtered = applyFilters(allIssues);
  const report = generateReport(filtered, fileCount, values.output);
  if (values.outFile) {
    writeFileSync(values.outFile, report, "utf8");
    console.error(`[wk-scan] 报告已写入: ${values.outFile}`);
  } else {
    console.log(report);
  }
  const hasError = filtered.some((i) => i.severity === "error");
  process.exit(values["fail-on-error"] && hasError ? 1 : 0);
}
