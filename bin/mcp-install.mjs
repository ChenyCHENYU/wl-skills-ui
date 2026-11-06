import { existsSync, readFileSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import atomic from "./atomic-write.cjs";
import { hash, safeFile, jsonc } from "./install-lifecycle.mjs";

const packageName = "@agile-team/wl-skills-ui";
const require = createRequire(import.meta.url);
const planner = () => require("./mcp-config.cjs");
const legacyPath = ".mcp.json";
const node = ["mcpServers", "wl-skills-ui"];

function legacyEntry(root, manifest) {
  const full = join(root, legacyPath);
  const baseline = manifest.managedJson?.[legacyPath];
  if (typeof baseline === "string") return { path: legacyPath, container: node[0], serverKey: node[1], valueHash: baseline, textHash: manifest.managedJsonText?.[legacyPath], algorithm: "sha256" };
  if (!manifest.files?.[legacyPath] || !existsSync(full)) return null;
  const content = readFileSync(full, "utf8");
  if (hash(content) !== manifest.files[legacyPath]) return null;
  try {
    const value = jsonc.getJsoncValue(content, node);
    return value === undefined ? null : { path: legacyPath, container: node[0], serverKey: node[1], valueHash: hash(JSON.stringify(value)), textHash: hash(jsonc.getJsoncNodeText(content, node)), algorithm: "sha256" };
  } catch { return null; }
}

export function prepareMcpManifest(root, manifest) {
  if (!manifest) return manifest;
  const entry = manifest.managedMcp?.records?.[legacyPath] ? null : legacyEntry(root, manifest);
  const imported = planner().importLegacyMcpRecords({ projectRoot: root, packageName, entries: entry ? [entry] : [] });
  manifest.managedMcp = { layoutVersion: 1, records: { ...imported, ...manifest.managedMcp?.records } };
  if (entry) {
    manifest.managedJson = { ...manifest.managedJson };
    manifest.managedJsonText = { ...manifest.managedJsonText };
    delete manifest.managedJson[legacyPath];
    delete manifest.managedJsonText[legacyPath];
  }
  return manifest;
}

export function planMcpInstall(root, policy, manifest, remove = false) {
  return planner().planMcpConfiguration({ projectRoot: root, packageName, hosts: policy.hosts || [], enabled: policy.mcp === true, previous: manifest?.managedMcp?.records || {}, remove });
}

export function applyMcpInstall(root, plan, state, dryRun) {
  state.managedMcp = { layoutVersion: plan.layoutVersion, records: plan.records };
  for (const item of plan.files) {
    const full = safeFile(root, item.path);
    if (dryRun) console.log(`  [MCP ${item.action}] ${item.path}${item.reason ? `：${item.reason}` : ""}`);
    else if (item.action === "write") { mkdirSync(dirname(full), { recursive: true }); atomic.atomicWriteFile(full, item.content); }
    else if (item.action === "remove" && existsSync(full)) unlinkSync(full);
    else if (item.action === "preserve") console.warn(`  保留 ${item.path}：${item.reason || "本地修改或所有权不明"}`);
    if (item.record) {
      const content = item.content ?? item.before;
      if (content !== null) state.files[item.path] = hash(content);
    } else if (!state.managedJson[item.path] && !state.managedBlocks[item.path]) delete state.files[item.path];
  }
  for (const item of [...plan.diagnostics, ...plan.conflicts]) console.warn(`  [MCP] ${item.message || item.reason || JSON.stringify(item)}`);
}

export function inspectMcpInstall(root, host) {
  return planner().inspectMcpConfiguration({ projectRoot: root, packageName, host });
}
