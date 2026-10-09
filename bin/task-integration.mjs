import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { join, relative, resolve, isAbsolute } from "node:path";
import { parseArgs } from "node:util";
import core from "./task-observability.cjs";
import { GATEWAY_PATH } from "./task-gateway.mjs";
import { resolveProjectProfile } from "../standards/profiles-loader.mjs";
import { getRules } from "../scanner/rules/index.mjs";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const POLICY = {
  domainKeywords: ["UI", "Vue", "前端", "样式", "布局", "颜色", "视觉", "Element Plus", "按钮", "表格", "表单"],
  domainExtensions: [".vue", ".scss", ".css"], negativeKeywords: ["写诗", "诗歌", "旅游", "旅行", "天气", "做饭"],
  baselineRules: ["R001", "R006", "R043"], baselineChecks: ["scan"], minimumScore: 1, minimumMargin: 1,
  unsupportedIntents: ["生成图像", "生成图片", "Figma设计稿导出"],
};
const TRIGGERS = {
  "element/el-table": ["表格", "table", "el-table"], "element/el-form": ["表单", "查询表单", "el-form"],
  "element/el-dialog": ["弹窗", "dialog", "el-dialog"], "element/el-tag": ["标签颜色", "状态标签", "el-tag"],
  "element/component-family": ["卡片", "页签", "抽屉", "el-tabs", "上传控件"],
  "runtime/design-tokens": ["设计令牌", "design tokens", "颜色硬编码", "tokens"],
  "runtime/style-align": ["样式统一", "风格对齐", "样式不生效"], "runtime/migration": ["runtime迁移", "样式迁移"],
  "ops/scan": ["UI扫描", "UI检查", "样式扫描"], "ops/audit": ["UI审计", "视觉审计"],
  "ops/fix": ["UI修复", "修复样式", "统一视觉"], "ops/migrate": ["UI迁移", "迁移tokens"],
  "layouts/list-page": ["列表布局"], "layouts/detail-page": ["详情布局"], "layouts/form-dialog": ["表单弹窗布局"], "layouts/tree-list": ["树列表布局"],
  "vendors/ag-grid": ["AG Grid", "ag-grid"], "vendors/base-table": ["BaseTable"], "vendors/jh-components": ["jh组件"],
  "vendors/c-components": ["C组件"], "vendors/custom-wrappers": ["自定义封装组件"], "vendors/unknown-wrapper": ["未知封装组件"],
};

function catalogFiles(dir, result = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) catalogFiles(full, result);
    else if (entry.name === "SKILL.md") result.push(full);
  }
  return result;
}

export function taskCatalog() {
  return catalogFiles(join(root, "skills")).map((file) => {
    const id = relative(join(root, "skills"), file).replace(/\\/g, "/").replace(/\/SKILL\.md$/, "");
    const content = readFileSync(file, "utf8");
    return { id, path: `node_modules/${pkg.name}/skills/${id}/SKILL.md`, description: content.match(/^# (.+)$/m)?.[1] || id, triggers: TRIGGERS[id] || [], rules: getRules().filter((rule) => rule.skills?.includes(id)).map((rule) => rule.id), checks: ["scan"], status: "enabled" };
  });
}

export function taskOptions(projectRoot, extra = {}) {
  const actualRoot = realpathSync(resolve(projectRoot));
  return { projectRoot: actualRoot, packageName: pkg.name, packageVersion: pkg.version, storageDir: ".wl-skills-ui/runs",
    ruleFiles: projectEvidencePaths(actualRoot, [join(root, "standards/rules.json"), join(root, "scanner/rules")]),
    configFiles: projectEvidencePaths(actualRoot, ["package.json", ".wl-ui-profile.json", ".wl-exempt.json"].map((rel) => join(actualRoot, rel))), ...extra };
}

function projectEvidencePaths(projectRoot, candidates) {
  return candidates.filter((candidate) => existsSync(candidate)).map((candidate) => relative(projectRoot, realpathSync(candidate)).replace(/\\/g, "/"))
    .filter((rel) => rel && !rel.startsWith("../") && !isAbsolute(rel));
}

export function decideTask(input) {
  const catalog = taskCatalog();
  const decision = core.evaluateTask({ ...input, catalog, policy: POLICY });
  if (input.skill && !catalog.some((skill) => skill.id === input.skill)) return capabilityGap(decision, `本包未发布专项 Skill：${input.skill}`);
  if (POLICY.unsupportedIntents.some((intent) => String(input.task).includes(intent))) return capabilityGap(decision, "本包没有图像生成或设计稿导出的执行器");
  return decision;
}

function capabilityGap(decision, reason) {
  return { ...decision, routingStatus: decision.status, status: "gap", applicable: true, ready: false, selectedSkills: [], requiredFiles: [], reasons: [...decision.reasons, reason], reason, gaps: [{ reason, suggestion: "提交本包专项技能/执行器提案并审阅验证，不自动修改技能或安装兄弟包" }] };
}

export function runTaskAction(action, input = {}) {
  const opts = taskOptions(input.projectRoot || process.env.WL_PROJECT_ROOT || process.cwd(), { runId: input.runId, targets: input.targets || [] });
  if (action === "status") return core.readStatus(opts);
  if (action === "doctor-host") return hostDiagnostic({ ...opts, host: input.host || "unknown" });
  const profile = resolveProjectProfile({ projectRoot: opts.projectRoot, profile: input.profile }).profile;
  const routed = decideTask({ task: input.task || "", targets: opts.targets, skill: input.skill });
  const applicable = getRules({ profile: profile.id });
  const enabled = new Set(applicable.map((rule) => rule.id));
  const decision = { ...routed, profile: profile.id, applicableConstraints: routed.applicable === true ? [...enabled] : [] };
  decision.baselineRules = decision.baselineRules.filter((id) => enabled.has(id));
  decision.requiredRules = decision.requiredRules.filter((id) => enabled.has(id));
  decision.ruleDetails = applicable.filter((rule) => decision.requiredRules.includes(rule.id)).map((rule) => ({ id: rule.id, name: rule.title, source: `node_modules/${pkg.name}/standards/rules.json` }));
  assetReadiness(decision, opts.projectRoot);
  if (action !== "task") return core.attachNotice(decision, opts);
  return core.attachNotice({ ...decision, ...core.startTask({ ...opts, task: input.task || "", decision }) }, opts);
}

function hostDiagnostic(opts) {
  const entries = new Map([["claude", ["CLAUDE.md"]], ["claude-code", ["CLAUDE.md"]], ["copilot", [".github/instructions/wk-skills/ops-scan.instructions.md"]], ["github-copilot", [".github/instructions/wk-skills/ops-scan.instructions.md"]], ["cursor", [".cursor/rules/ops-scan.mdc"]]]);
  return core.doctorHost({ ...opts, gatewayPath: GATEWAY_PATH, entryFiles: entries.get(opts.host) || ["AGENTS.md"], skillPaths: [`node_modules/${pkg.name}/SKILL.md`] });
}

function assetReadiness(decision, projectRoot) {
  if (decision.applicable !== true) return;
  const required = [...decision.requiredFiles, `node_modules/${pkg.name}/SKILL.md`, `node_modules/${pkg.name}/standards/rules.json`];
  const missing = required.filter((rel) => !existsSync(join(projectRoot, rel)));
  decision.ready = decision.ready !== false && missing.length === 0;
  decision.missingInputs = missing;
  if (missing.length) {
    decision.routingStatus ||= decision.status;
    decision.status = "gap";
    decision.reasons.push("本包所需 canonical Skill/规则入口未安装到目标项目");
    decision.reason = decision.reasons.join("；");
    decision.gaps.push({ reason: "本包所需 canonical Skill/规则入口未安装到目标项目", paths: missing, suggestion: "安装/更新本包项目依赖及本包入口后重新判定；不需要安装兄弟包" });
  }
}

export function taskCli(action, args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    target: { type: "string", multiple: true }, project: { type: "string" }, text: { type: "string" },
    "run-id": { type: "string" }, host: { type: "string" }, skill: { type: "string" }, profile: { type: "string" }, json: { type: "boolean" },
  } });
  const result = runTaskAction(action, { projectRoot: values.project, task: values.text || positionals.join(" "), targets: values.target, runId: values["run-id"], host: values.host, profile: values.profile, skill: values.skill });
  if (values.json || action === "doctor-host") console.log(JSON.stringify(result));
  else if (action === "status") console.log(core.formatStatus(result));
  else console.log(`${core.formatDecision(result)}${result.runId ? `\nrunId: ${result.runId}` : ""}`);
  return result;
}

export function beginUiCheck(projectRoot, targets, tool, runId, extra = {}) {
  const opts = taskOptions(projectRoot, { targets, tool, runId, readOnlyVerification: true, ...extra });
  return { opts, handle: core.beginExecution(opts) };
}

export function finishUiCheck(execution, facts) {
  const receipt = core.finishExecution(execution.handle, facts);
  return { runId: receipt.runId, executionStatus: receipt.executionStatus, validationStatus: receipt.validationStatus, receiptPath: receipt.recordPath };
}

export function scanFacts(result, issues = result.issues || result.allIssues) {
  const checked = result.fileCount - result.exemptFileCount;
  const errors = issues.filter((issue) => issue.severity === "error").length;
  return {
    exitCode: 0, validationStatus: checked > 0 ? errors > 0 ? "failed" : "passed" : "unverified",
    checkedFiles: result.checkedFiles || [],
    checks: checked > 0 ? [{ id: "scan", status: errors > 0 ? "failed" : "passed", reason: `${checked} non-exempt Vue files actually scanned` }, parserFact(result.parsing), ...result.ruleExecutions.map((item) => ruleFact(item, issues))] : [{ id: "scan", status: "skipped", reason: "No non-exempt Vue file scanned" }],
    summary: { files: result.fileCount, checkedFiles: checked, exemptFiles: result.exemptFileCount, errors, parsing: result.parsing, rules: result.ruleExecutions },
  };
}

export function integrationFacts(checks, exitCode = 0) {
  return { exitCode, validationStatus: checks.some((check) => !check.ok) ? "failed" : "passed", checks: checks.map((check) => ({ id: check.id, status: check.ok ? "passed" : "failed", reason: check.description })), summary: { scope: "dependency-and-runtime-integration-only", sourceRulesVerified: false } };
}

function parserFact(parsing) {
  if (parsing.errors?.length) return { id: "sfc-parse", status: "failed", reason: `${parsing.errors.length} actual compiler parse errors` };
  if (parsing.used.fast > 0) return { id: "sfc-parse", status: "skipped", reason: "Fast parser extracts blocks; it does not validate Vue syntax" };
  return { id: "sfc-parse", status: "passed", reason: "Actual compiler SFC parse; script type correctness is outside this check" };
}

function ruleFact(item, issues) {
  if (!item.calls) return { id: item.id, status: "skipped", reason: "No matching rule callback invoked" };
  const active = issues.filter((issue) => issue.rule === item.id);
  if (active.some((issue) => issue.severity === "error")) return { id: item.id, status: "failed", reason: `${item.calls} actual callbacks; active errors` };
  if (item.errors > 0) return { id: item.id, status: "not-applicable", reason: "Callbacks executed; detected errors excluded from requested result by filters/exemptions" };
  if (active.some((issue) => issue.severity === "review")) return { id: item.id, status: "unverified", reason: "Rule requires business/human review" };
  return { id: item.id, status: "passed", reason: `${item.calls} actual callbacks; no active error; semantic applicability not asserted` };
}

export { core };
