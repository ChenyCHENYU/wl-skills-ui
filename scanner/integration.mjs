/**
 * 接入完整性检查
 * 检查目标项目是否正确引入了 wk-skills-ui 的样式和 runtime
 *
 * 检查项：
 *   I001 — index.html 是否引入 tokens.css（或同等 css-var-compile.css）
 *   I002 — main.scss / 全局入口是否引入 wk-skills-ui/dist 或 shared/index.scss
 *   I003 — src/util/ 是否有 ag-cell-renders.ts 或者 main.ts 中安装了 runtime
 *   I004 — element-plus 是否在 dependencies 中（peer 兼容）
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * @param {string} projectRoot — 项目根目录（包含 index.html / src / package.json）
 * @returns {Array<{id, severity, ok, description, suggestion}>}
 */
export function checkIntegration(projectRoot) {
  const checks = [];

  // ── I001: index.html 加载 tokens.css ─────────────────────────────────
  const indexHtml = join(projectRoot, 'index.html');
  if (existsSync(indexHtml)) {
    const html = readFileSync(indexHtml, 'utf8');
    const hasTokens = /(css-var-compile|tokens)\.css/.test(html)
      || /wk-skills-ui\/dist\/tokens/.test(html);
    checks.push({
      id: 'I001', severity: hasTokens ? 'info' : 'error', ok: hasTokens,
      description: hasTokens ? 'tokens.css 已在 index.html 中引入' : 'index.html 缺少 tokens.css 引入',
      suggestion: hasTokens ? '' : '在 <head> 最先加载：<link rel="stylesheet" href="/node_modules/wk-skills-ui/dist/tokens.css" />'
    });
  } else {
    checks.push({
      id: 'I001', severity: 'warning', ok: false,
      description: '未找到 index.html',
      suggestion: '确认 --project 参数指向项目根目录'
    });
  }

  // ── I002: 全局样式入口引入 wk-skills-ui ───────────────────────────────
  const styleEntries = [
    'src/assets/style/main.scss',
    'src/assets/style/index.scss',
    'src/styles/main.scss',
    'src/styles/index.scss',
    'src/main.scss',
    'src/style.scss',
  ];
  let styleHit = null;
  for (const rel of styleEntries) {
    const p = join(projectRoot, rel);
    if (existsSync(p)) { styleHit = { rel, content: readFileSync(p, 'utf8') }; break; }
  }
  if (styleHit) {
    const referenced = /wk-skills-ui(\/dist)?/.test(styleHit.content)
      || /shared\/index/.test(styleHit.content);
    checks.push({
      id: 'I002', severity: referenced ? 'info' : 'warning', ok: referenced,
      description: referenced
        ? `全局样式入口 ${styleHit.rel} 已引入 wk-skills-ui`
        : `全局样式入口 ${styleHit.rel} 未引入 wk-skills-ui/dist`,
      suggestion: referenced ? '' : `在 ${styleHit.rel} 末尾添加：@use 'wk-skills-ui/dist' as *;`
    });
  } else {
    checks.push({
      id: 'I002', severity: 'warning', ok: false,
      description: '未找到全局 SCSS 入口（main.scss / index.scss）',
      suggestion: '在 src/assets/style/main.scss 中 @use \'wk-skills-ui/dist\' as *;'
    });
  }

  // ── I003: runtime 是否被引入 ─────────────────────────────────────────
  const utilDir = join(projectRoot, 'src/util');
  const utilHit = existsSync(utilDir)
    && (existsSync(join(utilDir, 'ag-cell-renders.ts'))
      || existsSync(join(utilDir, 'define-columns.ts')));
  let runtimeReferenced = false;
  // 也检查 main.ts 是否 import 'wk-skills-ui/runtime'
  for (const entry of ['src/main.ts', 'src/main.js', 'src/main-core.ts']) {
    const p = join(projectRoot, entry);
    if (existsSync(p) && /wk-skills-ui\/runtime/.test(readFileSync(p, 'utf8'))) {
      runtimeReferenced = true; break;
    }
  }
  const runtimeOk = utilHit || runtimeReferenced;
  checks.push({
    id: 'I003', severity: runtimeOk ? 'info' : 'warning', ok: runtimeOk,
    description: runtimeOk
      ? 'runtime 已可用（util/ag-cell-renders.ts 存在或已 import 包）'
      : '未发现 runtime 引入（无 src/util/ag-cell-renders.ts，main.ts 也未 import runtime）',
    suggestion: runtimeOk ? '' : '推荐：在 main.ts 中 import { installSafePreset } from "wk-skills-ui/runtime/safe-preset"; installSafePreset();'
  });

  // ── I004: element-plus 已安装 ────────────────────────────────────────
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const hasEp = !!deps['element-plus'];
      const hasVue = !!deps['vue'];
      checks.push({
        id: 'I004', severity: hasEp && hasVue ? 'info' : 'warning', ok: hasEp && hasVue,
        description: hasEp && hasVue
          ? `peer 依赖满足（vue ${deps.vue}，element-plus ${deps['element-plus']}）`
          : `peer 依赖缺失：${!hasVue ? 'vue ' : ''}${!hasEp ? 'element-plus' : ''}`,
        suggestion: hasEp && hasVue ? '' : 'pnpm add vue element-plus'
      });
    } catch {
      checks.push({ id: 'I004', severity: 'warning', ok: false, description: 'package.json 解析失败', suggestion: '' });
    }
  }

  return checks;
}
