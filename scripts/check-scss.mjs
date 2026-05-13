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
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

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
}

if (errors > 0) {
  console.error(`\n❌ SCSS 链路检查失败: ${errors} 个错误`);
  process.exit(1);
} else {
  console.log("✅ SCSS 链路检查通过");
}
