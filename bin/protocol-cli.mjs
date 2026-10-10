/**
 * protocol-cli.mjs — ui 的公开集成协议接线（薄层）
 *
 * 协议实现来自快照 bin/integration-protocol.cjs（单源 conformance/support，勿改）；
 * 本文件只提供 ui 的能力目录、操作映射，并复用 task-integration 的原执行器。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { runTaskAction, taskCatalog } from "./task-integration.mjs";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const capabilitiesDocument = require("./capabilities.json");
const { createProtocol } = require("./integration-protocol.cjs");

const BIN = "wl-ui";
const OPERATIONS = [
  { id: "route", summary: "只读任务判定：视觉/样式域技能、约束、歧义与缺口", readOnly: true, required: ["task"], optional: ["targets", "profile", "skill", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} route --text "<task>"` },
  { id: "explain", summary: "解释本次任务判定（只读，不记录）", readOnly: true, required: ["task"], optional: ["targets", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} explain --text "<task>"` },
  { id: "task", summary: "判定并持久化任务计划（尚未执行扫描或修复）", readOnly: false, required: ["task"], optional: ["runId", "targets", "profile", "projectRoot"], sideEffects: "写入 .wl-skills-ui/runs/ 下本包任务记录", mapping: `${BIN} task --text "<task>" [--run-id <id>]` },
  { id: "status", summary: "读取本包执行/校验记录与新鲜度", readOnly: true, required: [], optional: ["runId", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} status [--run-id <id>]` },
  { id: "doctor-host", summary: "宿主入口静态诊断（不证明宿主已加载）", readOnly: true, required: [], optional: ["host", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} doctor-host [--host <host>]` },
];

function buildInventory() {
  const commands = [
    { name: "init", args: "[--project <path>] [--editor <id>] [--profile <id>] [--skills-only] [--dry-run]", summary: "写入编辑器规则与技能", execution: "programmatic", sideEffects: "写入目标项目编辑器规则目录" },
    { name: "update", args: "[--project <path>] [--editor <id|all>] [--force] [--dry-run]", summary: "更新已安装 rules/MCP/提示", execution: "programmatic", sideEffects: "按 manifest 更新" },
    { name: "diff", args: "[--project <path>]", summary: "对比安装与 manifest", execution: "programmatic", sideEffects: "无" },
    { name: "clean", args: "[--project <path>] [--dry-run]", summary: "清理本包安装文件", execution: "programmatic", sideEffects: "删除本包登记文件" },
    { name: "scan", args: "[--project <path>] [--profile <id>]", summary: "R 规则扫描", execution: "programmatic", sideEffects: "无（报告输出）" },
    { name: "audit", args: "[--project <path>]", summary: "审计汇总", execution: "programmatic", sideEffects: "无" },
    { name: "check", args: "[--project <path>]", summary: "扫描+回执记录", execution: "programmatic", sideEffects: "写 .wl-skills-ui/runs/" },
    { name: "fix", args: "--run-id <id> --rule <id> [--confirm]", summary: "确定性修复（快照/回滚）", execution: "programmatic", sideEffects: "写源文件（确认制+快照回滚）" },
    { name: "snapshot", args: "/ drift / exempt", summary: "漂移基线管理", execution: "programmatic", sideEffects: "写基线文件" },
    { name: "contract", args: "<extract|validate|match>", summary: "ui-contract 提取/校验/匹配", execution: "programmatic", sideEffects: "extract 写契约文件" },
    { name: "doctor", args: "[--project <path>]", summary: "项目接入诊断", execution: "programmatic", sideEffects: "无" },
    { name: "task", args: "\"任务\" [--run-id <id>]", summary: "判定并持久化任务计划", execution: "programmatic", sideEffects: "写 .wl-skills-ui/runs/" },
    { name: "route", args: "\"任务\"", summary: "只读判定", execution: "programmatic", sideEffects: "无" },
    { name: "explain", args: "\"任务\"", summary: "只读判定解释", execution: "programmatic", sideEffects: "无" },
    { name: "status", args: "[--run-id <id>]", summary: "读取本包回执", execution: "programmatic", sideEffects: "无" },
    { name: "doctor-host", args: "[--host <name>]", summary: "宿主入口静态诊断", execution: "programmatic", sideEffects: "无" },
    { name: "protocol", args: "describe | request --input-file <file>", summary: "本公开集成协议", execution: "programmatic", sideEffects: "见操作声明" },
  ];
  const skills = [];
  const loadErrors = [];
  try {
    for (const skill of taskCatalog()) {
      skills.push({ id: skill.id, description: skill.description, triggers: skill.triggers, status: skill.status, entry: skill.path, execution: "instructional" });
    }
  } catch (error) {
    loadErrors.push(`skills 加载失败：${error.message}`);
  }
  // 与 mcp/server.js tools/list 对齐的 18 项（由 readiness 探针持续校验数量与名称一致）
  const mcpTools = [
    { name: "wl_ui_task", summary: "判定并持久化 UI 任务计划", write: "persist" },
    { name: "wl_ui_route", summary: "只读任务判定", write: "readonly" },
    { name: "wl_ui_explain", summary: "只读判定解释", write: "readonly" },
    { name: "wl_ui_status", summary: "读取执行回执", write: "readonly" },
    { name: "wl_ui_doctor_host", summary: "宿主入口静态诊断", write: "readonly" },
    { name: "wl_ui_check", summary: "执行 UI 检查并记录回执", write: "guarded" },
    { name: "wl_ui_scan", summary: "R 规则扫描", write: "readonly" },
    { name: "wl_ui_fix_dry_run", summary: "修复预演（不写盘）", write: "readonly" },
    { name: "wl_ui_skill_prompt", summary: "技能提示词", write: "readonly" },
    { name: "wl_ui_route_intent", summary: "意图路由", write: "readonly" },
    { name: "wl_ui_detect_skin", summary: "皮肤检测", write: "readonly" },
    { name: "wl_ui_list_rules", summary: "规则清单", write: "readonly" },
    { name: "wl_ui_describe_rule", summary: "规则详情", write: "readonly" },
    { name: "wl_ui_drift", summary: "漂移对比", write: "readonly" },
    { name: "wl_ui_recommend_flow", summary: "推荐流程", write: "readonly" },
    { name: "wl_ui_contract_extract", summary: "契约提取", write: "guarded" },
    { name: "wl_ui_contract_validate", summary: "契约校验", write: "readonly" },
    { name: "wl_ui_contract_match", summary: "契约匹配", write: "readonly" },
  ];
  return { skills, commands, mcpTools, loadErrors };
}

export const protocol = createProtocol({
  packageName: pkg.name,
  packageVersion: pkg.version,
  capabilities: capabilitiesDocument.capabilities || [],
  constraints: { projectScope: { config: ".wl-skills-scope.json", schema: "bin/project-scope.schema.json", adoption: "own-manifest-or-direct-dependency-or-explicit-enable", inheritance: "never-across-project-boundaries", excluded: ["mobile", "unadopted-project", "aggregate-workspace"] }, node: (pkg.engines && pkg.engines.node) || null, boundaryVersion: capabilitiesDocument.boundaryVersion || null },
  operations: OPERATIONS,
  inventory: buildInventory(),
});

export function runOperation(operation, input) {
  return runTaskAction(operation, {
    projectRoot: input.projectRoot || ".",
    task: input.task,
    targets: Array.isArray(input.targets) ? input.targets : [],
    runId: input.runId,
    skill: input.skill,
    host: input.host,
    profile: input.profile,
    context: input.context,
  });
}

function envelopeError(code, message, field) {
  return { protocolVersion: 1, package: pkg.name, packageVersion: pkg.version, operation: null, requestId: null, ok: false, error: { code, message, ...(field ? { field } : {}) }, diagnostics: [] };
}

export function runCli(argv) {
  const sub = argv[0];
  if (sub === "describe") {
    console.log(JSON.stringify(protocol.describe(), null, 2));
    return 0;
  }
  if (sub === "request") {
    const fileIndex = argv.indexOf("--input-file");
    const file = fileIndex >= 0 ? argv[fileIndex + 1] : null;
    if (!file) {
      console.log(JSON.stringify(envelopeError("missing-input", "缺少必要输入：--input-file <request.json>", "input-file"), null, 2));
      return 2;
    }
    let input;
    try {
      input = JSON.parse(readFileSync(path.resolve(file), "utf8"));
    } catch (error) {
      const message = error.code === "ENOENT" ? `请求文件不存在：${file}` : `请求文件无法解析：${error.message}`;
      console.log(JSON.stringify(envelopeError("invalid-input", message, "input-file"), null, 2));
      return 2;
    }
    const envelope = protocol.request(input, runOperation);
    console.log(JSON.stringify(envelope, null, 2));
    return envelope.ok ? 0 : 2;
  }
  console.error("用法：");
  console.error(`  ${BIN} protocol describe --json`);
  console.error(`  ${BIN} protocol request --input-file <request.json> --json`);
  return 2;
}
