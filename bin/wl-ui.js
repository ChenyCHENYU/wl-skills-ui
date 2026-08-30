#!/usr/bin/env node
/**
 * wl-ui — wl-skills-ui 统一 CLI
 *
 * 子命令：
 *   wl-ui init   [--project <path>] [--editor <editor|all>] [--dry-run]
 *                把 skills/ 写入目标项目的 AI 编辑器规则目录
 *   wl-ui scan   → 委托给 scanner/index.mjs
 *   wl-ui check  → 委托给 scanner/index.mjs
 *   wl-ui fix    → 委托给 scanner/index.mjs
 *   wl-ui all    → 委托给 scanner/index.mjs
 *   wl-ui audit/drift/exempt/snapshot → 委托给 scanner/index.mjs
 *
 * 向后兼容：wl-scan 仍可用（直接调用 scanner/index.mjs）
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
import { join, resolve, dirname, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { getRule, listRules } from "../standards/rules-loader.mjs";
import {
  listProfiles,
  resolveProjectProfile,
} from "../standards/profiles-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const PKG = require("../package.json");
const MANIFEST_NAME = ".wl-skills-ui-manifest.json";
const MANAGED_BLOCK_START = "<!-- wl-skills-ui:begin -->";
const MANAGED_BLOCK_END = "<!-- wl-skills-ui:end -->";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 常量
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const EDITOR_TARGETS = loadEditorTargets();
const EDITOR_IDS = Object.keys(EDITOR_TARGETS);

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
  "audit",
  "check",
  "fix",
  "all",
  "add-preset",
  "add-vendor",
  "snapshot",
  "drift",
  "exempt",
  "contract",
  "rules",
  "profiles",
]);
let subcommand = "help";

if (rawArgs.length > 0 && SUBCOMMANDS.has(rawArgs[0])) {
  subcommand = rawArgs.shift();
} else if (rawArgs.length === 0) {
  subcommand = "help";
} else if (["--help", "-h", "--version", "-v"].includes(rawArgs[0])) {
  subcommand = "help";
} else {
  console.error(`[wl-ui] 未知命令：${rawArgs[0]}`);
  console.error("运行 wl-ui --help 查看可用命令。");
  process.exit(1);
}

// 非 init 子命令：直接委托给 scanner/index.mjs
const SCANNER_CMDS = new Set([
  "scan",
  "audit",
  "check",
  "fix",
  "all",
  "snapshot",
  "drift",
  "exempt",
]);
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

if (subcommand === "contract") {
  const contractBin = join(PKG_ROOT, "scanner", "contract-cli.mjs");
  try {
    execFileSync(process.execPath, [contractBin, ...rawArgs], {
      stdio: "inherit",
    });
  } catch (error) {
    process.exit(error.status ?? 1);
  }
  process.exit(0);
}

if (subcommand === "rules") {
  const action = rawArgs[0] || "list";
  if (action === "describe") {
    const rule = getRule(String(rawArgs[1] || "").toUpperCase());
    if (!rule) {
      console.error(`[wl-ui rules] 未找到规则：${rawArgs[1] || "(empty)"}`);
      process.exit(1);
    }
    console.log(JSON.stringify(rule, null, 2));
  } else {
    console.log(
      JSON.stringify(
        listRules().map(({ id, category, severity, title, autoFixable }) => ({
          id,
          category,
          severity,
          title,
          autoFixable,
        })),
        null,
        2,
      ),
    );
  }
  process.exit(0);
}

if (subcommand === "profiles") {
  console.log(JSON.stringify(listProfiles(), null, 2));
  process.exit(0);
}

// ── help ──────────────────────────────────────────────────────────────────────
if (
  subcommand === "help" ||
  rawArgs.includes("--help") ||
  rawArgs.includes("-h")
) {
  if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
    console.log(PKG.version);
    process.exit(0);
  }
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
      mode: { type: "string", default: "" }, // compatibility alias
      profile: { type: "string", default: "" },
      "dry-run": { type: "boolean", default: false },
      "skills-only": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
    strict: false,
  });

  const projectRoot = resolve(values.project);
  const dryRun = values["dry-run"];
  const skillsOnly = values["skills-only"];
  const profileResolution = resolveProjectProfile({
    projectRoot,
    profile: values.profile || undefined,
    mode: values.mode || undefined,
  });
  const profile = profileResolution.profile;
  const mode = profile.mode;

  const manifest = readManifest(projectRoot);
  if (
    subcommand === "update" &&
    manifest?.version === PKG.version &&
    !values.force
  ) {
    console.log(
      `\n[wl-ui update] 当前项目已安装 v${PKG.version}，无需重复操作。`,
    );
    console.log("如需强制更新：npx wl-ui update --force\n");
    process.exit(0);
  }

  console.log(`\n[wl-ui ${subcommand}] 目标项目：${projectRoot}`);
  console.log(
    `[wl-ui ${subcommand}] 模式：${mode === "skin" ? "化妆 (skin)" : "原生 (native)"}`,
  );
  console.log(
    `[wl-ui ${subcommand}] Profile：${profile.id} (${profileResolution.source})`,
  );
  if (dryRun)
    console.log(`[wl-ui ${subcommand}] DRY-RUN 模式：不实际写入文件\n`);

  // 1. 检测编辑器
  const editors = resolveEditorsForInstall({
    projectRoot,
    subcommand,
    requestedEditor: values.editor,
    manifest,
  });
  console.log(`[wl-ui ${subcommand}] 目标编辑器：${editors.join(", ")}\n`);

  // 2. 安装 skills（按 mode 过滤）
  const installedFiles = [];
  for (const editor of editors) {
    installedFiles.push(
      ...installSkills({ projectRoot, editor, mode, profile, dryRun }),
    );
  }
  installedFiles.push(...installSupportFiles({ projectRoot, dryRun }));
  installedFiles.push(
    ...installProfileConfig({
      projectRoot,
      profile,
      source: profileResolution.source,
      owned: Boolean(manifest?.files?.[".wl-ui-profile.json"]),
      dryRun,
    }),
  );

  // 3. 安装接入配置（非 --skills-only 时）
  if (!skillsOnly) {
    installStyleSetup({ projectRoot, mode, profile, dryRun });
  }

  if (!dryRun) {
    const managedSingleFiles = editors
      .map((editor) => EDITOR_TARGETS[editor]?.singleFile)
      .filter(Boolean);
    writeManifest(projectRoot, {
      version: PKG.version,
      editor: editors.join(","),
      editors,
      mode,
      profile: profile.id,
      installedAt: new Date().toISOString(),
      files: Object.fromEntries(
        installedFiles.map((f) => [f, fileHash(join(projectRoot, f))]),
      ),
      managedBlocks: Object.fromEntries(
        managedSingleFiles.map((file) => [
          file,
          contentHash(extractManagedBlock(readFileSync(join(projectRoot, file), "utf8"))),
        ]),
      ),
      managedJson: installedFiles.includes(".mcp.json")
        ? {
            ".mcp.json": contentHash(
              JSON.stringify(
                JSON.parse(readFileSync(join(projectRoot, ".mcp.json"), "utf8"))
                  .mcpServers?.["wl-skills-ui"] || null,
              ),
            ),
          }
        : {},
    });
  }

  console.log(`\n✅ wl-ui ${subcommand} 完成！\n`);
  printInstallSummary({
    projectRoot,
    mode,
    profile: profile.id,
    editor: editors.join(", "),
  });
  console.log("下一步：");
  if (mode === "skin") {
    console.log(`  npx wl-ui scan --target src --profile ${profile.id} --output summary`);
  } else {
    console.log("  npx wl-ui check --project . # 验证接入完整性");
    console.log("  npx wl-ui all   --project . # 完整扫描报告");
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
    options: {
      project: { type: "string", default: "." },
      "print-overrides": { type: "boolean", default: false },
    },
    strict: false,
  });
  if (values["print-overrides"]) {
    await printOverrides(resolve(values.project));
    process.exit(0);
  }
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
      "[wl-ui add-preset] 请提供预设名称，例如：wl-ui add-preset my-biz",
    );
    process.exit(1);
  }
  const { values } = parseArgs({
    args: rawArgs.slice(1),
    options: {
      project: { type: "string", default: "." },
      output: { type: "string", default: "src/wl-ui/presets" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: true,
  });
  scaffoldPreset({
    name: presetName,
    projectRoot: resolve(values.project),
    outputDir: values.output,
    dryRun: values["dry-run"],
  });
  process.exit(0);
}

// ── add-vendor ─────────────────────────────────────────────────────────────────
if (subcommand === "add-vendor") {
  const tag = rawArgs[0];
  if (!tag) {
    console.error(
      "[wl-ui add-vendor] 请提供 vendor 标签名，例如：wl-ui add-vendor jh-upload --family jh",
    );
    process.exit(1);
  }
  const { values } = parseArgs({
    args: rawArgs.slice(1),
    options: {
      family: { type: "string", default: "" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: false,
  });
  const family = values.family || inferVendorFamily(tag);
  scaffoldVendor({ tag, family, dryRun: values["dry-run"] });
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

function loadEditorTargets() {
  const configPath = join(
    PKG_ROOT,
    "skills",
    "_meta",
    "_compat",
    "editors.json",
  );
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  return Object.fromEntries(
    config.editors.map((editor) => [
      editor.id,
      {
        dir: normalizeInstallDir(editor.installPath),
        ext: editor.ext || ".md",
        singleFile: editor.singleFile,
        headerFile: editor.headerFile,
      },
    ]),
  );
}

function normalizeInstallDir(installPath) {
  const normalized = installPath.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized === "." || normalized === "" ? "." : normalized;
}

function detectInstalledEditors(projectRoot) {
  return EDITOR_IDS.filter((editor) => {
    const target = EDITOR_TARGETS[editor];
    if (target.singleFile)
      return existsSync(join(projectRoot, target.singleFile));
    return existsSync(join(projectRoot, target.dir));
  });
}

function normalizeManifestEditors(manifest) {
  if (Array.isArray(manifest?.editors)) return manifest.editors;
  if (typeof manifest?.editor === "string") {
    return manifest.editor
      .split(",")
      .map((editor) => editor.trim())
      .filter(Boolean);
  }
  return [];
}

function uniqueValidEditors(editors) {
  return [...new Set(editors)].filter((editor) => EDITOR_TARGETS[editor]);
}

function resolveEditorsForInstall({
  projectRoot,
  subcommand,
  requestedEditor,
  manifest,
}) {
  if (requestedEditor) {
    if (requestedEditor === "all") return EDITOR_IDS;
    const editors = uniqueValidEditors(
      requestedEditor.split(",").map((editor) => editor.trim()),
    );
    if (editors.length > 0) return editors;
    console.error(`[wl-ui ${subcommand}] 不支持的编辑器：${requestedEditor}`);
    console.error(`支持：${EDITOR_IDS.join(" | ")} | all`);
    process.exit(1);
  }

  if (subcommand === "update") {
    const editors = uniqueValidEditors([
      ...normalizeManifestEditors(manifest),
      ...detectInstalledEditors(projectRoot),
    ]);
    if (editors.length > 0) return editors;
  }

  return [detectEditor(projectRoot)];
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
  const target = EDITOR_TARGETS[editor];
  const headerFile = target?.headerFile;
  const headerPath = join(
    PKG_ROOT,
    "skills",
    "_meta",
    "_compat",
    headerFile || join("headers", `${editor}.txt`),
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
function installSkills({ projectRoot, editor, mode = "native", profile, dryRun }) {
  const target = EDITOR_TARGETS[editor] || EDITOR_TARGETS["github-copilot"];
  const targetDir = join(projectRoot, target.dir);
  const skillsDir = join(PKG_ROOT, "skills");

  console.log(`[wl-ui init] 安装 Skills → ${target.dir}`);

  let skills = collectSkills(skillsDir);

  // skin 模式：过滤掉 runtime/ 和 layouts/ （避免干扰老项目布局）
  if (mode === "skin") {
    skills = skills.filter(
      (s) => !s.path.startsWith("runtime/") && !s.path.startsWith("layouts/"),
    );
    console.log("  [skin mode] 已过滤掉 runtime/ 和 layouts/ 类 skill");
  }
  const vendorAdapter = {
    "vendors/ag-grid": "ag-grid",
    "vendors/base-table": "base",
    "vendors/jh-components": "jh",
    "vendors/c-components": "c",
    "vendors/custom-wrappers": "custom",
    "vendors/unknown-wrapper": "custom",
  };
  const adapters = new Set(profile?.adapters || []);
  skills = skills.filter((skill) => {
    const adapter = vendorAdapter[skill.path];
    return !adapter || adapters.has(adapter);
  });

  let count = 0;
  const installedFiles = [];
  if (target.singleFile) {
    const outPath = join(projectRoot, target.singleFile);
    const managedBlock = buildSingleFileRouter(skills, profile);
    const existing = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
    const legacyHeader = target.headerFile
      ? readFileSync(join(skillsDir, "_meta", "_compat", target.headerFile), "utf8").trim()
      : "";
    const legacyGenerated =
      legacyHeader &&
      existing.trimStart().startsWith(legacyHeader) &&
      !existing.includes(MANAGED_BLOCK_START);
    const transformed = legacyGenerated
      ? `${managedBlock}\n`
      : upsertManagedBlock(existing, managedBlock);

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

function buildSingleFileRouter(skills, profile) {
  const lines = [
    MANAGED_BLOCK_START,
    "# wl-skills-ui managed router",
    "",
    "> Managed by `npx wl-ui update`. Keep project-specific instructions outside this block.",
    `> Active profile: \`${profile?.id || "native-element"}\`.`,
    "",
    "Use the package router first, then open only the relevant Skill:",
    "",
    "- `node_modules/@agile-team/wl-skills-ui/SKILL.md`",
    "",
    "Available Skills:",
    "",
  ];
  for (const skill of skills.sort((a, b) => a.path.localeCompare(b.path))) {
    const description = parseSkillFrontmatter(skill.content).description
      .replace(/\s+/g, " ")
      .slice(0, 120);
    lines.push(
      `- \`${skill.path}\`: ${description || "Open when this capability matches the task."} ` +
        `([source](node_modules/@agile-team/wl-skills-ui/skills/${skill.path}/SKILL.md))`,
    );
  }
  lines.push(MANAGED_BLOCK_END);
  return lines.join("\n");
}

function extractManagedBlock(content) {
  const start = content.indexOf(MANAGED_BLOCK_START);
  const end = content.indexOf(MANAGED_BLOCK_END, start);
  if (start < 0 || end < 0) return "";
  return content.slice(start, end + MANAGED_BLOCK_END.length);
}

function upsertManagedBlock(existing, block) {
  const current = extractManagedBlock(existing);
  if (current) return `${existing.replace(current, block).trimEnd()}\n`;
  const prefix = existing.trimEnd();
  return `${prefix ? `${prefix}\n\n` : ""}${block}\n`;
}

function removeManagedBlock(content) {
  const block = extractManagedBlock(content);
  if (!block) return content;
  const remaining = content.replace(block, "").trim();
  return remaining ? `${remaining}\n` : "";
}

function installProfileConfig({ projectRoot, profile, source, owned, dryRun }) {
  const rel = ".wl-ui-profile.json";
  const outPath = join(projectRoot, rel);
  if (existsSync(outPath)) {
    let config;
    try {
      config = JSON.parse(readFileSync(outPath, "utf8"));
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new TypeError("root must be an object");
      }
    } catch {
      console.warn(`  ⚠ 跳过 ${rel}：现有文件不是有效 JSON，未覆盖用户内容`);
      return [];
    }
    if (config.profile !== profile.id && ["argument", "mode"].includes(source)) {
      const updated = `${JSON.stringify({ ...config, schema: 1, profile: profile.id }, null, 2)}\n`;
      if (dryRun) console.log(`  [dry-run] 更新 ${rel} → ${profile.id}`);
      else {
        writeFileSync(outPath, updated, "utf8");
        console.log(`  ✔ 更新 ${rel} → ${profile.id}`);
      }
    }
    return owned ? [rel] : [];
  }
  if (dryRun) {
    console.log(`  [dry-run] 写入 ${rel}`);
  } else {
    writeFileSync(
      outPath,
      `${JSON.stringify({ schema: 1, profile: profile.id }, null, 2)}\n`,
      "utf8",
    );
    console.log(`  ✔ 写入 ${rel}`);
  }
  return [rel];
}

/** 接入配置引导（tokens.css + styles import）按 mode 推荐不同 presets */
function installStyleSetup({ projectRoot, mode = "native", profile, dryRun }) {
  console.log("[wl-ui init] 检查样式接入配置...\n");

  const tokensHref =
    "/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css";
  const stylesEntry = `@agile-team/wl-skills-ui/${
    profile?.stylePreset || "styles/presets/native-element"
  }`;

  // 检查 index.html
  const htmlFiles = [
    join(projectRoot, "index.html"),
    join(projectRoot, "public", "index.html"),
  ].filter((f) => existsSync(f));

  for (const htmlFile of htmlFiles) {
    const content = readFileSync(htmlFile, "utf8");
    if (!content.includes("tokens") && !content.includes("wl-skills-ui")) {
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
     import '@agile-team/wl-skills-ui/${profile?.runtimePreset || "runtime/profiles/native-element"}';
`
    : `
  ⚠️  请手动在 src/main.ts 添加包级保护（不接管页面布局 / 业务列定义）：
     import '@agile-team/wl-skills-ui/${profile?.runtimePreset || "runtime/profiles/legacy-jh-element"}';
`
}`);
}

/** 脚手架新预设文件 */
function scaffoldPreset({ name, projectRoot, outputDir, dryRun }) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error("[wl-ui add-preset] 名称必须是小写 kebab-case");
    process.exit(1);
  }
  const outPath = resolve(projectRoot, outputDir, `${name}.ts`);
  const relPath = relative(projectRoot, outPath);
  if (relPath.startsWith("..") || isAbsolute(relPath)) {
    console.error("[wl-ui add-preset] 输出目录必须位于目标项目内");
    process.exit(1);
  }
  if (existsSync(outPath)) {
    console.error(`[wl-ui add-preset] 文件已存在：${outPath}`);
    process.exit(1);
  }
  const symbol = toPascalCase(name);
  const template = `/**
 * ${relPath.replace(/\\/g, "/")} — ${name} 业务预设
 * 使用：import { install${symbol}Preset } from '@/wl-ui/presets/${name}';
 */
import type { TagMapItem } from '@agile-team/wl-skills-ui/runtime';
import { registerColumnAutoMaps, renderTagNode } from '@agile-team/wl-skills-ui/runtime';

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
export function install${symbol}Preset(): void {
  registerColumnAutoMaps({
    myStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderMyStatus(row.myStatus),
    },
  });
}
`;
  if (dryRun) {
    console.log(`[wl-ui add-preset] [DRY-RUN] 将创建：${outPath}`);
    return;
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, template, "utf8");
  console.log(`[wl-ui add-preset] ✔ 创建预设文件：${outPath}`);
  console.log(`  在 main.ts 中引入并调用：install${symbol}Preset()`);
}

function toPascalCase(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** 根据 tag 名推断 vendor family（jh / base / c / ag-grid / custom） */
function inferVendorFamily(tag) {
  if (/^jh-/i.test(tag)) return "jh";
  if (/^Base[A-Z]|^base-/.test(tag)) return "base";
  if (/^C_|^c-/.test(tag)) return "c";
  if (/ag[-_]?grid/i.test(tag)) return "ag-grid";
  return "custom";
}

/** 脚手架新 vendor 专项覆盖：生成 SCSS、scanner 规则草稿、Skill 基线追加 */
function scaffoldVendor({ tag, family, dryRun }) {
  const safe = tag.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  const VENDORS_JSON = join(
    PKG_ROOT,
    "skills",
    "_meta",
    "_compat",
    "vendors.json",
  );
  const SCSS_PATH = join(PKG_ROOT, "styles", "vendors", `_${safe}.scss`);
  const VENDORS_INDEX = join(PKG_ROOT, "styles", "vendors", "index.scss");
  const SKILL_DIR = join(
    PKG_ROOT,
    "skills",
    "vendors",
    family === "jh" ? "jh-components" : `${family}-components`,
  );
  const SKILL_FILE = join(SKILL_DIR, "SKILL.md");

  const actions = [];

  // 1) SCSS 模板
  if (existsSync(SCSS_PATH)) {
    console.warn(`[wl-ui add-vendor] 已存在，跳过：${SCSS_PATH}`);
  } else {
    const scss = `// styles/vendors/_${safe}.scss — ${tag} 专项视觉覆盖
// family: ${family}
//
// 准入条件（详见 standards/architecture/01-layer-boundaries.md）：
//   - 复杂 DOM / 多 Element Plus 组合
//   - 默认样式偏离 tokens（颜色/间距/圆角/密度）
//   - 高频出现于核心页面
//   - scanner 反复反馈或 AI 修复不稳定
//
// 约束：
//   - 仅使用 design/tokens/base.css 中的 CSS 变量
//   - 不写死颜色/间距/圆角；不污染全局选择器
//   - 选择器范围必须收敛到 .${safe}__root 或 ${tag} 标签

.${safe},
${tag} {
  // TODO: 用 var(--el-*) / var(--wl-*) tokens 替换硬编码
}
`;
    actions.push({ type: "create", path: SCSS_PATH, content: scss });
  }

  // 2) styles/vendors/index.scss 追加 @forward
  const idx = readFileSync(VENDORS_INDEX, "utf8");
  if (!idx.includes(`'./_${safe}'`) && !idx.includes(`"./_${safe}"`)) {
    const insertLine = `@forward './_${safe}';            // ${tag} 专项覆盖（${family}）\n`;
    const anchor = "@forward './_base-table';";
    const next = idx.includes(anchor)
      ? idx.replace(anchor, insertLine + anchor)
      : idx + "\n" + insertLine;
    actions.push({ type: "update", path: VENDORS_INDEX, content: next });
  }

  // 3) vendors.json baseline 追加
  const reg = JSON.parse(readFileSync(VENDORS_JSON, "utf8"));
  const entry = reg.vendors.find((v) => v.id === family);
  if (entry && !entry.baseline.includes(tag)) {
    entry.baseline.push(tag);
    if (!entry.styles.includes(`_${safe}.scss`))
      entry.styles.push(`_${safe}.scss`);
    actions.push({
      type: "update",
      path: VENDORS_JSON,
      content: JSON.stringify(reg, null, 2) + "\n",
    });
  }

  // 4) Skill 文档代表性基线追加（仅 jh family 自动追加，其它给提示）
  if (family === "jh" && existsSync(SKILL_FILE)) {
    const skill = readFileSync(SKILL_FILE, "utf8");
    if (!skill.includes(tag)) {
      const hint = `\n<!-- add-vendor: 建议在「代表性基线」表中补充一行 ${tag} -->\n`;
      actions.push({ type: "update", path: SKILL_FILE, content: skill + hint });
    }
  }

  // 5) scanner 规则草稿（仅生成模板，不强制注册）
  const RULE_PATH = join(
    PKG_ROOT,
    "scanner",
    "rules",
    `vendor-${safe}.draft.mjs`,
  );
  if (!existsSync(RULE_PATH)) {
    const rule = `/**
 * scanner/rules/vendor-${safe}.draft.mjs — ${tag} 专项规则草稿
 *
 * 启用方式：
 *   1) 改名为 vendor-${safe}.mjs
 *   2) 在 scanner/rules/index.mjs 中 import 并 push 到 BUILT_IN_RULES
 */
export const ${safe.replace(/-/g, "_")}Rules = [
  {
    id: "V-${safe.toUpperCase()}-001",
    category: "vendor",
    severity: "warning",
    description: "${tag} 视觉应统一覆盖到 tokens（草稿规则）",
    check(ctx) {
      // ctx: { file, content, addIssue(...) }
      // TODO: 实现检测逻辑
      return [];
    },
  },
];
`;
    actions.push({ type: "create", path: RULE_PATH, content: rule });
  }

  // 执行 / 预览
  for (const act of actions) {
    const rel = relative(PKG_ROOT, act.path).replace(/\\/g, "/");
    if (dryRun) {
      console.log(`[dry-run] ${act.type}: ${rel}`);
    } else {
      writeFileSync(act.path, act.content, "utf8");
      console.log(`[wl-ui add-vendor] ${act.type}: ${rel}`);
    }
  }
  if (actions.length === 0) {
    console.log("[wl-ui add-vendor] 无变更（已存在）");
  } else if (!dryRun) {
    console.log("\n下一步：");
    console.log(`  1. 编辑 styles/vendors/_${safe}.scss 用 tokens 覆盖样式`);
    console.log("  2. 如需检测规则，把 vendor-*.draft.mjs 改名并在 rules/index.mjs 注册");
    console.log("  3. 运行 npm run docs:check && npm run lint && npm run build");
  }
}

function installSupportFiles({ projectRoot, dryRun }) {
  const mcpConfig = mergeMcpConfig(projectRoot);
  const files = [
    {
      rel: ".github/wl-skills-ui/TRIGGER_PROMPTS.md",
      content: triggerPrompts(),
    },
    {
      rel: ".github/wl-skills-ui/README.md",
      content: installReadme(),
    },
    ...(mcpConfig ? [{ rel: ".mcp.json", content: mcpConfig }] : []),
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
  return `# wl-skills-ui Skill 触发提示

## 核心原则

- wl-skills-ui 按 Profile 组合 Element、Base/jh/C/custom 与可选 AG adapter；不要因 BaseTable 存在而推断 AG Grid
- 不管是否使用 wl-skills-kit，wl-skills-ui 都要先保证视觉统一，再按需引导规范化重构

## 组合流程

- 新项目：用 wl-ui 的 new-project-init 流程接入统一 UI 风格
- 老项目：用 wl-ui 的 legacy-skin-align 流程做老项目化妆对齐
- 全量审计：用 wl-ui 的 full-audit 流程扫描当前项目，不修改代码
- 渐进迁移：用 wl-ui 的 progressive-migrate 流程从 skin 迁移到 runtime

## 智能触发

- 用户说"样式乱 / 不统一 / 老项目化妆"：先调用 wl_ui_route_intent，再用项目 Profile 调用 wl_ui_scan --output summary
- 用户说"卡片 / Tab / 详情 / 树 / 抽屉 / 上传 / 步骤条 / 更多操作"：触发对应 Element Plus 组件族 skill
- summary 返回后先判断 recommendedSkills/next；只有需要逐条明细时再请求 compact-v2 分页

## 单点触发

- 用 wl-ui 的 vendors/base-table skill 检查当前文件
- 用 wl-ui 的 vendors/jh-components skill 检查当前文件
- 用 wl-ui 的 element/el-table skill 检查当前文件
- 用 wl-ui 的 element 组件族 skill 检查 card/tabs/descriptions/tree/drawer/upload/steps/overlay/navigation/feedback
- 用 wl-ui 的 runtime/design-tokens skill 检查硬编码颜色

## 分工边界

- wl-skills-ui：视觉一致性、化妆层、设计令牌、Runtime 渲染、UI 扫描修复
- wl-skills-kit：编码规范、页面生成、菜单/字典/权限同步、通用 Agent Pipeline

## 执行约束

- 扫描只读，修复前必须等待用户确认
- legacy Profile 只处理 L0/L1/L2，不改业务布局；AG 能力只在 legacy-jh-ag 开启
- fix 前必须 dry-run；CLI 应使用同一 profile/only/skip 与 planHash 应用
- 涉及 BaseTable render-type/cid、renderOps 或页面结构规范时，视觉统一后再桥接 wl-skills-kit validate-page / doctor-ui
`;
}

function installReadme() {
  return `# wl-skills-ui 已安装

- 触发提示：.github/wl-skills-ui/TRIGGER_PROMPTS.md
- MCP Server：wl-skills-ui
- Profile：见 .wl-ui-profile.json
- 更新命令：npx wl-ui update

AI 默认先调用 scan summary，只按 recommendedSkills 打开局部 Skill。

wl-skills-kit 可选安装，两者分工独立、不强耦合。
`;
}

function mergeMcpConfig(projectRoot) {
  const mcpPath = join(projectRoot, ".mcp.json");
  let config = { mcpServers: {} };
  if (existsSync(mcpPath)) {
    try {
      config = JSON.parse(readFileSync(mcpPath, "utf8"));
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new TypeError("root must be an object");
      }
      if (
        config.mcpServers != null &&
        (typeof config.mcpServers !== "object" || Array.isArray(config.mcpServers))
      ) {
        throw new TypeError("mcpServers must be an object");
      }
      config.mcpServers ||= {};
    } catch {
      console.warn("  ⚠ 跳过 .mcp.json：现有文件不是有效的 MCP JSON 对象，未覆盖用户内容");
      return null;
    }
  }
  config.mcpServers["wl-skills-ui"] = {
    command: "node",
    args: ["node_modules/@agile-team/wl-skills-ui/mcp/server.js"],
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

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function runDiff(projectRoot) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    console.log(
      `\n[wl-ui diff] 未找到 ${MANIFEST_NAME}，请先执行 wl-ui init。\n`,
    );
    return;
  }
  const changed = [];
  const missing = [];
  const same = [];
  for (const [rel, hash] of Object.entries(manifest.files || {})) {
    const full = join(projectRoot, rel);
    if (!existsSync(full)) missing.push(rel);
    else if (manifest.managedBlocks?.[rel]) {
      const current = extractManagedBlock(readFileSync(full, "utf8"));
      if (contentHash(current) !== manifest.managedBlocks[rel]) changed.push(rel);
      else same.push(rel);
    } else if (manifest.managedJson?.[rel] && rel === ".mcp.json") {
      let current = null;
      try {
        current = JSON.parse(readFileSync(full, "utf8")).mcpServers?.[
          "wl-skills-ui"
        ];
      } catch {
        current = null;
      }
      if (contentHash(JSON.stringify(current || null)) !== manifest.managedJson[rel]) {
        changed.push(rel);
      } else same.push(rel);
    } else if (fileHash(full) !== hash) changed.push(rel);
    else same.push(rel);
  }
  console.log(`\n[wl-ui diff] manifest: v${manifest.version}`);
  console.log(`缺失: ${missing.length}`);
  console.log(`内容不同: ${changed.length}`);
  console.log(`相同: ${same.length}\n`);
  printList("缺失文件", missing);
  printList("内容不同", changed);
}

function runClean(projectRoot, dryRun) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    console.log(`\n[wl-ui clean] 未找到 ${MANIFEST_NAME}，无需清理。\n`);
    return;
  }
  const files = Object.keys(manifest.files || {});
  for (const rel of files) {
    const full = join(projectRoot, rel);
    if (!existsSync(full)) continue;
    if (manifest.managedBlocks?.[rel]) {
      if (dryRun) {
        console.log(`  移除托管区块 ${rel}`);
      } else {
        const remaining = removeManagedBlock(readFileSync(full, "utf8"));
        if (remaining.trim()) writeFileSync(full, remaining, "utf8");
        else rmSync(full, { force: true });
      }
    } else if (rel === ".mcp.json") {
      if (dryRun) {
        console.log(`  移除 MCP 配置项 ${rel}`);
      } else {
        try {
          const config = JSON.parse(readFileSync(full, "utf8"));
          delete config.mcpServers?.["wl-skills-ui"];
          if (config.mcpServers && Object.keys(config.mcpServers).length === 0) {
            delete config.mcpServers;
          }
          if (Object.keys(config).length === 0) rmSync(full, { force: true });
          else writeFileSync(full, `${JSON.stringify(config, null, 2)}\n`, "utf8");
        } catch {
          console.warn(`  跳过无法解析的 ${rel}`);
        }
      }
    } else if (dryRun) console.log(`  删除 ${rel}`);
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

async function printOverrides(projectRoot) {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) {
    console.error(`[wl-ui doctor] 未找到 ${pkgPath}`);
    process.exit(1);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const loader = await import("../skills/_meta/_compat/loader.mjs");
  const vendors = loader.listCompatVendors();
  const evaluations = vendors
    .map((c) => loader.evaluateVendor(c, deps))
    .filter((e) => e.verdict !== "not-applicable");
  if (evaluations.length === 0) {
    console.log(
      "[wl-ui doctor] 当前项目未命中任何 vendor 适配矩阵，无需 overrides",
    );
    return;
  }
  const snippet = loader.buildOverridesSnippet(evaluations);
  if (!snippet) {
    console.log("[wl-ui doctor] 当前项目所有 vendor 配对已命中推荐组合 ✓");
    return;
  }
  console.log(
    "\n[wl-ui doctor --print-overrides] 检测到 vendor 版本偏离，复制以下片段到 package.json：\n",
  );
  console.log("// pnpm");
  console.log(JSON.stringify(snippet.pnpm, null, 2));
  console.log("\n// npm / yarn");
  console.log(JSON.stringify(snippet.npmYarn, null, 2));
  console.log("\n复制后执行：pnpm install（或对应包管理器的 install 命令）\n");
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
  console.log("\n[wl-ui doctor]\n");
  console.log(`${pkg ? "✔" : "⚠"} package.json — ${pkg ? "存在" : "缺失"}`);
  console.log(
    `${readManifest(projectRoot) ? "✔" : "⚠"} wl-skills-ui manifest — ${readManifest(projectRoot)?.version || "未安装"}`,
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

function printInstallSummary({ projectRoot, mode, profile, editor }) {
  console.log("已安装能力：");
  console.log(`  - 编辑器规则：${editor}`);
  console.log(
    `  - UI Skill：${mode === "skin" ? "skin 模式" : "native 全量模式"}`,
  );
  console.log(`  - UI Profile：${profile}`);
  console.log("  - MCP：wl-skills-ui");
  console.log("  - 触发提示：.github/wl-skills-ui/TRIGGER_PROMPTS.md");
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
wl-ui — @agile-team/wl-skills-ui 统一 CLI v${PKG.version}

用法：
  wl-ui init   [--project <path>] [--editor <editor>] [--profile <id>]
                [--dry-run] [--skills-only]
                把 skills/ 写入目标项目的 AI 编辑器规则目录
  wl-ui update [--project <path>] [--editor <editor|all>] [--force] [--dry-run]
                更新已安装编辑器 rules / MCP / 触发提示
  wl-ui diff   [--project <path>]
                对比已安装文件与 manifest
  wl-ui clean  [--project <path>] [--dry-run]
                清理 wl-skills-ui 安装文件
  wl-ui doctor [--project <path>] [--print-overrides]
                检查安装状态 / MCP / 桥接 / 规范插件；
                --print-overrides 时输出 vendor 版本偏离的 pnpm/npm/yarn overrides 修复片段
  wl-ui prompts
                打印 AI 触发提示词

  wl-ui scan   --target <src> [--layer L0,L1,L2] [--vendor base-table,jh]
                              [--profile <id>] [--output summary|compact-v2|json|markdown]
                              [--changed --changed-fallback error|full]
                              [--exempt <config.json>]
  wl-ui audit  --target <src> [--output json] [--refresh-baseline]
                scan 的只读审计别名；可显式刷新项目问题基线
  wl-ui check  --project <项目根目录>
  wl-ui fix    --target <src目录> [--profile <id>] [--only R001,R043]
               [--dry-run] [--plan-hash <hash>] [--no-snapshot]
  wl-ui all    --project <项目根目录> [--outFile report.md]

  wl-ui snapshot list     [--project .]           列出所有快照
  wl-ui snapshot rollback [--id <id>] [--dry-run]  回退到快照（默认最新）
  wl-ui snapshot diff     [--id <id>]              查看快照与当前差异
  wl-ui snapshot clean    [--keep <N>]             清理旧快照
  wl-ui drift --baseline <基线.json> --current <当前.json> [--fail-on-error]
  wl-ui exempt init --project . --target src        生成豁免候选，需人工确认

  wl-ui contract extract --path <page.vue> --domain <domain> [--scenario <name>]
  wl-ui contract validate --input <ui-contract.json>
  wl-ui contract match --input <ui-contract.json> --library <directory>
                提取、校验和匹配不含源码/接口/业务文案的 UI 语义契约

  wl-ui rules list | wl-ui rules describe <R-id>  查询规则事实源
  wl-ui profiles                                   列出能力组合

  wl-ui add-preset <name> [--project .] [--output src/wl-ui/presets] [--dry-run]
                           在消费项目内脚手架业务预设文件
  wl-ui add-vendor <tag> [--family <id>] [--dry-run]
                           脚手架新 vendor 专项覆盖（SCSS + scanner 草稿 + vendors.json 注册）

参数：
  --project       项目根目录（默认 .）
  --editor        指定编辑器：github-copilot | cursor | windsurf | kiro | trae | claude-code | cline | agents-generic | qoder | all
  --profile       native-element | legacy-jh-element | legacy-jh-ag
  --mode          兼容别名；新接入请使用 --profile
  --layer         scan 过滤：L0/L1/L2/L3/L4（逗号分隔）
  --vendor        scan 过滤：element/base-table/jh-components/...（逗号分隔）
  --parser        scan/contract: auto(默认) | fast | sfc
  --exempt        豁免配置文件路径（默认 .wl-exempt.json）
  --dry-run       预览模式，不实际写入文件
  --no-snapshot   fix 时跳过快照创建
  --skills-only   仅安装 skill 文件，不处理 index.html
  --force         update 时强制覆盖同版本安装

示例：
  npx wl-ui init
  npx wl-ui update --force
  npx wl-ui update --editor all --force
  npx wl-ui doctor
  npx wl-ui prompts
  npx wl-ui init --profile legacy-jh-element --project /path/to/legacy-project
  npx wl-ui scan --target src --profile legacy-jh-element --output summary
  npx wl-ui scan --target src --output compact-v2 --limit 50
  npx wl-ui scan --target src --layer L0,L1
  npx wl-ui fix --target src --dry-run --output json
  npx wl-ui snapshot rollback                     # 一键回退最近修复
  npx wl-ui add-preset my-biz

规范插件：
  npx @robot-admin/git-standards init
`);
}
