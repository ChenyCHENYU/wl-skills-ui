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
  { pattern: /--editor auto/, message: "无效编辑器参数 --editor auto" },
  { pattern: /当前 v1\.6\.2/, message: "过期 README 当前版本文案" },
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "es"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

for (const file of walk(root)) {
  const rel = relative(root, file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf8");
  for (const { pattern, message } of forbiddenPatterns) {
    if (rel === "CHANGELOG.md") continue;
    if (pattern.test(content)) errors.push(`${rel}: ${message}`);
  }
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
