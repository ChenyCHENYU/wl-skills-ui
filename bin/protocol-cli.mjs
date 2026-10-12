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
import { invokeExecutor } from "./executor-cli.mjs";
import { publicCliInventory } from "./cli-catalog.mjs";
import { publicMcpInventory } from "../mcp/catalog.mjs";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const capabilitiesDocument = require("./capabilities.json");
const { createProtocol } = require("./integration-protocol.cjs");

const BIN = "wl-ui";
const OPERATIONS = [
  { id: "route", summary: "只读任务判定：视觉/样式域技能、约束、歧义与缺口", readOnly: true, required: ["task"], optional: ["context", "targets", "profile", "skill", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} route --text "<task>"` },
  { id: "explain", summary: "解释本次任务判定（只读，不记录）", readOnly: true, required: ["task"], optional: ["context", "targets", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} explain --text "<task>"` },
  { id: "task", summary: "判定并持久化任务计划（尚未执行扫描或修复）", readOnly: false, required: ["task"], optional: ["context", "runId", "targets", "profile", "projectRoot"], sideEffects: "写入 .wl-skills-ui/runs/ 下本包任务记录", mapping: `${BIN} task --text "<task>" [--run-id <id>]` },
  { id: "status", summary: "读取本包执行/校验记录与新鲜度", readOnly: true, required: [], optional: ["runId", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} status [--run-id <id>]` },
  { id: "doctor-host", summary: "宿主入口静态诊断（不证明宿主已加载）", readOnly: true, required: [], optional: ["host", "projectRoot"], sideEffects: "无写入", mapping: `${BIN} doctor-host [--host <host>]` },
];

function buildInventory() {
  const commands = publicCliInventory();
  const skills = [];
  const loadErrors = [];
  try {
    for (const skill of taskCatalog()) {
      skills.push({ id: skill.id, description: skill.description, triggers: skill.triggers, status: skill.status, entry: skill.path, execution: "instructional" });
    }
  } catch (error) {
    loadErrors.push(`skills 加载失败：${error.message}`);
  }
  const mcpTools = publicMcpInventory();
  return { skills, commands, mcpTools, loadErrors };
}

export const protocol = createProtocol({
  bin: BIN,
  packageName: pkg.name,
  packageVersion: pkg.version,
  capabilities: capabilitiesDocument.capabilities || [],
  constraints: { projectScope: { config: ".wl-skills-scope.json", schema: "bin/project-scope.schema.json", adoption: "own-manifest-or-direct-dependency-or-explicit-enable", inheritance: "never-across-project-boundaries", excluded: ["mobile", "unadopted-project", "aggregate-workspace"] }, node: (pkg.engines && pkg.engines.node) || null, boundaryVersion: capabilitiesDocument.boundaryVersion || null },
  operations: OPERATIONS,
  executors: require("./executors.json"),
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

async function requestEnvelope(input) {
  if (input && input.operation === "execute") {
    return protocol.requestExecute(input, { readStatus: (root, runId) => runOperation("status", { projectRoot: root, runId }), invoke: invokeExecutor });
  }
  return protocol.request(input, runOperation);
}

export async function runCli(argv) {
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
    const envelope = await requestEnvelope(input);
    console.log(JSON.stringify(envelope, null, 2));
    return envelope.ok ? 0 : 2;
  }
  console.error("用法：");
  console.error(`  ${BIN} protocol describe --json`);
  console.error(`  ${BIN} protocol request --input-file <request.json> --json`);
  return 2;
}
