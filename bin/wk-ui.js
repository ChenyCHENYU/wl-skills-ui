#!/usr/bin/env node
/**
 * wk-ui — wk-skills-ui 统一 CLI
 *
 * 子命令：
 *   wk-ui init   [--project <path>] [--editor copilot|cursor|windsurf|kiro|trae] [--dry-run]
 *                把 skills/ 写入目标项目的 AI 编辑器规则目录
 *   wk-ui scan   → 委托给 scanner/index.mjs
 *   wk-ui check  → 委托给 scanner/index.mjs
 *   wk-ui fix    → 委托给 scanner/index.mjs
 *   wk-ui all    → 委托给 scanner/index.mjs
 *
 * 向后兼容：wk-scan 仍可用（直接调用 scanner/index.mjs）
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, "..");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 常量
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 编辑器 → 安装目录映射 */
const EDITOR_TARGETS = {
  "github-copilot": {
    dir: ".github/instructions/wk-skills",
    ext: ".instructions.md",
  },
  cursor: { dir: ".cursor/rules", ext: ".mdc" },
  windsurf: { dir: ".windsurf/rules", ext: ".md" },
  kiro: { dir: ".kiro/steering", ext: ".md" },
  trae: { dir: ".trae/rules", ext: ".md" },
};

// ── 参数解析 ─────────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const SUBCOMMANDS = new Set([
  "init",
  "scan",
  "check",
  "fix",
  "all",
  "add-preset",
]);
let subcommand = "help";

if (rawArgs.length > 0 && SUBCOMMANDS.has(rawArgs[0])) {
  subcommand = rawArgs.shift();
} else if (rawArgs.length === 0) {
  subcommand = "help";
}

// 非 init 子命令：直接委托给 scanner/index.mjs
const SCANNER_CMDS = new Set(["scan", "check", "fix", "all"]);
if (SCANNER_CMDS.has(subcommand)) {
  const scannerBin = join(PKG_ROOT, "scanner", "index.mjs");
  try {
    execFileSync(process.execPath, [scannerBin, subcommand, ...rawArgs], {
      stdio: "inherit",
    });
  } catch (e) {
    process.exit(e.status ?? 1);
  }
  process.exit(0);
}

// ── help ──────────────────────────────────────────────────────────────────────
if (
  subcommand === "help" ||
  rawArgs.includes("--help") ||
  rawArgs.includes("-h")
) {
  printHelp();
  process.exit(0);
}

// ── init ──────────────────────────────────────────────────────────────────────
if (subcommand === "init") {
  const { values } = parseArgs({
    args: rawArgs,
    options: {
      project: { type: "string", default: "." },
      editor: { type: "string", default: "" },
      mode: { type: "string", default: "native" }, // native | skin
      "dry-run": { type: "boolean", default: false },
      "skills-only": { type: "boolean", default: false },
    },
    strict: false,
  });

  const projectRoot = resolve(values.project);
  const dryRun = values["dry-run"];
  const skillsOnly = values["skills-only"];
  const mode = values.mode === "skin" ? "skin" : "native";

  console.log(`\n[wk-ui init] 目标项目：${projectRoot}`);
  console.log(`[wk-ui init] 模式：${mode === "skin" ? "化妆 (skin)" : "原生 (native)"}`);
  if (dryRun) console.log("[wk-ui init] DRY-RUN 模式：不实际写入文件\n");

  // 1. 检测编辑器
  const editor = values.editor || detectEditor(projectRoot);
  console.log(`[wk-ui init] 检测到编辑器：${editor}\n`);

  // 2. 安装 skills（按 mode 过滤）
  installSkills({ projectRoot, editor, mode, dryRun });

  // 3. 安装接入配置（非 --skills-only 时）
  if (!skillsOnly) {
    installStyleSetup({ projectRoot, mode, dryRun });
  }

  console.log("\n✅ wk-ui init 完成！\n");
  console.log("下一步：");
  if (mode === "skin") {
    console.log("  npx wk-ui scan --target src --mode skin   # 仅化妆层审计");
  } else {
    console.log("  npx wk-ui check --project . # 验证接入完整性");
    console.log("  npx wk-ui all   --project . # 完整扫描报告");
  }
  console.log("");
  process.exit(0);
}

// ── add-preset ─────────────────────────────────────────────────────────────────
if (subcommand === "add-preset") {
  const presetName = rawArgs[0];
  if (!presetName) {
    console.error(
      "[wk-ui add-preset] 请提供预设名称，例如：wk-ui add-preset my-biz",
    );
    process.exit(1);
  }
  scaffoldPreset(presetName);
  process.exit(0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 工具函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 工具函数 */

/** 检测目标项目使用哪个 AI 编辑器 */
function detectEditor(projectRoot) {
  if (existsSync(join(projectRoot, ".cursor"))) return "cursor";
  if (existsSync(join(projectRoot, ".windsurf"))) return "windsurf";
  if (existsSync(join(projectRoot, ".kiro"))) return "kiro";
  if (existsSync(join(projectRoot, ".trae"))) return "trae";
  // 默认 Copilot（最常见）
  return "github-copilot";
}

/** 读取 skills/ 目录下所有 SKILL.md 文件 */
function collectSkills(skillsDir) {
  const skills = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith("_")) {
        walk(full);
      } else if (entry.name === "SKILL.md") {
        const rel = relative(skillsDir, dir).replace(/\\/g, "/");
        const content = readFileSync(full, "utf8");
        skills.push({ path: rel, content, full });
      }
    }
  }
  walk(skillsDir);
  return skills;
}

/** 读取编辑器 frontmatter 模板 */
function getHeaderTemplate(editor) {
  const headerPath = join(
    PKG_ROOT,
    "skills",
    "_compat",
    "headers",
    `${editor}.txt`,
  );
  if (existsSync(headerPath)) return readFileSync(headerPath, "utf8");
  return "";
}

/** 从 SKILL.md 内容中提取 frontmatter 字段 */
function parseSkillFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { description: "", applyTo: "**/*.vue" };
  const fm = match[1];
  const descMatch = fm.match(/description:\s*\|\n([\s\S]*?)(?=\n\w|$)/);
  const applyToMatch = fm.match(/applyTo:\s*"?([^"\n]+)"?/);
  return {
    description: descMatch ? descMatch[1].replace(/^ {2}/gm, "").trim() : "",
    applyTo: applyToMatch ? applyToMatch[1].trim() : "**/*.vue",
  };
}

/** 把 SKILL.md 内容（去掉原有 frontmatter）转为目标编辑器格式 */
function transformForEditor(content, editor) {
  // 去掉原有 frontmatter
  const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, "");
  const { description, applyTo } = parseSkillFrontmatter(content);
  const headerTemplate = getHeaderTemplate(editor);

  if (!headerTemplate) return body;

  const header = headerTemplate
    .replace("{SKILL_DESCRIPTION}", description.split("\n")[0])
    .replace("{APPLY_GLOB}", applyTo)
    .replace(
      "{SKILL_NAME}",
      body
        .split("\n")
        .find((l) => l.startsWith("# "))
        ?.slice(2) || "Skill",
    );

  return header + "\n" + body;
}

/** 安装 skills 到目标项目（按 mode 过滤）*/
function installSkills({ projectRoot, editor, mode = "native", dryRun }) {
  const target = EDITOR_TARGETS[editor] || EDITOR_TARGETS["github-copilot"];
  const targetDir = join(projectRoot, target.dir);
  const skillsDir = join(PKG_ROOT, "skills");

  console.log(`[wk-ui init] 安装 Skills → ${target.dir}`);

  let skills = collectSkills(skillsDir);

  // skin 模式：过滤掉 runtime/ 和 layouts/ （避免干扰老项目布局）
  if (mode === "skin") {
    skills = skills.filter(
      (s) => !s.path.startsWith("runtime/") && !s.path.startsWith("layouts/"),
    );
    console.log(`  [skin mode] 已过滤掉 runtime/ 和 layouts/ 类 skill`);
  }

  let count = 0;
  for (const skill of skills) {
    const fileName = skill.path.replace(/\//g, "-") + target.ext;
    const outPath = join(targetDir, fileName);
    const transformed = transformForEditor(skill.content, editor);

    if (dryRun) {
      console.log(`  [dry-run] 写入 ${relative(projectRoot, outPath)}`);
    } else {
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(outPath, transformed, "utf8");
      console.log(`  ✔ 写入 ${relative(projectRoot, outPath)}`);
    }
    count++;
  }

  console.log(`\n  共安装 ${count} 个 Skill 文件\n`);
}

/** 接入配置引导（tokens.css + styles import）按 mode 推荐不同 presets */
function installStyleSetup({ projectRoot, mode = "native", dryRun }) {
  console.log("[wk-ui init] 检查样式接入配置...\n");

  const tokensHref =
    "/node_modules/@agile-team/wk-skills-ui/design/tokens/base.css";
  const stylesEntry =
    mode === "skin"
      ? "@agile-team/wk-skills-ui/styles/presets/skin"
      : "@agile-team/wk-skills-ui/styles";

  // 检查 index.html
  const htmlFiles = [
    join(projectRoot, "index.html"),
    join(projectRoot, "public", "index.html"),
  ].filter((f) => existsSync(f));

  for (const htmlFile of htmlFiles) {
    const content = readFileSync(htmlFile, "utf8");
    if (!content.includes("tokens") && !content.includes("wk-skills-ui")) {
      const tokensLink = `\n    <link rel="stylesheet" href="${tokensHref}" />`;
      const updated = content.replace("</head>", tokensLink + "\n  </head>");
      if (dryRun) {
        console.log(
          `  [dry-run] 追加 tokens link → ${relative(projectRoot, htmlFile)}`,
        );
      } else {
        writeFileSync(htmlFile, updated, "utf8");
        console.log(
          `  ✔ 追加 tokens link → ${relative(projectRoot, htmlFile)}`,
        );
      }
    } else {
      console.log(
        `  ✅ tokens 已存在 → ${relative(projectRoot, htmlFile)}`,
      );
    }
  }

  // 提示 SCSS 接入（不自动修改，避免破坏现有样式顺序）
  console.log(`
  ⚠️  请手动在全局 SCSS 入口（main.scss 或 index.scss）添加：
     @use '${stylesEntry}' as *;
${
  mode === "native"
    ? `
  ⚠️  请手动在 src/main.ts 添加：
     import { installCommonPreset } from '@agile-team/wk-skills-ui/runtime/common-preset';
     installCommonPreset();
`
    : `
  ℹ️  skin 模式不需要引入 runtime，页面布局 / 业务代码均保持现状。
`
}`);
}

/** 脚手架新预设文件 */
function scaffoldPreset(name) {
  const outPath = join(PKG_ROOT, "runtime", "presets", `${name}.ts`);
  if (existsSync(outPath)) {
    console.error(`[wk-ui add-preset] 文件已存在：${outPath}`);
    process.exit(1);
  }
  const template = `/**
 * runtime/presets/${name}.ts — ${name} 业务预设
 * 使用：import { install${capitalize(name)}Preset } from '@agile-team/wk-skills-ui/runtime/presets/${name}';
 */
import type { TagMapItem } from '../core/types';
import { renderTagNode } from '../core/renderers';
import { registerColumnAutoMaps } from '../core/registry';

// ── 状态映射 ──────────────────────────────────────────────────────────────────
export const MY_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "待处理", type: "info" },
  "1": { label: "处理中", type: "primary" },
  "2": { label: "已完成", type: "success" },
  "3": { label: "已驳回", type: "danger" },
};

export const renderMyStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, MY_STATUS_MAP);

// ── 安装 ──────────────────────────────────────────────────────────────────────
export function install${capitalize(name)}Preset(): void {
  registerColumnAutoMaps({
    myStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderMyStatus(row.myStatus),
    },
  });
}
`;
  writeFileSync(outPath, template, "utf8");
  console.log(`[wk-ui add-preset] ✔ 创建预设文件：${outPath}`);
  console.log(`  在 main.ts 中引入：install${capitalize(name)}Preset()`);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── 帮助信息 ──────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
wk-ui — @agile-team/wk-skills-ui 统一 CLI v1.3

用法：
  wk-ui init   [--project <path>] [--editor <editor>] [--mode native|skin]
                [--dry-run] [--skills-only]
                把 skills/ 写入目标项目的 AI 编辑器规则目录

  wk-ui scan   --target <src> [--layer L0,L1,L2] [--vendor base-table,jh]
                              [--mode skin|native] [--outFile report.md]
  wk-ui check  --project <项目根目录>
  wk-ui fix    --target <src目录> [--dry-run]
  wk-ui all    --project <项目根目录> [--outFile report.md]

  wk-ui add-preset <name>   脚手架一个新的业务预设文件

参数：
  --project       项目根目录（默认 .）
  --editor        指定编辑器：github-copilot | cursor | windsurf | kiro | trae
  --mode          init: native(默认,完整接入) | skin(化妆,老项目)
                  scan: skin(只看L0/L1/L2) | native(全量)
  --layer         scan 过滤：L0/L1/L2/L3/L4（逗号分隔）
  --vendor        scan 过滤：element/base-table/jh-components/...（逗号分隔）
  --dry-run       预览模式，不实际写入文件
  --skills-only   仅安装 skill 文件，不处理 index.html

示例：
  npx wk-ui init
  npx wk-ui init --mode skin --project /path/to/legacy-project
  npx wk-ui scan --target src --mode skin --outFile report.md
  npx wk-ui scan --target src --layer L0,L1
  npx wk-ui add-preset my-biz
`);
}
