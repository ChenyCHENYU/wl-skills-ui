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
  rmSync,
  unlinkSync,
} from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const PKG = require("../package.json");
const MANIFEST_NAME = ".wk-skills-ui-manifest.json";

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
  "claude-code": { dir: ".", ext: ".md", singleFile: "CLAUDE.md" },
  cline: { dir: ".", ext: ".md", singleFile: ".clinerules" },
  "agents-generic": { dir: ".", ext: ".md", singleFile: "AGENTS.md" },
  qoder: { dir: ".qoder/rules", ext: ".md" },
};

// ── 参数解析 ─────────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const SUBCOMMANDS = new Set([
  "init",
  "update",
  "diff",
  "clean",
  "doctor",
  "prompts",
  "scan",
  "check",
  "fix",
  "all",
  "add-preset",
  "snapshot",
]);
let subcommand = "help";

if (rawArgs.length > 0 && SUBCOMMANDS.has(rawArgs[0])) {
  subcommand = rawArgs.shift();
} else if (rawArgs.length === 0) {
  subcommand = "help";
}

// 非 init 子命令：直接委托给 scanner/index.mjs
const SCANNER_CMDS = new Set(["scan", "check", "fix", "all", "snapshot"]);
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
if (subcommand === "init" || subcommand === "update") {
  const { values } = parseArgs({
    args: rawArgs,
    options: {
      project: { type: "string", default: "." },
      editor: { type: "string", default: "" },
      mode: { type: "string", default: "native" }, // native | skin
      "dry-run": { type: "boolean", default: false },
      "skills-only": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
    strict: false,
  });

  const projectRoot = resolve(values.project);
  const dryRun = values["dry-run"];
  const skillsOnly = values["skills-only"];
  const mode = values.mode === "skin" ? "skin" : "native";

  if (
    subcommand === "update" &&
    readManifest(projectRoot)?.version === PKG.version &&
    !values.force
  ) {
    console.log(
      `\n[wk-ui update] 当前项目已安装 v${PKG.version}，无需重复操作。`,
    );
    console.log("如需强制更新：npx wk-ui update --force\n");
    process.exit(0);
  }

  console.log(`\n[wk-ui ${subcommand}] 目标项目：${projectRoot}`);
  console.log(
    `[wk-ui ${subcommand}] 模式：${mode === "skin" ? "化妆 (skin)" : "原生 (native)"}`,
  );
  if (dryRun)
    console.log(`[wk-ui ${subcommand}] DRY-RUN 模式：不实际写入文件\n`);

  // 1. 检测编辑器
  const editor = values.editor || detectEditor(projectRoot);
  console.log(`[wk-ui ${subcommand}] 检测到编辑器：${editor}\n`);

  // 2. 安装 skills（按 mode 过滤）
  const installedFiles = installSkills({ projectRoot, editor, mode, dryRun });
  installedFiles.push(...installSupportFiles({ projectRoot, dryRun }));

  // 3. 安装接入配置（非 --skills-only 时）
  if (!skillsOnly) {
    installStyleSetup({ projectRoot, mode, dryRun });
  }

  if (!dryRun) {
    writeManifest(projectRoot, {
      version: PKG.version,
      editor,
      mode,
      installedAt: new Date().toISOString(),
      files: Object.fromEntries(
        installedFiles.map((f) => [f, fileHash(join(projectRoot, f))]),
      ),
    });
  }

  console.log(`\n✅ wk-ui ${subcommand} 完成！\n`);
  printInstallSummary({ projectRoot, mode, editor });
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

if (subcommand === "diff") {
  const { values } = parseArgs({
    args: rawArgs,
    options: { project: { type: "string", default: "." } },
    strict: false,
  });
  runDiff(resolve(values.project));
  process.exit(0);
}

if (subcommand === "clean") {
  const { values } = parseArgs({
    args: rawArgs,
    options: {
      project: { type: "string", default: "." },
      "dry-run": { type: "boolean", default: false },
    },
    strict: false,
  });
  runClean(resolve(values.project), values["dry-run"]);
  process.exit(0);
}

if (subcommand === "doctor") {
  const { values } = parseArgs({
    args: rawArgs,
    options: { project: { type: "string", default: "." } },
    strict: false,
  });
  runDoctor(resolve(values.project));
  process.exit(0);
}

if (subcommand === "prompts") {
  console.log(triggerPrompts());
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
  if (existsSync(join(projectRoot, "CLAUDE.md"))) return "claude-code";
  if (existsSync(join(projectRoot, ".clinerules"))) return "cline";
  if (existsSync(join(projectRoot, "AGENTS.md"))) return "agents-generic";
  if (existsSync(join(projectRoot, ".qoder"))) return "qoder";
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
    "_meta",
    "_compat",
    "headers",
    `${editorHeaderName(editor)}.txt`,
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
    console.log("  [skin mode] 已过滤掉 runtime/ 和 layouts/ 类 skill");
  }

  let count = 0;
  const installedFiles = [];
  if (target.singleFile) {
    const outPath = join(projectRoot, target.singleFile);
    const transformed = skills
      .map((skill) => transformForEditor(skill.content, editor))
      .join("\n\n---\n\n");

    if (dryRun) {
      console.log(`  [dry-run] 写入 ${relative(projectRoot, outPath)}`);
    } else {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, transformed, "utf8");
      console.log(`  ✔ 写入 ${relative(projectRoot, outPath)}`);
    }
    installedFiles.push(relative(projectRoot, outPath).replace(/\\/g, "/"));
    count = skills.length;
  } else {
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
      installedFiles.push(relative(projectRoot, outPath).replace(/\\/g, "/"));
      count++;
    }
  }

  console.log(`\n  共安装 ${count} 个 Skill 文件\n`);
  return installedFiles;
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
      console.log(`  ✅ tokens 已存在 → ${relative(projectRoot, htmlFile)}`);
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

function editorHeaderName(editor) {
  return (
    {
      cursor: "cursor-mdc",
      "github-copilot": "github-copilot",
      windsurf: "windsurf",
      kiro: "kiro",
      trae: "trae",
      "claude-code": "claude-code",
      cline: "cline",
      "agents-generic": "agents",
      qoder: "qoder",
    }[editor] || editor
  );
}

function installSupportFiles({ projectRoot, dryRun }) {
  const files = [
    {
      rel: ".github/wk-skills-ui/TRIGGER_PROMPTS.md",
      content: triggerPrompts(),
    },
    {
      rel: ".github/wk-skills-ui/README.md",
      content: installReadme(),
    },
    {
      rel: ".mcp.json",
      content: mergeMcpConfig(projectRoot),
    },
  ];
  const installed = [];
  for (const f of files) {
    const outPath = join(projectRoot, f.rel);
    if (dryRun) {
      console.log(`  [dry-run] 写入 ${f.rel}`);
    } else {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, f.content, "utf8");
      console.log(`  ✔ 写入 ${f.rel}`);
    }
    installed.push(f.rel);
  }
  return installed;
}

function triggerPrompts() {
  return `# wk-skills-ui Skill 触发提示

## 核心原则

- wk-skills-ui 优先保证样式绝对管控，覆盖纯 Element Plus、老项目封装、Base*/jh*/C_* 以及 wl-skills-kit 最佳写法
- 不管是否使用 wl-skills-kit，wk-skills-ui 都要先保证视觉统一，再按需引导规范化重构

## 组合流程

- 新项目：用 wk-ui 的 new-project-init 流程接入统一 UI 风格
- 老项目：用 wk-ui 的 legacy-skin-align 流程做老项目化妆对齐
- 全量审计：用 wk-ui 的 full-audit 流程扫描当前项目，不修改代码
- 渐进迁移：用 wk-ui 的 progressive-migrate 流程从 skin 迁移到 runtime

## 智能触发

- 用户说"样式乱 / 不统一 / 老项目化妆"：先调用 wks_ui_route_intent，再调用 wks_ui_scan --mode skin
- 用户说"卡片 / Tab / 详情 / 树 / 抽屉 / 上传 / 步骤条 / 更多操作"：触发对应 Element Plus 组件族 skill
- 扫描 JSON 返回后：调用 wks_ui_recommend_flow 判断 recommendedFlows、nextActions 和 kitBridge

## 单点触发

- 用 wk-ui 的 vendors/base-table skill 检查当前文件
- 用 wk-ui 的 vendors/jh-components skill 检查当前文件
- 用 wk-ui 的 element/el-table skill 检查当前文件
- 用 wk-ui 的 element 组件族 skill 检查 card/tabs/descriptions/tree/drawer/upload/steps/overlay/navigation/feedback
- 用 wk-ui 的 runtime/design-tokens skill 检查硬编码颜色

## 分工边界

- wk-skills-ui：视觉一致性、化妆层、设计令牌、Runtime 渲染、UI 扫描修复
- wl-skills-kit：编码规范、页面生成、菜单/字典/权限同步、通用 Agent Pipeline

## 执行约束

- 扫描只读，修复前必须等待用户确认
- skin 模式只处理 L0/L1/L2，不改业务布局和 runtime
- fix 前建议先 dry-run 或通过 MCP 调用 wks_ui_fix_dry_run
- 涉及 BaseTable render-type/cid、renderOps 或页面结构规范时，视觉统一后再桥接 wl-skills-kit validate-page / doctor-ui
`;
}

function installReadme() {
  return `# wk-skills-ui 已安装

- 触发提示：.github/wk-skills-ui/TRIGGER_PROMPTS.md
- MCP Server：wk-skills-ui
- 更新命令：npx wk-ui update

wl-skills-kit 可选安装，两者分工独立、不强耦合。
`;
}

function mergeMcpConfig(projectRoot) {
  const mcpPath = join(projectRoot, ".mcp.json");
  let config = { mcpServers: {} };
  if (existsSync(mcpPath)) {
    try {
      config = JSON.parse(readFileSync(mcpPath, "utf8"));
      if (!config.mcpServers) config.mcpServers = {};
    } catch {
      config = { mcpServers: {} };
    }
  }
  config.mcpServers["wk-skills-ui"] = {
    command: "node",
    args: ["node_modules/@agile-team/wk-skills-ui/mcp/server.js"],
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function readManifest(projectRoot) {
  const manifestPath = join(projectRoot, MANIFEST_NAME);
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function writeManifest(projectRoot, data) {
  writeFileSync(
    join(projectRoot, MANIFEST_NAME),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function fileHash(filePath) {
  if (!existsSync(filePath)) return "";
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function runDiff(projectRoot) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    console.log(
      `\n[wk-ui diff] 未找到 ${MANIFEST_NAME}，请先执行 wk-ui init。\n`,
    );
    return;
  }
  const changed = [];
  const missing = [];
  const same = [];
  for (const [rel, hash] of Object.entries(manifest.files || {})) {
    const full = join(projectRoot, rel);
    if (!existsSync(full)) missing.push(rel);
    else if (fileHash(full) !== hash) changed.push(rel);
    else same.push(rel);
  }
  console.log(`\n[wk-ui diff] manifest: v${manifest.version}`);
  console.log(`缺失: ${missing.length}`);
  console.log(`内容不同: ${changed.length}`);
  console.log(`相同: ${same.length}\n`);
  printList("缺失文件", missing);
  printList("内容不同", changed);
}

function runClean(projectRoot, dryRun) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    console.log(`\n[wk-ui clean] 未找到 ${MANIFEST_NAME}，无需清理。\n`);
    return;
  }
  const files = Object.keys(manifest.files || {});
  for (const rel of files) {
    const full = join(projectRoot, rel);
    if (!existsSync(full)) continue;
    if (dryRun) console.log(`  删除 ${rel}`);
    else rmSync(full, { force: true });
  }
  if (!dryRun && existsSync(join(projectRoot, MANIFEST_NAME)))
    unlinkSync(join(projectRoot, MANIFEST_NAME));
  console.log(
    dryRun
      ? "\n[DRY-RUN] 未实际删除。\n"
      : `\n✅ 已清理 ${files.length} 个安装文件。\n`,
  );
}

function runDoctor(projectRoot) {
  const pkgPath = join(projectRoot, "package.json");
  let pkg = null;
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      pkg = null;
    }
  }
  const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};
  console.log("\n[wk-ui doctor]\n");
  console.log(`${pkg ? "✔" : "⚠"} package.json — ${pkg ? "存在" : "缺失"}`);
  console.log(
    `${readManifest(projectRoot) ? "✔" : "⚠"} wk-skills-ui manifest — ${readManifest(projectRoot)?.version || "未安装"}`,
  );
  console.log(
    `${existsSync(join(projectRoot, ".mcp.json")) ? "✔" : "⚠"} MCP config — .mcp.json`,
  );
  console.log(
    `${deps["@agile-team/wl-skills-kit"] || existsSync(join(projectRoot, ".wl-skills-manifest.json")) ? "✔" : "ℹ"} wl-skills-kit bridge — 可选，不强耦合`,
  );
  console.log(
    `${hasGitStandards(projectRoot, pkg) ? "✔" : "⚠"} git-standards — 建议接入 @robot-admin/git-standards\n`,
  );
}

function hasGitStandards(projectRoot, pkg) {
  return Boolean(
    existsSync(join(projectRoot, "eslint.config.ts")) ||
    existsSync(join(projectRoot, ".prettierrc.js")) ||
    existsSync(join(projectRoot, ".husky")) ||
    pkg?.scripts?.["standards:init"],
  );
}

function printInstallSummary({ projectRoot, mode, editor }) {
  console.log("已安装能力：");
  console.log(`  - 编辑器规则：${editor}`);
  console.log(
    `  - UI Skill：${mode === "skin" ? "skin 模式" : "native 全量模式"}`,
  );
  console.log("  - MCP：wk-skills-ui");
  console.log("  - 触发提示：.github/wk-skills-ui/TRIGGER_PROMPTS.md");
  if (existsSync(join(projectRoot, ".wl-skills-manifest.json"))) {
    console.log("  - 桥接提醒：检测到 wl-skills-kit，两包独立分工，可组合使用");
  } else {
    console.log(
      "  - 桥接提醒：如需编码规范/页面生成/菜单字典权限，可选安装 wl-skills-kit",
    );
  }
  if (!hasGitStandards(projectRoot, null)) {
    console.log("  - 规范插件：建议执行 npx @robot-admin/git-standards init");
  }
}

function printList(title, list) {
  if (!list.length) return;
  console.log(`${title}:`);
  for (const item of list) console.log(`  - ${item}`);
  console.log("");
}

// ── 帮助信息 ──────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
wk-ui — @agile-team/wk-skills-ui 统一 CLI v${PKG.version}

用法：
  wk-ui init   [--project <path>] [--editor <editor>] [--mode native|skin]
                [--dry-run] [--skills-only]
                把 skills/ 写入目标项目的 AI 编辑器规则目录
  wk-ui update [--project <path>] [--force] [--dry-run]
                增量更新 skills / MCP / 触发提示
  wk-ui diff   [--project <path>]
                对比已安装文件与 manifest
  wk-ui clean  [--project <path>] [--dry-run]
                清理 wk-skills-ui 安装文件
  wk-ui doctor [--project <path>]
                检查安装状态 / MCP / 桥接 / 规范插件
  wk-ui prompts
                打印 AI 触发提示词

  wk-ui scan   --target <src> [--layer L0,L1,L2] [--vendor base-table,jh]
                              [--mode skin|native] [--outFile report.md]
                              [--exempt <config.json>]
  wk-ui check  --project <项目根目录>
  wk-ui fix    --target <src目录> [--dry-run] [--no-snapshot]
  wk-ui all    --project <项目根目录> [--outFile report.md]

  wk-ui snapshot list     [--project .]           列出所有快照
  wk-ui snapshot rollback [--id <id>] [--dry-run]  回退到快照（默认最新）
  wk-ui snapshot diff     [--id <id>]              查看快照与当前差异
  wk-ui snapshot clean    [--keep <N>]             清理旧快照

  wk-ui add-preset <name>   脚手架一个新的业务预设文件

参数：
  --project       项目根目录（默认 .）
  --editor        指定编辑器：github-copilot | cursor | windsurf | kiro | trae | claude-code | cline | agents-generic | qoder
  --mode          init: native(默认,完整接入) | skin(化妆,老项目)
                  scan: skin(只看L0/L1/L2) | native(全量)
  --layer         scan 过滤：L0/L1/L2/L3/L4（逗号分隔）
  --vendor        scan 过滤：element/base-table/jh-components/...（逗号分隔）
  --exempt        豁免配置文件路径（默认 .wk-exempt.json）
  --dry-run       预览模式，不实际写入文件
  --no-snapshot   fix 时跳过快照创建
  --skills-only   仅安装 skill 文件，不处理 index.html
  --force         update 时强制覆盖同版本安装

示例：
  npx wk-ui init
  npx wk-ui update --force
  npx wk-ui doctor
  npx wk-ui prompts
  npx wk-ui init --mode skin --project /path/to/legacy-project
  npx wk-ui scan --target src --mode skin --outFile report.md
  npx wk-ui scan --target src --layer L0,L1
  npx wk-ui fix --target src                     # 自动创建快照 + 修复
  npx wk-ui snapshot rollback                     # 一键回退最近修复
  npx wk-ui add-preset my-biz

规范插件：
  npx @robot-admin/git-standards init
`);
}
