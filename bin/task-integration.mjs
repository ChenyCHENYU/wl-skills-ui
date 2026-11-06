import { readFileSync, readdirSync, existsSync, realpathSync, statSync, accessSync, constants } from "node:fs";
import { join, relative, resolve, isAbsolute, sep } from "node:path";
import { parseArgs } from "node:util";
import core from "./task-observability.cjs";
import projectScope from "./project-scope.cjs";
import taskIntent from "./task-intent.cjs";
import resultCore from "./integration-result.cjs";
import { GATEWAY_PATH } from "./task-gateway.mjs";
import { TASK_OPTIONS } from "./cli-catalog.mjs";
import { resolveProjectProfile } from "../standards/profiles-loader.mjs";
import { getRules } from "../scanner/rules/index.mjs";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const POLICY = {
  domainKeywords: ["UI", "Vue", "前端", "样式", "美化", "beautify", "界面", "交互", "布局", "排版", "间距", "滚动", "颜色", "视觉", "主题", "暗色", "深色", "Element Plus", "控件", "按钮", "表格", "表单", "showColon", "BaseForm", "BaseQuery"],
  domainExtensions: [".vue", ".scss", ".css"], negativeKeywords: ["写诗", "诗歌", "旅游", "旅行", "天气", "做饭"],
  baselineRules: ["R001", "R006", "R043"], baselineChecks: ["scan"], minimumScore: 1, minimumMargin: 1,
  unsupportedIntents: ["生成图像", "生成图片", "Figma设计稿导出"],
};
const TRIGGERS = JSON.parse(readFileSync(join(root, "bin/task-triggers.json"), "utf8"));

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
  const rules = getRules();
  const packageRoot = realpathSync(root);
  return catalogFiles(join(root, "skills")).map((file) => {
    const id = relative(join(root, "skills"), file).replace(/\\/g, "/").replace(/\/SKILL\.md$/, "");
    const resourcePath = realpathSync(file);
    if (!resourcePath.startsWith(packageRoot + sep) || !statSync(resourcePath).isFile()) throw new Error(`${id}: canonical Skill 不在当前包内`);
    const content = readFileSync(resourcePath, "utf8");
    const metadata = skillMetadata(content, id);
    const routing = Array.isArray(TRIGGERS[id]) ? { triggers: TRIGGERS[id] } : TRIGGERS[id] || {};
    return { id, name: metadata.name, path: `node_modules/${pkg.name}/skills/${id}/SKILL.md`, resourcePath, description: metadata.description, triggers: routing.triggers || [], intentPatterns: routing.intentPatterns || [], refines: routing.refines || [], rules: rules.filter((rule) => rule.skills?.includes(id)).map((rule) => rule.id), checks: ["scan"], status: "enabled" };
  });
}

function skillMetadata(content, id) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
  const descriptionField = frontmatter.match(/^description:\s*([^\r\n]*)(?:\r?\n|$)/m);
  let description = descriptionField?.[1]?.trim() || "";
  if (["|", ">"].includes(description)) {
    const lines = [];
    for (const line of frontmatter.slice(descriptionField.index + descriptionField[0].length).split(/\r?\n/)) {
      if (line.trim() && !/^\s+/.test(line)) break;
      if (line.trim()) lines.push(line.trim());
    }
    description = lines.join(" ");
  } else if (description.startsWith('"') && description.endsWith('"')) description = JSON.parse(description);
  else if (description.startsWith("'") && description.endsWith("'")) description = description.slice(1, -1);
  const name = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!name || !description) throw new Error(`${id}: canonical Skill 缺少中文名称或用途描述`);
  return { name, description };
}

export function taskOptions(projectRoot, extra = {}) {
  const actualRoot = realpathSync(resolve(projectRoot));
  return { projectRoot: actualRoot, packageName: pkg.name, packageVersion: pkg.version, storageDir: ".wl-skills/state/ui/runs",
    ruleFiles: projectEvidencePaths(actualRoot, [join(root, "standards/rules.json"), join(root, "scanner/rules")]),
    configFiles: projectEvidencePaths(actualRoot, ["package.json", ".wl-skills/config.json", ".wl-ui-profile.json", ".wl-exempt.json"].map((rel) => join(actualRoot, rel))), ...extra };
}

function projectEvidencePaths(projectRoot, candidates) {
  return candidates.filter((candidate) => existsSync(candidate)).map((candidate) => projectEvidencePath(projectRoot, candidate)).filter(Boolean);
}

function evidenceRelative(projectRoot, target) {
  const value = relative(projectRoot, target);
  return value && value !== ".." && !value.startsWith("../") && !value.startsWith("..\\") && !isAbsolute(value) ? value.replace(/\\/g, "/") : null;
}

function projectEvidencePath(projectRoot, candidate) {
  const physical = realpathSync(candidate);
  const local = evidenceRelative(projectRoot, physical);
  if (local) return local;
  const dependency = join(projectRoot, "node_modules", pkg.name);
  if (!existsSync(dependency)) return null;
  const internal = evidenceRelative(realpathSync(dependency), physical);
  // The shared reader still verifies package identity and its own realpath boundary.
  return internal ? `node_modules/${pkg.name}/${internal}` : null;
}

export function decideTask(input) {
  const declared = taskCatalog();
  const active = taskIntent.analyzeTask(input.task).activeText;
  const catalog = scopedCatalog(declared, active);
  const explicit = input.skill && catalog.find((skill) => skill.id === input.skill);
  const signals = Array.isArray(input.context?.signals) ? input.context.signals : [];
  const selectedInput = explicit ? { ...input, context: { ...input.context, domainRelevant: true, signals: [...signals, explicit.id] }, catalog: [{ ...explicit, triggers: [], contexts: [explicit.id] }] } : { ...input, catalog };
  let decision = core.evaluateTask({ ...selectedInput, policy: POLICY });
  if (explicit) {
    const reason = `显式选择 ${explicit.name}（${explicit.id}）；动作许可仍依据原始任务判定`;
    decision = { ...decision, selectionEvidence: "explicit-skill-id", reasons: [reason], reason };
  }
  const clauseSkills = independentClauseSkills(declared, catalog, active);
  if (!input.skill && (clauseSkills.length > 1 || decision.candidates.length > 1 && /并|同时|以及|分别|和|及|、|，|；/.test(active))) {
    const reason = "任务包含多个独立的视觉能力，请明确本次阶段或按能力分别执行并复用同一 runId";
    decision = { ...decision, status: "ambiguous", selectedSkills: [], skillDetails: [], requiredFiles: [], requiredChecks: [...POLICY.baselineChecks], requiredRules: [...POLICY.baselineRules], reasons: [reason], reason, independentSkills: [...new Set([...decision.candidates.map((skill) => skill.id), ...clauseSkills])] };
  }
  if (input.skill && !catalog.some((skill) => skill.id === input.skill)) return capabilityGap(decision, `本包未发布专项 Skill：${input.skill}`);
  if (POLICY.unsupportedIntents.some((intent) => taskIntent.phraseMatches(input.task, intent))) return capabilityGap(decision, "本包没有图像生成或设计稿导出的执行器");
  return decision;
}

function independentClauseSkills(declared, routed, active) {
  const refined = new Set(routed.filter((skill) => !skill.triggers.length).map((skill) => skill.id));
  const clauses = active.split(/，|；|(?:并且|同时|然后|并|以及)(?=\s*(?:请|再|另外|调整|修复|检查|审计|统一|迁移|扫描|整理))/);
  return [...new Set(clauses.flatMap((task) => {
    const selected = core.evaluateTask({ task, catalog: scopedCatalog(declared, task), policy: POLICY }).selectedSkills;
    // 后一句“检查封装表格”仍可指前一句的 BaseTable；只有明确另一对象
    // 才把已由上层能力覆盖的通用控件重新视为独立阶段。
    return selected.filter((id) => !refined.has(id) || /另一个|另一(?:个|张|处|份|套)|其他|别的|另外的/.test(task));
  }))];
}

function scopedCatalog(catalog, task) {
  const matched = catalog.map((skill) => ({ ...skill, triggers: [...new Set([...skill.triggers, ...skill.intentPatterns.flatMap((pattern) => task.match(new RegExp(pattern, "gi")) || [])])] }));
  const refinements = new Set(matched.filter((skill) => skill.triggers.some((trigger) => taskIntent.phraseMatches(task, trigger))).flatMap((skill) => skill.refines));
  return matched.map((skill) => refinements.has(skill.id) ? { ...skill, triggers: [] } : skill);
}

function capabilityGap(decision, reason) {
  return { ...decision, routingStatus: decision.status, status: "gap", applicable: true, ready: false, selectedSkills: [], skillDetails: [], requiredFiles: [], reasons: [...decision.reasons, reason], reason, gaps: [{ reason, suggestion: "提交本包专项技能/执行器提案并审阅验证，不自动修改技能或安装兄弟包" }] };
}

export function runTaskAction(action, input = {}) {
  const resolved = projectScope.resolveScope({ projectRoot: input.projectRoot || process.env.WL_PROJECT_ROOT || process.cwd(), packageName: pkg.name, targets: input.targets || [] });
  const opts = taskOptions(resolved.projectRoot, { runId: input.runId, targets: resolved.targets });
  if (action === "status") return taskResultReadiness(core.readStatus(opts), opts);
  if (action === "doctor-host") return hostDiagnostic({ ...opts, host: input.host || "unknown" });
  if (resolved.scope.status !== "applicable") return taskResultReadiness(core.attachNotice(projectScope.excludedDecision(resolved.scope), opts), opts);
  const profile = resolveProjectProfile({ projectRoot: opts.projectRoot, profile: input.profile }).profile;
  const routed = decideTask({ task: input.task || "", targets: opts.targets, skill: input.skill, context: input.context });
  const applicable = getRules({ profile: profile.id });
  const enabled = new Set(applicable.map((rule) => rule.id));
  const decision = { ...routed, scope: resolved.scope, profile: profile.id, applicableConstraints: routed.applicable === true ? [...enabled] : [] };
  decision.baselineRules = decision.baselineRules.filter((id) => enabled.has(id));
  decision.requiredRules = decision.requiredRules.filter((id) => enabled.has(id));
  const selectedRules = applicable.filter((rule) => decision.requiredRules.includes(rule.id));
  decision.requiredFiles = [...new Set([...decision.requiredFiles, ...selectedRules.flatMap(rule => (rule.references || []).map(file => `node_modules/${pkg.name}/${file}`))])];
  decision.ruleDetails = selectedRules.map((rule) => ({ id: rule.id, name: rule.title, source: `node_modules/${pkg.name}/${rule.references?.[0] || "standards/rules.json"}` }));
  assetReadiness(decision, opts.projectRoot);
  if (action !== "task") return taskResultReadiness(core.attachNotice(decision, opts), opts);
  const record = core.startTask({ ...opts, task: input.task || "", decision });
  return taskResultReadiness(core.attachNotice({ ...record.decision, ...record }, opts), opts);
}

function taskResultReadiness(result, opts) {
  const effective = resultCore.projectResult(result, opts, { packageName: pkg.name, packageVersion: pkg.version }).integration;
  return { ...result, ready: effective.scope?.status === "applicable" && effective.ready === true };
}

function hostDiagnostic(opts) {
  const packagePath = `node_modules/${pkg.name}`;
  // Use the published route inventory so a missing file does not disappear from the scan.
  const skillPaths = [`${packagePath}/SKILL.md`, ...Object.keys(TRIGGERS).map(id => `${packagePath}/skills/${id}/SKILL.md`)];
  return core.doctorHost({ ...opts, gatewayPath: GATEWAY_PATH, skillPaths });
}

function assetReadiness(decision, projectRoot) {
  if (decision.applicable !== true) return;
  const required = [...decision.requiredFiles, `node_modules/${pkg.name}/SKILL.md`, `node_modules/${pkg.name}/standards/rules.json`];
  const missing = required.filter((rel) => !isReadableAsset(join(projectRoot, rel)));
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

function isReadableAsset(file) {
  try {
    if (!statSync(file).isFile()) return false;
    accessSync(file, constants.R_OK);
    return true;
  } catch { return false; }
}

export function taskCli(action, args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: TASK_OPTIONS });
  const result = runTaskAction(action, { projectRoot: values.project, task: values.text || positionals.join(" "), targets: values.target, runId: values["run-id"], host: values.host, profile: values.profile, skill: values.skill });
  if (values.json) console.log(JSON.stringify(result));
  else if (action === "doctor-host") console.log(core.formatHostDiagnostic(result));
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
    checks: checked > 0 ? [{ id: "scan", status: errors > 0 ? "failed" : "passed", reason: `${checked} non-exempt source files actually scanned` }, parserFact(result.parsing), ...result.ruleExecutions.map((item) => ruleFact(item, issues))] : [{ id: "scan", status: "skipped", reason: "No non-exempt source file scanned" }],
    summary: { files: result.fileCount, checkedFiles: checked, exemptFiles: result.exemptFileCount, errors, parsing: result.parsing, rules: result.ruleExecutions },
  };
}

export function integrationFacts(checks, exitCode = 0) {
  return { exitCode, validationStatus: checks.some((check) => !check.ok) ? "failed" : "passed", checks: checks.map((check) => ({ id: check.id, status: check.ok ? "passed" : "failed", reason: check.description })), summary: { scope: "dependency-and-runtime-integration-only", sourceRulesVerified: false } };
}

function parserFact(parsing) {
  if (parsing.errors?.length) return { id: "sfc-parse", status: "failed", reason: `${parsing.errors.length} actual compiler parse errors` };
  if (parsing.used.fast > 0) return { id: "sfc-parse", status: "skipped", reason: "Fast parser extracts blocks; it does not validate Vue syntax" };
  if (parsing.used.script > 0) return { id: "sfc-parse", status: "passed", reason: `Actual JS/TS AST parse for ${parsing.used.script} source files; script type correctness is outside this check` };
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
