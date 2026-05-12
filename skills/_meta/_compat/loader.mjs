// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// vendors.json 适配矩阵共享加载器
//
// 所有读取方（scanner I005 / MCP wl_ui_detect_skin / Vite 插件 / bin doctor /
// scripts/check-docs.mjs）统一从这里取数据，避免逻辑漂移。
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VENDORS_JSON_PATH = join(__dirname, "vendors.json");

let _cache = null;

/** 加载 vendors.json（带进程内缓存） */
export function loadVendorsJson() {
  if (_cache) return _cache;
  _cache = JSON.parse(readFileSync(VENDORS_JSON_PATH, "utf8"));
  return _cache;
}

/** 规范化单个 vendor 的 compat（兼容旧平铺字段） */
export function normalizeCompat(vendor) {
  const c = vendor?.compat;
  if (!c) return null;
  const peers = c.peers || {};
  // 旧平铺字段兜底
  if (!peers["element-plus"] && c.elementPlus) {
    peers["element-plus"] = c.elementPlus;
  }
  if (!peers["@jhlc/jh-ui"] && c.jhUi) {
    peers["@jhlc/jh-ui"] = c.jhUi;
  }
  return {
    vendorId: vendor.id,
    vendorLabel: vendor.label,
    peers,
    gatingPeer: c.gatingPeer || Object.keys(peers).find((k) => k.startsWith("@")) || null,
    conflictsWith: c.conflictsWith || [],
    domAssumptions: c.domAssumptions || [],
    note: c.note || "",
  };
}

/** 返回所有声明了 compat 的 vendor */
export function listCompatVendors() {
  const { vendors = [] } = loadVendorsJson();
  return vendors.map(normalizeCompat).filter(Boolean);
}

/**
 * 针对一个项目的 dependencies + devDependencies 判定 vendor 配对状态
 * @returns {{vendorId, gatingInstalled, peers: Array<{name, expected, actual, ok}>, verdict}}
 *   verdict: 'match' | 'mismatch' | 'not-applicable'
 */
export function evaluateVendor(compat, deps) {
  const gating = compat.gatingPeer;
  const gatingInstalled = gating ? Boolean(deps[gating]) : true;
  if (gating && !gatingInstalled) {
    return {
      vendorId: compat.vendorId,
      gatingInstalled: false,
      peers: [],
      verdict: "not-applicable",
    };
  }
  const peers = Object.entries(compat.peers).map(([name, expected]) => {
    const actual = deps[name] || null;
    const ok = !!actual && actual.includes(expected);
    return { name, expected, actual, ok };
  });
  const allOk = peers.every((p) => p.ok);
  return {
    vendorId: compat.vendorId,
    gatingInstalled: true,
    peers,
    verdict: allOk ? "match" : "mismatch",
  };
}

/** 输出 pnpm overrides 修复片段（仅对 mismatch 的 peers） */
export function buildOverridesSnippet(evaluations) {
  const overrides = {};
  for (const ev of evaluations) {
    if (ev.verdict !== "mismatch") continue;
    for (const p of ev.peers) {
      if (!p.ok) overrides[p.name] = p.expected;
    }
  }
  if (Object.keys(overrides).length === 0) return null;
  return {
    pnpm: { overrides },
    npmYarn: { resolutions: overrides, overrides },
  };
}
