import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const readme = readFileSync(join(root, "README.md"), "utf8");
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
const editorConfig = JSON.parse(
  readFileSync(
    join(root, "skills", "_meta", "_compat", "editors.json"),
    "utf8",
  ),
);

const errors = [];
const forbiddenPatterns = [
  { pattern: /\bwk-ui\b/, message: "旧 CLI 名称 wk-ui" },
  { pattern: /\bwk-skills-ui\b/, message: "旧包名 wk-skills-ui" },
  {
    pattern: /@agile-team\/wk-skills-ui/,
    message: "旧 npm 包名 @agile-team/wk-skills-ui",
  },
  { pattern: /\bwk-scan\b/, message: "旧 CLI 名称 wk-scan" },
  { pattern: /\.wk-snapshot\b/, message: "旧快照目录 .wk-snapshot" },
  { pattern: /\bwk-exempt\b/, message: "旧豁免配置 wk-exempt" },
  { pattern: /\bwks_ui_/, message: "旧 MCP 工具前缀 wks_ui_" },
  { pattern: /--editor auto/, message: "无效编辑器参数 --editor auto" },
];

const SCAN_EXTS = new Set([
  ".md",
  ".mjs",
  ".js",
  ".ts",
  ".scss",
  ".css",
  ".txt",
  ".json",
  ".vue",
]);
const SCAN_SKIP_FILES = new Set(["CHANGELOG.md", "check-docs.mjs"]);
const SCAN_SKIP_DIRS = new Set(["node_modules", ".git", "dist", "es"]);

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SCAN_SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (
      entry.isFile() &&
      SCAN_EXTS.has(entry.name.slice(entry.name.lastIndexOf("."))) &&
      !SCAN_SKIP_FILES.has(entry.name)
    )
      files.push(full);
  }
  return files;
}

for (const file of walk(root)) {
  const rel = relative(root, file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf8");
  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(content)) errors.push(`${rel}: ${message}`);
  }
}

// vendor 优先级一致性：README / architecture / styles/vendors/index.scss 必须一致
const VENDOR_PRIORITY = "Base* > jh-* > C_*/c_* > AG Grid > custom wrappers";
const vendorPriorityFiles = [
  "README.md",
  "standards/architecture/01-layer-boundaries.md",
  "styles/vendors/index.scss",
];
for (const rel of vendorPriorityFiles) {
  const full = join(root, rel);
  if (!existsSync(full)) {
    errors.push(`${rel}: 文件不存在，无法校验 vendor 优先级`);
    continue;
  }
  if (!readFileSync(full, "utf8").includes(VENDOR_PRIORITY)) {
    errors.push(`${rel}: 缺少统一 vendor 优先级 "${VENDOR_PRIORITY}"`);
  }
}

// jh 通配语义：jh-components SKILL 必须明确 <jh-*> 全量识别 + 代表性基线表述
const jhSkill = join(root, "skills/vendors/jh-components/SKILL.md");
if (existsSync(jhSkill)) {
  const jh = readFileSync(jhSkill, "utf8");
  if (!/<jh-\*>/.test(jh) || !/代表性基线/.test(jh)) {
    errors.push(
      "skills/vendors/jh-components/SKILL.md: 必须包含 `<jh-*>` 全量识别和“代表性基线”表述",
    );
  }
}

// compat-matrix.md ↔ vendors.json 一致性
const vendorsJson = JSON.parse(
  readFileSync(join(root, "skills", "_meta", "_compat", "vendors.json"), "utf8"),
);
const jhCompat = vendorsJson.vendors.find((v) => v.id === "jh")?.compat || {};
const compatMatrixPath = join(root, "docs", "compat-matrix.md");
if (existsSync(compatMatrixPath)) {
  const matrix = readFileSync(compatMatrixPath, "utf8");
  if (jhCompat.elementPlus && !matrix.includes(jhCompat.elementPlus)) {
    errors.push(
      `docs/compat-matrix.md: 缺少推荐 element-plus 版本 ${jhCompat.elementPlus}（与 vendors.json jh.compat 不一致）`,
    );
  }
  if (jhCompat.jhUi && !matrix.includes(jhCompat.jhUi)) {
    errors.push(
      `docs/compat-matrix.md: 缺少推荐 @jhlc/jh-ui 版本 ${jhCompat.jhUi}（与 vendors.json jh.compat 不一致）`,
    );
  }
} else {
  errors.push("docs/compat-matrix.md: 文件不存在，无法校验适配矩阵");
}

if (!readme.includes(`当前 v${pkg.version}`)) {
  errors.push(
    `README.md: 当前版本文案未同步 package.json version ${pkg.version}`,
  );
}

if (!changelog.includes(`## [${pkg.version}]`)) {
  errors.push(`CHANGELOG.md: 缺少 ${pkg.version} 版本记录`);
}

for (const editor of editorConfig.editors) {
  if (!editor.id) errors.push("editors.json: editor 缺少 id");
  if (!editor.installPath)
    errors.push(`editors.json: ${editor.id} 缺少 installPath`);
  if (!editor.ext) errors.push(`editors.json: ${editor.id} 缺少 ext`);
  if (!editor.headerFile)
    errors.push(`editors.json: ${editor.id} 缺少 headerFile`);
  if (
    !existsSync(join(root, "skills", "_meta", "_compat", editor.headerFile))
  ) {
    errors.push(
      `editors.json: ${editor.id} headerFile 不存在：${editor.headerFile}`,
    );
  }
}

if (errors.length > 0) {
  console.error(
    "docs:check failed:\n" + errors.map((error) => `- ${error}`).join("\n"),
  );
  process.exit(1);
}

console.log("docs:check passed");
