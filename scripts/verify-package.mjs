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

function verifyViteDefineCompatibility() {
  const browserBundles = collectFiles(join(root, "es"), [".js"]);
  for (const file of browserBundles) {
    const content = readFileSync(file, "utf8");
    if (/\bprocess\.env\.NODE_ENV\b/.test(content)) {
      errors.push(
        `${file.slice(root.length + 1)}: 浏览器产物含 process.env.NODE_ENV，Vite 4 开发转换可能破坏成员访问语法`,
      );
    }
  }
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

const CUSTOMER_FIXED_TOKENS = {
  "--el-color-success": "#2bb268",
  "--el-color-warning": "#ea9a13",
  "--el-color-danger": "#bb2d3f",
  "--el-color-error": "#bb2d3f",
  "--el-border-radius-base": "6px",
  "--el-border-radius-small": "2px",
  "--el-border-radius-round": "20px",
  "--el-border-radius-circle": "100%",
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
      const declaration = `${token}: ${value} !important;`.toLowerCase();
      if (!content.includes(declaration)) {
        errors.push(`${relPath}: 客户主色未锁定或发生漂移，缺少 "${declaration}"`);
      }
    }
  }

  for (const relPath of [
    "design/tokens/base.css",
    "styles/tokens/index.scss",
    "dist/tokens.css",
  ]) {
    const content = readFileSync(join(root, relPath), "utf8").toLowerCase();
    for (const [token, value] of Object.entries(CUSTOMER_FIXED_TOKENS)) {
      const declaration = `${token}: ${value} !important;`.toLowerCase();
      if (!content.includes(declaration)) {
        errors.push(`${relPath}: 固定主题 token 未锁定或发生漂移，缺少 "${declaration}"`);
      }
    }
  }

  const themeLock = readFileSync(join(root, "runtime/theme-lock.ts"), "utf8");
  for (const required of [
    "BRAND_THEME_TOKENS",
    'style.setProperty(name, value, "important")',
    "new MutationObserver",
    '"--el-border-radius-base": "6px"',
  ]) {
    if (!themeLock.includes(required)) {
      errors.push(`runtime/theme-lock.ts: 动态主题锁缺少 ${required}`);
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

function verifyManagedScope() {
  const scope = readFileSync(join(root, "styles/_scope.scss"), "utf8");
  for (const required of [
    ".lp-root",
    ".session-login",
    ".wl-ui-skin-exempt",
    "[data-wl-ui-skin='off']",
  ]) {
    if (!scope.includes(required)) {
      errors.push(`styles/_scope.scss: 定制页样式边界缺少 ${required}`);
    }
  }

  for (const relPath of [
    "styles/element/_form.scss",
    "styles/element/_button.scss",
    "styles/vendors/_base-components.scss",
    "styles/vendors/_jh-ui.scss",
  ]) {
    const content = readFileSync(join(root, relPath), "utf8");
    if (
      !content.includes('@use "../scope" as skin;') ||
      !content.includes("#{skin.$managed-scope-selector}")
    ) {
      errors.push(`${relPath}: 表单/按钮强覆盖未接入定制页样式边界`);
    }
  }
}

verifyVersions();
verifyExports();
verifyRules();
verifyPublishAllowlist();
verifyViteDefineCompatibility();
verifyCustomerTheme();
verifyManagedScope();
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
for (const api of [
  "defineColumns",
  "renderOps",
  "createPreset",
  "installPreset",
  "installBrandThemeLock",
]) {
  if (typeof runtime[api] !== "function") errors.push(`runtime 缺少公共 API：${api}`);
}

const overflowColumns = runtime.defineColumns([
  { name: "customerName", label: "客户名称" },
  { name: "remark", label: "备注", wrapText: true },
  { name: "custom", label: "自定义", defaultSlot: () => "custom" },
  { name: "disabled", label: "关闭提示", showOverflowTooltip: false },
  {
    label: "分组",
    children: [{ name: "nestedName", label: "分组内名称" }],
  },
]);
if (
  overflowColumns[0].showOverflowTooltip !== true ||
  overflowColumns[1].showOverflowTooltip !== undefined ||
  overflowColumns[2].showOverflowTooltip !== undefined ||
  overflowColumns[3].showOverflowTooltip !== false ||
  overflowColumns[4].children?.[0]?.showOverflowTooltip !== true
) {
  errors.push("runtime defineColumns 未正确补齐普通文本列 overflow tooltip");
}

class FakeStyle {
  #values = new Map();
  #priorities = new Map();

  getPropertyValue(name) {
    return this.#values.get(name) || "";
  }

  getPropertyPriority(name) {
    return this.#priorities.get(name) || "";
  }

  setProperty(name, value, priority = "") {
    this.#values.set(name, value);
    this.#priorities.set(name, priority);
  }
}

let observerCallback;
const fakeRoot = { style: new FakeStyle() };
const fakeBody = { style: new FakeStyle() };
globalThis.document = {
  documentElement: fakeRoot,
  body: fakeBody,
  addEventListener() {},
};
globalThis.MutationObserver = class {
  constructor(callback) {
    observerCallback = callback;
  }
  disconnect() {}
  observe() {}
};

runtime.installBrandThemeLock();
fakeBody.style.setProperty("--el-color-primary", "#4368ff");
fakeBody.style.setProperty("--el-border-radius-base", "2px");
observerCallback?.([{ type: "attributes" }]);
if (
  fakeBody.style.getPropertyValue("--el-color-primary") !== "#002a8f" ||
  fakeBody.style.getPropertyPriority("--el-color-primary") !== "important" ||
  fakeBody.style.getPropertyValue("--el-border-radius-base") !== "6px" ||
  fakeBody.style.getPropertyPriority("--el-border-radius-base") !== "important"
) {
  errors.push("runtime 主题锁未能恢复平台动态主色或基础圆角");
}
delete globalThis.document;
delete globalThis.MutationObserver;
if (errors.length > 0) {
  console.error(errors.map((item) => `✖ ${item}`).join("\n"));
  process.exit(1);
}
console.log(`[verify-package] ✔ v${pkg.version} 导出、规则目录、fixer 与运行时导入一致`);
