// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @agile-team/wl-skills-ui/vite — 启动期自检 Vite 插件
//
// 用法（消费方 vite.config.ts）：
//   import { wlSkillsCheck } from '@agile-team/wl-skills-ui/vite';
//   export default defineConfig({ plugins: [wlSkillsCheck()] });
//
// 选项：
//   enforce: 'warn' | 'error' | 'silent'  默认 'warn'
//   includeVendors: string[]              只校验指定 vendor id，默认全部
//   verbose: boolean                       默认 false，true 时也打印 match 项
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beginUiCheck, finishUiCheck } from "../../bin/task-integration.mjs";
import {
  listCompatVendors,
  evaluateVendor,
  buildOverridesSnippet,
} from "../../skills/_meta/_compat/loader.mjs";

const C_RESET = "\x1b[0m";
const C_YELLOW = "\x1b[33m";
const C_RED = "\x1b[31m";
const C_GREEN = "\x1b[32m";
const C_DIM = "\x1b[2m";

/**
 * Vite 插件：启动期校验项目依赖是否锚定 wl-skills-ui 推荐组合
 * @param {{enforce?: 'warn'|'error'|'silent', includeVendors?: string[], verbose?: boolean}} options
 */
export function wlSkillsCheck(options = {}) {
  const enforce = options.enforce ?? "warn";
  const includeVendors = options.includeVendors ?? null;
  const verbose = options.verbose ?? false;
  let hasRun = false;

  return {
    name: "wl-skills-ui:check",
    configResolved(config) {
      if (hasRun || enforce === "silent") return;
      hasRun = true;
      runCheck({
        projectRoot: config.root,
        enforce,
        includeVendors,
        verbose,
        logger: config.logger,
        runId: options.runId,
        persist: options.persist,
      });
    },
  };
}

function runCheck({ projectRoot, enforce, includeVendors, verbose, logger, runId, persist }) {
  const execution = beginUiCheck(projectRoot, ["package.json"], "vite-dependency-check", runId, { persist });
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return skippedCheck(execution, logger, "未找到 package.json");
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return skippedCheck(execution, logger, "package.json 无法解析");
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const vendors = listCompatVendors().filter(
    (v) => !includeVendors || includeVendors.includes(v.vendorId),
  );

  const mismatches = [];
  const matches = [];
  const evaluations = [];
  const checks = [];
  for (const compat of vendors) {
    const ev = evaluateVendor(compat, deps);
    evaluations.push(ev);
    checks.push({ id: `vendor:${compat.vendorId}`, status: ev.verdict === "match" ? "passed" : ev.verdict === "mismatch" ? "failed" : "not-applicable", reason: ev.verdict });
    if (ev.verdict === "match") matches.push({ compat, ev });
    else if (ev.verdict === "mismatch") mismatches.push({ compat, ev });
  }
  checks.push({ id: "scan", status: "skipped", reason: "This Vite plugin checks dependency combinations only; source UI rules have not run" });
  const receipt = finishUiCheck(execution, { exitCode: enforce === "error" && mismatches.length > 0 ? 1 : 0, validationStatus: mismatches.length > 0 ? "failed" : "passed", checkedFiles: ["package.json"], checks, summary: { matches: matches.length, mismatches: mismatches.length, sourceRulesVerified: false } });
  print(logger, "info", `[wl-skills-ui] 依赖检查完成：匹配 ${matches.length} / 偏差 ${mismatches.length}；执行=${receipt.executionStatus} 验证=${receipt.validationStatus} runId=${receipt.runId}；源码UI规则尚未验证；回执=${receipt.receiptPath || "未持久化"}`);

  if (verbose && matches.length > 0) {
    const lines = matches.map(
      ({ compat, ev }) =>
        `  ${C_GREEN}✓${C_RESET} ${compat.vendorId}: ${ev.peers
          .map((p) => `${p.name}@${p.actual}`)
          .join(" + ")}`,
    );
    print(logger, "info", `${C_DIM}[wl-skills-ui] 适配矩阵命中：${C_RESET}\n${lines.join("\n")}`);
  }

  if (mismatches.length === 0) return;

  const overrides = buildOverridesSnippet(evaluations);
  const header =
    enforce === "error"
      ? `${C_RED}[wl-skills-ui] 启动期版本配对失败（enforce=error）${C_RESET}`
      : `${C_YELLOW}[wl-skills-ui] 启动期版本配对警告${C_RESET}`;

  const detail = mismatches
    .map(({ compat, ev }) => {
      const peers = ev.peers
        .map(
          (p) =>
            `    - ${p.name}: 实际 ${p.actual || "未安装"} / 推荐 ${p.expected} ${p.ok ? `${C_GREEN}✓${C_RESET}` : `${C_RED}✗${C_RESET}`}`,
        )
        .join("\n");
      return `  vendor=${compat.vendorId}\n${peers}\n    ${C_DIM}→ ${compat.note || ""}${C_RESET}`;
    })
    .join("\n\n");

  const fix = overrides
    ? `\n${C_DIM}修复建议（复制到 package.json）：${C_RESET}\n${C_DIM}${JSON.stringify(overrides.pnpm, null, 2)}${C_RESET}\n或执行：${C_DIM}npx wl-ui doctor --print-overrides${C_RESET}`
    : "";

  const message = `${header}\n${detail}${fix}`;

  if (enforce === "error") {
    print(logger, "error", message);
    throw new Error("[wl-skills-ui] vendor 版本配对偏离推荐组合，详见上方提示");
  } else {
    print(logger, "warn", message);
  }
}

function skippedCheck(execution, logger, reason) {
  const receipt = finishUiCheck(execution, { exitCode: 0, validationStatus: "unverified", checks: [{ id: "dependency-check", status: "skipped", reason }] });
  print(logger, "warn", `[wl-skills-ui] 依赖检查未执行：${reason}；验证=${receipt.validationStatus} runId=${receipt.runId}`);
}

function print(logger, level, msg) {
  if (logger && typeof logger[level] === "function") {
    logger[level](msg);
  } else {
    console[level === "error" ? "error" : "warn"](msg);
  }
}

export default wlSkillsCheck;
