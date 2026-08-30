import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { getRules } from "../scanner/rules/index.mjs";
import { FIXED_RULE_IDS } from "../scanner/fix.mjs";
import { ELEMENT_SKILL_MAP } from "../scanner/coverage.mjs";
import { listProfiles } from "../standards/profiles-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const readme = readFileSync(join(root, "README.md"), "utf8");
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
const componentRegistryPath = join(
  root,
  "standards",
  "component-structures.json",
);
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

// 复合控件结构清单必须可发布、ID 唯一，并且每项真实 DOM fixture 存在。
if (!existsSync(componentRegistryPath)) {
  errors.push("standards/component-structures.json: 复合控件结构清单不存在");
} else {
  const componentRegistry = JSON.parse(
    readFileSync(componentRegistryPath, "utf8"),
  );
  const contracts = componentRegistry.contracts || [];
  const contractIds = new Set(contracts.map((contract) => contract.id));
  if (contractIds.size !== contracts.length) {
    errors.push("standards/component-structures.json: 存在重复结构 ID");
  }
  for (const contract of contracts) {
    for (const field of [
      "id",
      "source",
      "fixture",
      "rootSelector",
      "ownerSelector",
      "heightPolicy",
    ]) {
      if (!contract[field]) {
        errors.push(
          `standards/component-structures.json: ${contract.id || "<unknown>"} 缺少 ${field}`,
        );
      }
    }
    if (contract.fixture && !existsSync(join(root, contract.fixture))) {
      errors.push(
        `standards/component-structures.json: ${contract.id} fixture 不存在：${contract.fixture}`,
      );
    }
  }
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v1.8.0 新增校验：rules.json 单一事实源 + 幽灵 skill
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const rulesJsonPath = join(root, "standards", "rules.json");
if (!existsSync(rulesJsonPath)) {
  errors.push("standards/rules.json: 文件不存在（v1.8.0 起为 R-rule 单一事实源）");
} else {
  const rulesData = JSON.parse(readFileSync(rulesJsonPath, "utf8"));
  const rulesById = new Map(rulesData.rules.map((r) => [r.id, r]));
  const aliasMap = new Map();
  for (const r of rulesData.rules)
    for (const a of r.aliases || []) aliasMap.set(a, r.id);

  // (1) 校验 ID 唯一
  if (rulesById.size !== rulesData.rules.length) {
    errors.push("standards/rules.json: 存在重复 R-id");
  }

  const implementations = getRules();
  const implementationIds = new Set(implementations.map((rule) => rule.id));
  for (const rule of rulesData.rules) {
    if (!implementationIds.has(rule.id)) {
      errors.push(`standards/rules.json: ${rule.id} 缺少 scanner 实现`);
    }
    for (const skill of rule.skills || []) {
      if (!existsSync(join(root, "skills", skill, "SKILL.md"))) {
        errors.push(`standards/rules.json: ${rule.id} 引用了不存在的 Skill ${skill}`);
      }
    }
  }
  for (const rule of implementations) {
    if (!rulesById.has(rule.id)) {
      errors.push(`scanner rule ${rule.id} 未在 standards/rules.json 注册`);
    }
  }

  const metadataFixers = rulesData.rules
    .filter((rule) => rule.autoFixable)
    .map((rule) => rule.id)
    .sort();
  const implementedFixers = [...FIXED_RULE_IDS].sort();
  if (JSON.stringify(metadataFixers) !== JSON.stringify(implementedFixers)) {
    errors.push(
      `fixer 与 autoFixable 元数据不一致：metadata=${metadataFixers.join(",")} implementation=${implementedFixers.join(",")}`,
    );
  }

  for (const skill of new Set(Object.values(ELEMENT_SKILL_MAP))) {
    if (!existsSync(join(root, "skills", skill, "SKILL.md"))) {
      errors.push(`scanner/coverage.mjs 引用了不存在的 Skill ${skill}`);
    }
  }

  // (2) 校验 scanner/rules/*.mjs 中所有 id: "Rxxx" 都在 rules.json 中存在且 scanner 字段一致
  const scannerRulesDir = join(root, "scanner", "rules");
  for (const f of readdirSync(scannerRulesDir)) {
    if (!f.endsWith(".mjs") || f.startsWith("_") || f === "index.mjs") continue;
    const code = readFileSync(join(scannerRulesDir, f), "utf8");
    const idMatches = [...code.matchAll(/id:\s*["'](R\d{3})["']/g)].map(
      (m) => m[1],
    );
    for (const rid of idMatches) {
      const rule = rulesById.get(rid);
      if (!rule) {
        errors.push(
          `scanner/rules/${f}: 规则 ${rid} 未在 standards/rules.json 注册`,
        );
        continue;
      }
      const expectedScanner = `scanner/rules/${f}`;
      if (rule.scanner && rule.scanner !== expectedScanner) {
        errors.push(
          `standards/rules.json: ${rid}.scanner 应为 "${expectedScanner}"（当前 "${rule.scanner}"）`,
        );
      }
    }
  }

  // (3) 校验 skills/**/SKILL.md 引用的 R-rule 必须在 rules.json 中存在
  const skillsRoot = join(root, "skills");
  function walkSkills(dir, list = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walkSkills(p, list);
      else if (e.name.endsWith(".md")) list.push(p);
    }
    return list;
  }
  for (const f of walkSkills(skillsRoot)) {
    const rel = relative(root, f).replace(/\\/g, "/");
    const content = readFileSync(f, "utf8");
    const refs = [...new Set(
      [...content.matchAll(/\b(R\d{3})\b/g)].map((m) => m[1]),
    )];
    for (const rid of refs) {
      if (rulesById.has(rid)) continue;
      if (aliasMap.has(rid)) continue;
      errors.push(
        `${rel}: 引用了未注册规则 ${rid}（应在 standards/rules.json 中定义或加 aliases）`,
      );
    }
  }

  // (4) 校验 _registry.md 提到的 skill 目录必须真实存在
  const registryPath = join(root, "skills", "_meta", "_registry.md");
  if (existsSync(registryPath)) {
    const reg = readFileSync(registryPath, "utf8");
    const skillRefs = [
      ...reg.matchAll(/\b(element|vendors|layouts|runtime|ops)\/([a-z][a-z0-9-]*)\b/g),
    ];
    const seen = new Set();
    for (const m of skillRefs) {
      const key = `${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const dir = join(skillsRoot, m[1], m[2]);
      const skillFile = join(dir, "SKILL.md");
      if (!existsSync(skillFile)) {
        errors.push(
          `skills/_meta/_registry.md: 引用的 skill "${key}" 不存在 (期望 ${relative(root, skillFile).replace(/\\/g, "/")})`,
        );
      }
    }
  }
}

const rootSkill = readFileSync(join(root, "SKILL.md"), "utf8");
if (!/^---[\s\S]*?\bname:\s*wl-skills-ui\b[\s\S]*?\bdescription:/m.test(rootSkill)) {
  errors.push("SKILL.md: 缺少可判别的 name/description frontmatter");
}
const frontmatter = rootSkill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
const allowedSkillKeys = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
]);
for (const match of frontmatter.matchAll(/^([a-zA-Z][\w-]*):/gm)) {
  if (!allowedSkillKeys.has(match[1])) {
    errors.push(`SKILL.md: 不支持的 frontmatter 字段 ${match[1]}`);
  }
}
if (rootSkill.length > 12_000) {
  errors.push(`SKILL.md: 根路由过长（${rootSkill.length} chars），应使用渐进式披露`);
}

const profileIds = new Set();
for (const profile of listProfiles()) {
  if (profileIds.has(profile.id)) errors.push(`profiles.json: 重复 profile ${profile.id}`);
  profileIds.add(profile.id);
  const stylePath = join(root, `${profile.stylePreset}.scss`);
  const runtimePath = join(
    root,
    "runtime",
    "profile-entries",
    `${profile.id}.ts`,
  );
  if (!existsSync(stylePath)) errors.push(`profiles.json: 样式入口不存在 ${profile.stylePreset}`);
  if (!existsSync(runtimePath)) errors.push(`profiles.json: runtime 入口不存在 ${profile.runtimePreset}`);
}

if (errors.length > 0) {
  console.error(
    "docs:check failed:\n" + errors.map((error) => `- ${error}`).join("\n"),
  );
  process.exit(1);
}

console.log("docs:check passed");
