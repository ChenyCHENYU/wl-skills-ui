/**
 * scanner/drift.mjs — 漂移检测
 *
 * 对比 baseline（基线 JSON）与 current（当前扫描 JSON），输出结构化漂移报告。
 * 指纹策略：file + rule（行号不稳定，不参与指纹）。同一 file+rule 多条则按数量 diff。
 *
 * 用法：
 *   import { drift, formatDriftText } from '@agile-team/wl-skills-ui/scanner/drift.mjs'
 *   const result = drift(baselineJson, currentJson)
 *   console.log(formatDriftText(result))
 *
 * CLI（由 scanner/index.mjs 调用）：
 *   npx wl-ui drift --baseline .wl-baseline.json --current .wl-current.json
 *
 * 事实源：standards/rules.json
 */
import { readFileSync, existsSync } from "node:fs";

// ── 指纹 ────────────────────────────────────────────────────────────────────

function fingerprint(issue) {
  return `${issue.file}\x00${issue.rule}`;
}

function buildCountMap(issues) {
  const map = new Map();
  for (const iss of issues) {
    const key = fingerprint(iss);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

// ── 核心 diff ───────────────────────────────────────────────────────────────

/**
 * @param {object} baseline  JSON 扫描结果（含 issues 数组）
 * @param {object} current   JSON 扫描结果（含 issues 数组）
 * @returns {DriftResult}
 */
export function drift(baseline, current) {
  const baseIssues = baseline.issues || [];
  const curIssues = current.issues || [];
  const baseMap = buildCountMap(baseIssues);
  const curMap = buildCountMap(curIssues);

  const allKeys = new Set([...baseMap.keys(), ...curMap.keys()]);

  const gained = []; // 新增（当前有、基线无 或 当前 > 基线）
  const fixed = []; // 消化（基线有、当前无 或 当前 < 基线）
  const regressed = []; // 回归预留（后续可扩展 fix-then-break 检测）

  for (const key of allKeys) {
    const [file, rule] = key.split("\x00");
    const baseCount = baseMap.get(key) || 0;
    const curCount = curMap.get(key) || 0;
    const delta = curCount - baseCount;
    if (delta > 0) {
      gained.push({ file, rule, delta, baseCount, curCount });
    } else if (delta < 0) {
      fixed.push({ file, rule, delta, baseCount, curCount });
    }
    // delta === 0 → 无变化，跳过
  }

  // 按规则 & 目录 聚合
  const byRule = aggregate(gained, "rule");
  const byDir = aggregateDir(gained);
  const fixedByRule = aggregate(fixed, "rule");

  return {
    baselineTotal: baseIssues.length,
    currentTotal: curIssues.length,
    netDelta: curIssues.length - baseIssues.length,
    gained: { count: sumDelta(gained), items: gained },
    fixed: { count: Math.abs(sumDelta(fixed)), items: fixed },
    regressed: { count: 0, items: regressed },
    topGainedByRule: sortDesc(byRule).slice(0, 5),
    topGainedByDir: sortDesc(byDir).slice(0, 5),
    topFixedByRule: sortDesc(fixedByRule).slice(0, 5),
  };
}

function sumDelta(arr) {
  return arr.reduce((s, i) => s + Math.abs(i.delta), 0);
}

function aggregate(items, field) {
  const map = new Map();
  for (const it of items) {
    const key = it[field];
    map.set(key, (map.get(key) || 0) + Math.abs(it.delta));
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

function aggregateDir(items) {
  const map = new Map();
  for (const it of items) {
    const parts = it.file.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    map.set(dir, (map.get(dir) || 0) + Math.abs(it.delta));
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

function sortDesc(arr) {
  return arr.sort((a, b) => b.count - a.count);
}

// ── 文本格式化 ──────────────────────────────────────────────────────────────

export function formatDriftText(result) {
  const lines = [];
  lines.push("╭──────────────────────────────────────╮");
  lines.push("│        wl-skills-ui 漂移报告         │");
  lines.push("╰──────────────────────────────────────╯");
  lines.push("");
  lines.push(`基线违规: ${result.baselineTotal}  →  当前违规: ${result.currentTotal}  (${result.netDelta >= 0 ? "+" : ""}${result.netDelta})`);
  lines.push("");
  lines.push(`  🔴 gained   +${result.gained.count}  新增违规`);
  lines.push(`  🟢 fixed    -${result.fixed.count}  消化历史`);
  if (result.regressed.count > 0) {
    lines.push(`  🟡 regressed +${result.regressed.count}  回归`);
  }
  lines.push("");

  if (result.topGainedByRule.length > 0) {
    lines.push("新增 Top 规则:");
    for (const { key, count } of result.topGainedByRule) {
      lines.push(`  ${key}  +${count}`);
    }
    lines.push("");
  }

  if (result.topGainedByDir.length > 0) {
    lines.push("新增 Top 目录:");
    for (const { key, count } of result.topGainedByDir) {
      lines.push(`  ${key}  +${count}`);
    }
    lines.push("");
  }

  if (result.topFixedByRule.length > 0) {
    lines.push("消化 Top 规则:");
    for (const { key, count } of result.topFixedByRule) {
      lines.push(`  ${key}  -${count}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── JSON 格式化 ─────────────────────────────────────────────────────────────

export function formatDriftJson(result) {
  return JSON.stringify(result, null, 2);
}

// ── 文件级便捷 API ──────────────────────────────────────────────────────────

/**
 * 从两个 JSON 文件路径生成漂移报告
 * @param {string} baselinePath
 * @param {string} currentPath
 * @returns {DriftResult}
 */
export function driftFromFiles(baselinePath, currentPath) {
  if (!existsSync(baselinePath)) {
    throw new Error(`基线文件不存在: ${baselinePath}`);
  }
  if (!existsSync(currentPath)) {
    throw new Error(`当前扫描结果不存在: ${currentPath}`);
  }
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const current = JSON.parse(readFileSync(currentPath, "utf8"));
  return drift(baseline, current);
}
