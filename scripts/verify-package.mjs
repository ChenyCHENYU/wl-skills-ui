import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIXED_RULE_IDS } from "../scanner/fix.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const rulesCatalog = JSON.parse(
  readFileSync(join(root, "standards", "rules.json"), "utf8"),
);
const errors = [];

function requireFile(relPath, label = relPath) {
  if (!existsSync(join(root, relPath))) errors.push(`${label} 不存在：${relPath}`);
}

function verifyVersions() {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  if (!readme.includes(`v${pkg.version}`)) errors.push(`README 未声明 v${pkg.version}`);
  if (!changelog.includes(`[${pkg.version}]`)) errors.push(`CHANGELOG 未声明 ${pkg.version}`);
}

function verifyExports() {
  for (const [name, declaration] of Object.entries(pkg.exports || {})) {
    if (name.includes("*")) continue;
    const targets = typeof declaration === "string" ? [declaration] : Object.values(declaration);
    for (const target of targets) requireFile(target.replace(/^\.\//, ""), `export ${name}`);
  }
  if (pkg.exports?.["./runtime"]?.import !== "./es/index.js") {
    errors.push("./runtime 必须指向已构建的 es/index.js，不能导出包根目录");
  }
}

function verifyRules() {
  const ids = new Set();
  for (const rule of rulesCatalog.rules || []) {
    if (ids.has(rule.id)) errors.push(`规则 ID 重复：${rule.id}`);
    ids.add(rule.id);
    if (rule.scanner) requireFile(rule.scanner, `规则 ${rule.id} scanner`);
    if (!rule.autoFixable && !rule.manualReason && rule.severity !== "suggestion") {
      errors.push(`不可自动修复规则缺少 manualReason：${rule.id}`);
    }
  }
  const declared = (rulesCatalog.rules || [])
    .filter((rule) => rule.autoFixable)
    .map((rule) => rule.id)
    .sort();
  const implemented = [...FIXED_RULE_IDS].sort();
  if (JSON.stringify(declared) !== JSON.stringify(implemented)) {
    errors.push(`autoFixable 与 fixer 实现不一致：catalog=${declared.join(",")} fixer=${implemented.join(",")}`);
  }
}

function verifyPublishAllowlist() {
  if (pkg.files?.includes("scanner")) errors.push("发布白名单不得打包 scanner/__tests__；应只包含 scanner/*.mjs 与 scanner/rules");
  if (pkg.files?.includes("scripts")) errors.push("维护期 scripts 不应进入运行时 npm 包");
}

const CUSTOMER_PRIMARY_TOKENS = {
  "--el-color-primary": "#002a8f",
  "--el-color-primary-rgb": "0, 42, 143",
  "--el-color-primary-light-1": "#1a3f9a",
  "--el-color-primary-light-2": "#3355a5",
  "--el-color-primary-light-3": "#4d6ab1",
  "--el-color-primary-light-4": "#667fbc",
  "--el-color-primary-light-5": "#8094c7",
  "--el-color-primary-light-6": "#99aad2",
  "--el-color-primary-light-7": "#b2bfdd",
  "--el-color-primary-light-8": "#ccd4e9",
  "--el-color-primary-light-9": "#e5eaf4",
  "--el-color-primary-dark-1": "#002681",
  "--el-color-primary-dark-2": "#002272",
  "--el-color-primary-dark-3": "#001d64",
  "--el-color-primary-dark-4": "#001956",
};

function collectFiles(dir, extensions, result = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, extensions, result);
    if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      result.push(full);
    }
  }
  return result;
}

function verifyCustomerTheme() {
  const tokenFiles = [
    "design/tokens/base.css",
    "styles/tokens/index.scss",
    "styles/presets/security.scss",
    "dist/tokens.css",
  ];
  for (const relPath of tokenFiles) {
    const content = readFileSync(join(root, relPath), "utf8").toLowerCase();
    for (const [token, value] of Object.entries(CUSTOMER_PRIMARY_TOKENS)) {
      const declaration = `${token}: ${value};`.toLowerCase();
      if (!content.includes(declaration)) {
        errors.push(`${relPath}: 客户主色 token 漂移，缺少 "${declaration}"`);
      }
    }
  }

  const activeThemeFiles = [
    ...collectFiles(join(root, "design"), [".css", ".md"]),
    ...collectFiles(join(root, "styles"), [".scss"]),
  ];
  const forbidden = [
    /#2254f4/i,
    /#3865f5/i,
    /#5178f6/i,
    /#7a98f8/i,
    /rgba\(\s*34\s*,\s*84\s*,\s*244\s*,/i,
    /rgba\(\s*122\s*,\s*152\s*,\s*248\s*,/i,
  ];
  for (const file of activeThemeFiles) {
    const content = readFileSync(file, "utf8");
    if (forbidden.some((pattern) => pattern.test(content))) {
      errors.push(`${file.slice(root.length + 1)}: 活跃主题源残留旧亮蓝色阶`);
    }
  }

  const button = readFileSync(join(root, "styles/element/_button.scss"), "utf8");
  for (const required of [
    "var(--el-color-primary-light-1)",
    "var(--el-color-primary-dark-1)",
    "var(--el-color-primary-light-7)",
    "!important",
  ]) {
    if (!button.includes(required)) {
      errors.push(`styles/element/_button.scss: 主按钮强覆盖缺少 ${required}`);
    }
  }

  const toolbar = readFileSync(
    join(root, "styles/vendors/_base-query-toolbar.scss"),
    "utf8",
  );
  if (!toolbar.includes("var(--el-color-primary-light-1, #1a3f9a)")) {
    errors.push("styles/vendors/_base-query-toolbar.scss: 主按钮 hover 未使用客户规范 light-1");
  }
}

verifyVersions();
verifyExports();
verifyRules();
verifyPublishAllowlist();
verifyCustomerTheme();
for (const relPath of ["es/index.js", "es/index.d.ts", "bin/wl-ui.js", "scanner/index.mjs"] ) {
  requireFile(relPath);
}

if (errors.length > 0) {
  console.error(errors.map((item) => `✖ ${item}`).join("\n"));
  process.exit(1);
}

const runtime = await import("../es/index.js");
await import("../es/common-preset.js");
await import("../es/presets/security.js");
for (const api of ["defineColumns", "renderOps", "createPreset", "installPreset"]) {
  if (typeof runtime[api] !== "function") errors.push(`runtime 缺少公共 API：${api}`);
}
if (errors.length > 0) {
  console.error(errors.map((item) => `✖ ${item}`).join("\n"));
  process.exit(1);
}
console.log(`[verify-package] ✔ v${pkg.version} 导出、规则目录、fixer 与运行时导入一致`);
