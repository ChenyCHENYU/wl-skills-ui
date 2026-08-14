#!/usr/bin/env node
/**
 * scripts/check-scss.mjs — SCSS 链路完整性检查
 *
 * 递归验证 styles/index.scss 的 @forward/@use 链，
 * 确保所有被引入的 SCSS partial 文件真实存在。
 * 跳过 sass: 内置模块和包自引用（@agile-team/... / wl-skills-ui/...）。
 *
 * 用法：npm run check:scss
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "sass";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const STYLES = join(ROOT, "styles");

let errors = 0;

/** 跳过包自引用和 sass 内置 */
function shouldSkip(ref) {
  if (ref.startsWith("sass:")) return true;
  if (ref.startsWith("~")) return true;
  if (ref.startsWith("@agile-team/")) return true;
  if (ref.startsWith("wl-skills-ui/")) return true;
  return false;
}

/** 解析 SCSS @forward/@use 引用到实际文件路径 */
function resolveScssRef(dir, ref) {
  // 已有 .scss 后缀
  if (ref.endsWith(".scss")) {
    const direct = join(dir, ref);
    if (existsSync(direct)) return direct;
    // _partial
    const partial = join(dirname(direct), "_" + basename(direct));
    if (existsSync(partial)) return partial;
    return null;
  }
  // 无后缀：SCSS partial 解析规则
  const name = basename(ref);
  const refDir = dirname(ref);
  const base = join(dir, refDir);
  const candidates = [
    join(base, name + ".scss"),
    join(base, "_" + name + ".scss"),
    join(base, name, "index.scss"),
    join(base, name, "_index.scss"),
  ];
  return candidates.find((c) => existsSync(c)) || null;
}

function checkImportChain(filePath, visited = new Set()) {
  const norm = resolve(filePath);
  if (visited.has(norm)) return;
  visited.add(norm);
  if (!existsSync(norm)) {
    console.error(`❌ 文件不存在: ${norm}`);
    errors++;
    return;
  }
  const content = readFileSync(norm, "utf8");
  const re = /@(?:forward|use|import)\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const ref = m[1];
    if (shouldSkip(ref)) continue;
    const resolved = resolveScssRef(dirname(norm), ref);
    if (!resolved) {
      console.error(`❌ ${norm} → "${ref}" 无法解析`);
      errors++;
    } else {
      checkImportChain(resolved, visited);
    }
  }
}

// 入口
const entryPoints = [
  join(STYLES, "index.scss"),
  join(STYLES, "presets", "skin.scss"),
];

for (const entry of entryPoints) {
  if (!existsSync(entry)) {
    console.error(`❌ 入口文件不存在: ${entry}`);
    errors++;
    continue;
  }
  checkImportChain(entry);
  try {
    compile(entry, {
      loadPaths: [ROOT],
      quietDeps: true,
      silenceDeprecations: ["mixed-decls"],
      style: "compressed",
    });
  } catch (error) {
    console.error(`❌ SCSS 编译失败 ${entry}: ${error.message}`);
    errors++;
  }
}

// ── 反模式守门（wl-ui-ep 存量改造踩坑沉淀） ─────────────────────────────────
// 1) 禁止对 .ag-header-row 强制 height（尤其 auto!important）：破坏 ag-grid 分组
//    表头（二级表头）内部行高计算，分组行算成 0 → 二级表头不渲染。
//    正确姿势：--ag-header-height / --ag-group-header-height 变量驱动。
// 2) 禁止「容器:hover 直选 ::-webkit-scrollbar-thumb」：部分 Chromium 不触发
//    重绘。正确姿势：标准 scrollbar-color + webkit 变量继承双轨。
const FORBIDDEN_PATTERNS = [
  {
    re: /\.ag-header-row(?![-\w])[^{}]*\{[^}]*height\s*:\s*(auto\s*!important|[^;}]*!important)/s,
    msg: ".ag-header-row 强制 height 会破坏分组表头行高计算，请改用 --ag-header-height / --ag-group-header-height 变量（见 vendors/_ag-grid.scss）",
  },
];

function walkScss(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkScss(p, out);
    else if (name.endsWith(".scss")) out.push(p);
  }
  return out;
}

for (const file of walkScss(STYLES)) {
  // 剥掉注释再匹配（注释中的示例代码不算违规）
  const content = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const { re, msg } of FORBIDDEN_PATTERNS) {
    if (re.test(content)) {
      console.error(`❌ ${relative(ROOT, file)}: ${msg}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n❌ SCSS 链路检查失败: ${errors} 个错误`);
  process.exit(1);
} else {
  console.log("✅ SCSS 链路检查通过");
}
