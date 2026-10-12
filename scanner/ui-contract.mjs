import { createHash } from "node:crypto";
import {
  realpathSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { createCoverageCollector } from "./coverage.mjs";
import { parseVueSfc } from "./sfc-parser.mjs";
import { getRules } from "./rules/index.mjs";

export const UI_CONTRACT_SCHEMA = "wl-ui-contract.v1";

const COMPONENTS = [
  { pattern: /<BaseTable\b|<base-table\b/g, family: "table", implementation: "BaseTable" },
  { pattern: /<el-table\b/g, family: "table", implementation: "ElementTable" },
  { pattern: /<ag-grid(?:-vue3)?\b/g, family: "table", implementation: "AGGrid" },
  { pattern: /<BaseQuery\b|<base-query\b/g, family: "query", implementation: "BaseQuery" },
  { pattern: /<el-form\b/g, family: "form", implementation: "ElementForm" },
  { pattern: /<BaseToolbar\b|<base-toolbar\b/g, family: "toolbar", implementation: "BaseToolbar" },
  { pattern: /<el-dialog\b/g, family: "dialog", implementation: "ElementDialog" },
  { pattern: /<el-drawer\b/g, family: "drawer", implementation: "ElementDrawer" },
  { pattern: /<el-tree\b/g, family: "tree", implementation: "ElementTree" },
  { pattern: /<el-tabs\b/g, family: "tabs", implementation: "ElementTabs" },
  { pattern: /<el-descriptions\b/g, family: "detail", implementation: "ElementDescriptions" },
  { pattern: /<el-pagination\b|<jh-pagination\b/g, family: "pagination", implementation: "Pagination" },
  { pattern: /<el-upload\b/g, family: "upload", implementation: "ElementUpload" },
];

const ACTION_SEMANTICS = [
  { pattern: /新增|新建|添加|创建|\bcreate\b|\badd\b/i, semantic: "create" },
  { pattern: /查询|搜索|检索|\bsearch\b|\bquery\b/i, semantic: "search" },
  { pattern: /重置|刷新|\breset\b|\brefresh\b/i, semantic: "reset" },
  { pattern: /保存|确定|提交|\bsave\b|\bconfirm\b|\bsubmit\b/i, semantic: "confirm" },
  { pattern: /取消|关闭|\bcancel\b|\bclose\b/i, semantic: "cancel" },
  { pattern: /编辑|修改|\bedit\b/i, semantic: "edit" },
  { pattern: /删除|移除|\bdelete\b|\bremove\b/i, semantic: "delete" },
  { pattern: /导入|上传|\bimport\b|\bupload\b/i, semantic: "import" },
  { pattern: /导出|下载|\bexport\b|\bdownload\b/i, semantic: "export" },
];

const FORBIDDEN_KEYS = new Set([
  "api",
  "code",
  "endpoint",
  "field",
  "fields",
  "label",
  "request",
  "response",
  "sourceCode",
  "template",
  "text",
  "url",
]);

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function countMatches(text, pattern) {
  pattern.lastIndex = 0;
  let count = 0;
  while (pattern.exec(text)) count += 1;
  return count;
}

function componentCapabilities(family, template) {
  const capabilities = [];
  if (family === "table") {
    if (/type\s*=\s*["']selection["']|rowSelection\b/.test(template)) {
      capabilities.push("selection");
    }
    if (/label\s*=\s*["']操作["']|renderOps\b|jh-op-btn/.test(template)) {
      capabilities.push("operations");
    }
    if (/<el-pagination\b|<jh-pagination\b|\bpagination\b/i.test(template)) {
      capabilities.push("pagination");
    }
  }
  if (family === "form" || family === "query") {
    if (/<el-date-picker\b|<el-time-picker\b/.test(template)) capabilities.push("date-range");
    if (/<el-select\b/.test(template)) capabilities.push("selection-input");
  }
  if (family === "upload") capabilities.push("file-transfer");
  return uniqueSorted(capabilities);
}

function extractComponents(template) {
  return COMPONENTS.map((definition) => ({
    family: definition.family,
    implementation: definition.implementation,
    count: countMatches(template, definition.pattern),
    capabilities: componentCapabilities(definition.family, template),
  })).filter((item) => item.count > 0);
}

function actionLocation(template, index) {
  const prefix = template.slice(Math.max(0, index - 800), index).toLowerCase();
  if (/(toolbar|operation-bar|table-tools|base-toolbar)[^<]*$/.test(prefix)) return "toolbar";
  if (/<el-dialog\b[\s\S]*$/i.test(prefix)) return "dialog";
  if (/<el-table-column\b[\s\S]*$/i.test(prefix)) return "table-row";
  if (/<el-form\b[\s\S]*$/i.test(prefix)) return "form";
  return "page";
}

function extractActions(template) {
  const actions = [];
  const buttons = /<(?:el-button|ElButton)\b([^>]*)>([\s\S]*?)<\/(?:el-button|ElButton)>/g;
  let match;
  while ((match = buttons.exec(template)) !== null) {
    const evidence = `${match[1]} ${match[2]}`.replace(/<[^>]+>/g, " ");
    const semantic =
      ACTION_SEMANTICS.find((item) => item.pattern.test(evidence))?.semantic ||
      "other";
    actions.push({
      semantic,
      location: actionLocation(template, match.index),
      size: /\bsize\s*=\s*["']small["']/.test(match[1]) ? "small" : "unspecified",
      icon: /\b(?:icon|:icon)\s*=|<el-icon\b|<ElIcon\b/.test(match[0]),
    });
  }
  return actions;
}

function inferRegions(template, coverage) {
  const regions = [];
  if (/<BaseQuery\b|<base-query\b|<el-form\b/.test(template)) regions.push("query");
  if (/<BaseToolbar\b|<base-toolbar\b|toolbar|operation-bar|table-tools/i.test(template)) regions.push("toolbar");
  if (/<BaseTable\b|<base-table\b|<el-table\b|<ag-grid/i.test(template)) regions.push("table");
  if (/<el-pagination\b|<jh-pagination\b|\bpagination\b/i.test(template)) regions.push("pagination");
  if (/<el-dialog\b/.test(template)) regions.push("dialog");
  if (/<el-drawer\b/.test(template)) regions.push("drawer");
  if (/<el-tree\b/.test(template)) regions.push("tree");
  if (/<el-descriptions\b/.test(template)) regions.push("detail");
  return uniqueSorted([...regions, ...(coverage.layouts || [])]);
}

function inferLayout(coverage, regions) {
  if (coverage.layouts?.[0]) return coverage.layouts[0];
  if (coverage.businessScenarios?.includes("query-table")) return "list-page";
  if (regions.includes("table")) return "table-page";
  if (regions.includes("form")) return "form-page";
  return "component-page";
}

function observedRules(parsed) {
  const ids = [];
  for (const rule of getRules()) {
    if (typeof rule.check === "function") {
      ids.push(...rule.check(parsed.template.text, "contract.vue", parsed.template.lineOffset).map((issue) => issue.rule));
    }
    for (const style of parsed.styles) {
      if (typeof rule.checkStyle === "function") {
        ids.push(...rule.checkStyle(style.text, "contract.vue", style.lineOffset).map((issue) => issue.rule));
      }
    }
    for (const script of parsed.scripts) {
      if (typeof rule.checkScript === "function") {
        ids.push(...rule.checkScript(script.text, "contract.vue", script.lineOffset).map((issue) => issue.rule));
      }
    }
  }
  return uniqueSorted(ids);
}

function requiredRules(template, components, actions) {
  const required = [];
  if (components.some((item) => item.family === "table")) required.push("R001", "R002");
  if (actions.length > 0) required.push("R005", "R041");
  if (/<el-(?:input|select|date-picker|time-picker)\b/.test(template)) required.push("R006");
  if (/<el-(?:date-picker|time-picker)\b/.test(template)) required.push("R007", "R042");
  return uniqueSorted(required);
}

function tokensFrom(parsed) {
  const tokens = [];
  for (const style of parsed.styles) {
    for (const match of style.text.matchAll(/var\((--(?:el|wl|wk)-[a-z0-9-]+)/gi)) {
      tokens.push(match[1]);
    }
  }
  return uniqueSorted(tokens);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function fingerprintPayload(contract) {
  const semantic = { ...contract };
  delete semantic.fingerprint;
  delete semantic.id;
  delete semantic.source;
  return semantic;
}

export function fingerprintUiContract(contract) {
  return createHash("sha256")
    .update(JSON.stringify(stable(fingerprintPayload(contract))))
    .digest("hex");
}

export function extractUiContract({
  content,
  domain,
  filename = "page.vue",
  id,
  mode = "native",
  parser = "auto",
  projectRoot = process.cwd(),
  scenario,
}) {
  if (!content) throw new Error("extractUiContract 需要 Vue SFC content");
  if (!domain) throw new Error("ui-contract 必须声明 domain");
  if (!new Set(["native", "skin"]).has(mode)) {
    throw new Error("ui-contract mode 仅支持 native / skin");
  }

  const parsed = parseVueSfc(content, { filename, mode: parser, projectRoot });
  const collector = createCoverageCollector();
  collector.addFile(basename(filename), parsed.template.text, content);
  const coverage = collector.result();
  const resolvedScenario = scenario || coverage.businessScenarios[0] || "general";
  const components = extractComponents(parsed.template.text);
  const actions = extractActions(parsed.template.text);
  const regions = inferRegions(parsed.template.text, coverage);
  const constraints = [];
  if (components.some((item) => item.family === "table")) constraints.push("default-table-axis-center");
  if (actions.length > 0) constraints.push("small-icon-actions");
  if (/<el-(?:date-picker|time-picker)\b/.test(parsed.template.text)) constraints.push("teleported-picker-geometry-isolated");

  const contract = {
    schema: UI_CONTRACT_SCHEMA,
    id: id || `${domain}.${resolvedScenario}.${mode}`,
    visibility: "project-private",
    domain,
    scenario: resolvedScenario,
    mode,
    source: {
      file: basename(filename),
      hash: createHash("sha256").update(content).digest("hex"),
      parser: parsed.parser,
    },
    layout: {
      kind: inferLayout(coverage, regions),
      regions,
    },
    components,
    actions,
    rules: {
      required: requiredRules(parsed.template.text, components, actions),
      observed: observedRules(parsed),
    },
    tokens: tokensFrom(parsed),
    constraints: uniqueSorted(constraints),
  };
  return { ...contract, fingerprint: fingerprintUiContract(contract) };
}

export function extractUiContractFromFile(path, options = {}) {
  const absolutePath = resolve(path);
  return extractUiContract({
    ...options,
    content: readFileSync(absolutePath, "utf8"),
    filename: absolutePath,
    projectRoot: options.projectRoot || process.cwd(),
  });
}

function walkForbidden(value, path = "$", errors = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForbidden(item, `${path}[${index}]`, errors));
    return errors;
  }
  if (!value || typeof value !== "object") return errors;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${path}.${key} 禁止保存源码、业务文案、接口或字段信息`);
    walkForbidden(child, `${path}.${key}`, errors);
  }
  return errors;
}

export function validateUiContract(input) {
  const contract = typeof input === "string" ? JSON.parse(input) : input;
  const errors = [];
  const warnings = [];
  if (!contract || typeof contract !== "object") errors.push("contract 必须是 JSON object");
  if (contract?.schema !== UI_CONTRACT_SCHEMA) errors.push(`schema 必须为 ${UI_CONTRACT_SCHEMA}`);
  for (const key of ["id", "domain", "scenario", "mode", "fingerprint"]) {
    if (typeof contract?.[key] !== "string" || !contract[key]) errors.push(`${key} 必须是非空字符串`);
  }
  if (!Array.isArray(contract?.components)) errors.push("components 必须是数组");
  if (!Array.isArray(contract?.actions)) errors.push("actions 必须是数组");
  if (!Array.isArray(contract?.layout?.regions)) errors.push("layout.regions 必须是数组");
  errors.push(...walkForbidden(contract));
  if (contract?.visibility !== "project-private") {
    warnings.push("共享前必须完成脱敏审计；推荐默认 visibility=project-private");
  }
  const expectedFingerprint = contract ? fingerprintUiContract(contract) : "";
  if (contract?.fingerprint && contract.fingerprint !== expectedFingerprint) {
    errors.push("fingerprint 与当前语义结构不一致");
  }
  return { ok: errors.length === 0, errors, warnings, fingerprint: expectedFingerprint };
}

function jaccard(left, right) {
  const a = new Set(left || []);
  const b = new Set(right || []);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  return [...a].filter((item) => b.has(item)).length / union.size;
}

function similarity(query, candidate) {
  if (query.fingerprint === candidate.fingerprint) return 1;
  const queryFamilies = query.components?.map((item) => item.family) || [];
  const candidateFamilies = candidate.components?.map((item) => item.family) || [];
  return (
    (query.domain === candidate.domain ? 0.25 : 0) +
    (query.scenario === candidate.scenario ? 0.25 : 0) +
    (query.mode === candidate.mode ? 0.1 : 0) +
    (query.layout?.kind === candidate.layout?.kind ? 0.15 : 0) +
    jaccard(queryFamilies, candidateFamilies) * 0.15 +
    jaccard(query.layout?.regions, candidate.layout?.regions) * 0.1
  );
}

export function matchUiContracts(query, candidates, { limit = 5 } = {}) {
  return candidates
    .map((candidate) => ({
      id: candidate.id,
      domain: candidate.domain,
      scenario: candidate.scenario,
      mode: candidate.mode,
      layout: candidate.layout?.kind || null,
      fingerprint: candidate.fingerprint,
      score: Number(similarity(query, candidate).toFixed(4)),
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, Math.max(1, Number(limit) || 5));
}

export function readUiContractLibrary(directory, options = {}) {
  const report = { root: resolve(directory), status: "empty", complete: true, contracts: [], readFiles: [], skipped: [], gaps: [] };
  try {
    const boundary = realpathSync(resolve(options.projectRoot || directory));
    const state = { report, boundary, active: new Set(), directories: new Set(), files: new Set() };
    const actual = boundedLibraryPath(report.root, state);
    if (!statSync(actual).isDirectory()) {
      libraryGap(state, report.root, "not-directory");
    } else walkLibraryNode(report.root, state);
  } catch (error) {
    report.gaps.push({ path: report.root, code: libraryErrorCode(error) });
  }
  report.complete = report.gaps.length === 0;
  report.status = report.contracts.length > 0 ? "complete" : "empty";
  if (!report.complete) report.status = "gap";
  return report;
}

export function loadUiContractLibrary(directory, options = {}) {
  const report = readUiContractLibrary(directory, options);
  if (!report.complete) {
    const error = new Error(`ui-contract library 加载不完整：${report.gaps.map((gap) => `${gap.code}: ${gap.path}`).join("；")}`);
    error.code = "ui-contract-library-gap";
    const library = { ...report };
    delete library.contracts;
    error.library = library;
    throw error;
  }
  return report.contracts;
}

function boundedLibraryPath(path, state) {
  const actual = realpathSync(path);
  const rel = relative(state.boundary, actual);
  if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || isAbsolute(rel)) {
    const error = new Error("契约库输入必须位于实际项目根内");
    error.code = "outside-project";
    throw error;
  }
  return actual;
}

function libraryErrorCode(error) {
  if (error.code === "ENOENT" || error.code === "ENOTDIR") return "missing-input";
  if (error.code === "ELOOP") return "symlink-cycle";
  if (error.code === "EACCES" || error.code === "EPERM") return "unreadable-input";
  return error.code || "unreadable-input";
}

function libraryGap(state, path, code) {
  state.report.gaps.push({ path: relative(state.report.root, path) || ".", code });
}

function walkLibraryNode(path, state) {
  try {
    const actual = boundedLibraryPath(path, state);
    const stat = statSync(actual);
    if (stat.isDirectory()) walkLibraryDirectory(path, actual, state);
    else if (stat.isFile()) readLibraryFile(path, actual, state);
    else libraryGap(state, path, "unsupported-entry");
  } catch (error) { libraryGap(state, path, libraryErrorCode(error)); }
}

function walkLibraryDirectory(path, actual, state) {
  if (state.active.has(actual)) return libraryGap(state, path, "symlink-cycle");
  if (state.directories.has(actual)) {
    state.report.skipped.push({ path: relative(state.report.root, path) || ".", reason: "duplicate-directory" });
    return;
  }
  state.directories.add(actual);
  state.active.add(actual);
  try {
    for (const entry of readdirSync(actual).sort()) walkLibraryNode(join(path, entry), state);
  } finally { state.active.delete(actual); }
}

function readLibraryFile(path, actual, state) {
  const local = relative(state.report.root, path);
  if (extname(path) !== ".json") {
    state.report.skipped.push({ path: local, reason: "not-json" });
    return;
  }
  if (state.files.has(actual)) {
    state.report.skipped.push({ path: local, reason: "duplicate-file" });
    return;
  }
  state.files.add(actual);
  const text = readFileSync(actual, "utf8");
  state.report.readFiles.push(relative(state.boundary, actual));
  let contract;
  try { contract = JSON.parse(text); } catch { return libraryGap(state, path, "invalid-json"); }
  if (contract?.schema !== UI_CONTRACT_SCHEMA) {
    state.report.skipped.push({ path: local, reason: "not-ui-contract" });
    return;
  }
  if (!validateUiContract(contract).ok) return libraryGap(state, path, "invalid-contract");
  state.report.contracts.push(contract);
}
