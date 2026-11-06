import { existsSync, lstatSync, readFileSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import jsonc from "./shared-jsonc.cjs";
import atomic from "./atomic-write.cjs";

const { atomicWriteFile } = atomic;

export const START = "<!-- wl-skills-ui:begin -->";
export const END = "<!-- wl-skills-ui:end -->";
export const HTML_START = "<!-- wl-skills-ui:tokens:begin -->";
export const HTML_END = "<!-- wl-skills-ui:tokens:end -->";

export function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function safeFile(root, rel, { manifestRecord = false } = {}) {
  if (!rel || isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) throw new Error(`Unsafe install path: ${rel}`);
  const base = realpathSync(root);
  const full = resolve(root, rel);
  let ancestor = full;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const info = lstatSync(ancestor);
  const actual = realpathSync(ancestor);
  const within = relative(base, actual);
  if (within.startsWith("..") || isAbsolute(within)) throw new Error(`Install path escapes project: ${rel}`);
  // Historical ownership can outlive a host changing between file and directory
  // layouts. Forget that stale entry without treating the new path as ours.
  if (manifestRecord && actual === resolve(base, relative(root, ancestor))
    && (ancestor === full ? info.isDirectory() : info.isFile())) return null;
  if (ancestor !== full && !info.isDirectory()) throw new Error(`Install parent is not a directory: ${rel}`);
  if (ancestor === full && !info.isFile()) throw new Error(`Install path is not a regular file: ${rel}`);
  return join(root, rel);
}

export function extract(content, start = START, end = END) {
  const from = content.indexOf(start);
  const to = content.indexOf(end, from);
  return from < 0 || to < 0 ? "" : content.slice(from, to + end.length);
}

export function validMarkers(content, start = START, end = END) {
  const count = content.split(start).length;
  if (count !== content.split(end).length || count > 2) return false;
  return count === 1 || content.indexOf(start) < content.indexOf(end);
}

export function remove(content, affixes = {}) {
  const block = extract(content);
  if (!block) return content;
  let start = content.indexOf(block);
  let end = start + block.length;
  if (affixes.prefix && content.slice(start - affixes.prefix.length, start) === affixes.prefix) start -= affixes.prefix.length;
  if (affixes.suffix && content.slice(end, end + affixes.suffix.length) === affixes.suffix) end += affixes.suffix.length;
  return content.slice(0, start) + content.slice(end);
}

export function createState(old = {}) {
  return { old, files: { ...old.files }, managedBlocks: { ...old.managedBlocks }, blockAffixes: { ...old.blockAffixes }, managedJson: { ...old.managedJson }, managedJsonText: { ...old.managedJsonText }, managedMcp: { layoutVersion: 1, records: { ...old.managedMcp?.records } }, contributions: { ...old.contributions }, references: { ...old.references } };
}

function preserve(state, rel, reason) {
  console.warn(`  保留 ${rel}：${reason}`);
  if (state.old.files?.[rel]) state.files[rel] = state.old.files[rel];
  else state.references[rel] = reason;
  if (state.old.managedBlocks?.[rel]) state.managedBlocks[rel] = state.old.managedBlocks[rel];
  return false;
}

export function writeOwnedFile({ root, rel, content, state, dryRun }) {
  let full;
  try { full = safeFile(root, rel); } catch (error) { return preserve(state, rel, error.message); }
  const existing = existsSync(full) ? readFileSync(full, "utf8") : null;
  const baseline = state.old.files?.[rel];
  if (existing !== null && (!baseline || hash(existing) !== baseline)) {
    return preserve(state, rel, baseline ? "本地修改" : existing === content ? "相同内容由项目拥有" : "项目已有文件");
  }
  if (dryRun) console.log(`  [dry-run] 写入 ${rel}`);
  else {
    mkdirSync(dirname(full), { recursive: true });
    atomicWriteFile(full, content);
    console.log(`  ✔ 写入 ${rel}`);
  }
  state.files[rel] = hash(content);
  return true;
}

function legacyRouterRemainder(existing, legacyHeader, oldWhole) {
  if (!legacyHeader || !oldWhole || !existing.trimStart().startsWith(legacyHeader)) return null;
  if (hash(existing) === oldWhole) return "";
  const foreign = [...existing.matchAll(/<!-- (wl-skills-[\w-]+):begin -->[\s\S]*?<!-- \1:end -->/g)];
  const legacy = foreign.reduce((text, match) => text.replace(match[0], ""), existing);
  const proven = [legacy, legacy.trimEnd(), `${legacy.trimEnd()}\n`]
    .find((text) => hash(text) === oldWhole && existing.startsWith(text));
  return proven === undefined ? null : existing.slice(proven.length);
}

function routerPlan(existing, current, block, legacyHeader, oldWhole, affixes = {}) {
  if (current) return { content: existing.replace(current, block), affixes };
  const legacyRemaining = legacyRouterRemainder(existing, legacyHeader, oldWhole);
  const preserved = legacyRemaining === null ? existing : legacyRemaining;
  const eol = preserved.includes("\r\n") ? "\r\n" : "\n";
  const prefix = preserved ? preserved.endsWith("\n") ? eol : eol + eol : "";
  return { content: `${preserved}${prefix}${block}${eol}`, affixes: { prefix, suffix: eol } };
}

export function writeRouter({ root, rel, block, state, dryRun, legacyHeader = "" }) {
  let full;
  try { full = safeFile(root, rel); } catch (error) { return preserve(state, rel, error.message); }
  const existing = existsSync(full) ? readFileSync(full, "utf8") : "";
  if (!validMarkers(existing)) return preserve(state, rel, "托管标记损坏或重复");
  const current = extract(existing);
  const baseline = state.old.managedBlocks?.[rel];
  const oldWhole = state.old.files?.[rel];
  if (current && (!baseline || hash(current) !== baseline)) {
    return preserve(state, rel, baseline ? "托管区块有本地修改" : "已有区块没有本包安装记录");
  }
  const plan = routerPlan(existing, current, block, legacyHeader, oldWhole, state.old.blockAffixes?.[rel]);
  if (existsSync(full) && !oldWhole) plan.affixes.keepFile = true;
  const { content } = plan;
  state.blockAffixes[rel] = plan.affixes;
  if (dryRun) console.log(`  [dry-run] 写入托管区块 ${rel}`);
  else {
    mkdirSync(dirname(full), { recursive: true });
    atomicWriteFile(full, content);
    console.log(`  ✔ 写入托管区块 ${rel}`);
  }
  state.files[rel] = hash(content);
  state.managedBlocks[rel] = hash(block);
  return true;
}

export { jsonc };
