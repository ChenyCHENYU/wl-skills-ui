import { existsSync, readFileSync } from "node:fs";
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

verifyVersions();
verifyExports();
verifyRules();
verifyPublishAllowlist();
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
