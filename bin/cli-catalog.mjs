/** Actual CLI registrations and parser options; protocol inventory projects this catalog. */
export const TASK_OPTIONS = {
  target: { type: "string", multiple: true }, project: { type: "string" }, text: { type: "string" },
  "run-id": { type: "string" }, host: { type: "string" }, skill: { type: "string" }, profile: { type: "string" }, json: { type: "boolean" },
};

export const SCANNER_OPTIONS = {
  target: { type: "string", default: "./src" }, project: { type: "string", default: "." },
  output: { type: "string", default: "markdown" }, exclude: { type: "string", default: "node_modules,dist,.git" },
  outFile: { type: "string", default: "" }, "dry-run": { type: "boolean", default: false },
  "fail-on-error": { type: "boolean", default: false }, layer: { type: "string", default: "" },
  vendor: { type: "string", default: "" }, mode: { type: "string", default: "" }, profile: { type: "string", default: "" },
  id: { type: "string", default: "" }, keep: { type: "string", default: "5" },
  "no-snapshot": { type: "boolean", default: false }, "plan-hash": { type: "string", default: "" },
  "refresh-baseline": { type: "boolean", default: false }, exempt: { type: "string", default: "" },
  baseline: { type: "string", default: "" }, current: { type: "string", default: "" },
  only: { type: "string", default: "" }, skip: { type: "string", default: "" }, changed: { type: "boolean", default: false },
  "changed-fallback": { type: "string", default: "error" }, base: { type: "string", default: "HEAD" },
  parser: { type: "string", default: "auto" }, limit: { type: "string", default: "100" }, cursor: { type: "string", default: "0" },
  "run-id": { type: "string" }, help: { type: "boolean", short: "h" },
};

export const CONTRACT_OPTIONS = {
  confirm: { type: "boolean", default: false }, domain: { type: "string", default: "" },
  help: { type: "boolean", default: false }, id: { type: "string", default: "" },
  input: { type: "string", default: "" }, json: { type: "boolean", default: false },
  library: { type: "string", default: "" }, limit: { type: "string", default: "5" },
  mode: { type: "string", default: "native" }, "output-file": { type: "string", default: "" },
  parser: { type: "string", default: "auto" }, path: { type: "string", default: "" },
  project: { type: "string", default: "." }, scenario: { type: "string", default: "" },
};

const PROJECT = { project: { type: "string", default: "." } };
const INSTALL = { ...PROJECT, editor: { type: "string", default: "" }, mode: { type: "string", default: "" },
  profile: { type: "string", default: "" }, "dry-run": { type: "boolean", default: false },
  "skills-only": { type: "boolean", default: false }, force: { type: "boolean", default: false } };
const RECORDS = "写入 .wl-skills-ui/runs/ 执行回执";
const NONE = "无写入";

export const SCANNER_ACTIONS = {
  snapshot: ["list", "rollback", "diff", "clean"], exempt: ["init"],
};

/** Metadata states possible writes, including conditional writes; readOnly means no disk writes. */
export const CLI_COMMANDS = [
  { name: "init", family: "local", options: INSTALL, strict: false, summary: "安装本包规则、技能及接入贡献", sideEffects: "非 --dry-run 写目标项目入口、manifest、MCP 与选定样式接入贡献", readOnly: false },
  { name: "update", family: "local", options: INSTALL, strict: false, summary: "按本包所有权基线更新安装贡献", sideEffects: "非 --dry-run 更新本包拥有的入口、manifest、MCP 和接入贡献；保留外来及用户修改", readOnly: false },
  { name: "diff", family: "local", options: PROJECT, strict: false, summary: "比较本包安装贡献", sideEffects: NONE, readOnly: true },
  { name: "clean", family: "local", options: { ...PROJECT, "dry-run": { type: "boolean", default: false } }, strict: false, summary: "清理本包未修改的安装贡献", sideEffects: "非 --dry-run 删除本包拥有且未修改的贡献和 manifest", readOnly: false },
  { name: "doctor", family: "local", options: { ...PROJECT, "print-overrides": { type: "boolean", default: false } }, strict: false, summary: "项目接入静态诊断/覆盖建议", sideEffects: NONE, readOnly: true },
  { name: "prompts", family: "local", options: {}, strict: false, summary: "输出本包使用提示", sideEffects: NONE, readOnly: true },
  { name: "scan", family: "scanner", options: SCANNER_OPTIONS, summary: "执行 R 规则扫描", sideEffects: `${RECORDS}；--outFile 写报告`, readOnly: false },
  { name: "audit", family: "scanner", options: SCANNER_OPTIONS, summary: "扫描审计（scan 别名）", sideEffects: `${RECORDS}；--outFile 写报告；--refresh-baseline 写 .wl-baseline.json`, readOnly: false },
  { name: "check", family: "scanner", options: SCANNER_OPTIONS, summary: "检查接入完整性（样式使用 scan）", sideEffects: RECORDS, readOnly: false },
  { name: "fix", family: "scanner", options: SCANNER_OPTIONS, summary: "确定性修复/只读预演", sideEffects: `${RECORDS}；非 --dry-run 写源文件并保存快照（--no-snapshot 可关闭快照）；--plan-hash 核对预演`, readOnly: false },
  { name: "all", family: "scanner", options: SCANNER_OPTIONS, summary: "接入检查及 R 规则扫描", sideEffects: `${RECORDS}；--outFile 写报告`, readOnly: false },
  { name: "add-preset", family: "local", options: { ...PROJECT, output: { type: "string", default: "src/wl-ui/presets" }, "dry-run": { type: "boolean", default: false } }, positionals: "<name>", strict: true, summary: "生成业务列渲染预设", sideEffects: "非 --dry-run 在指定 output 路径写预设源文件", readOnly: false },
  { name: "add-vendor", family: "local", options: { family: { type: "string", default: "" }, "dry-run": { type: "boolean", default: false } }, positionals: "<tag>", strict: false, summary: "生成 vendor 扩展草稿", sideEffects: "非 --dry-run 修改本包 styles/vendors、scanner/rules、skills 与 vendor 注册信息（包目录，非业务项目）", readOnly: false },
  { name: "snapshot", family: "scanner", options: SCANNER_OPTIONS, summary: "快照查询、回退与清理", actions: SCANNER_ACTIONS.snapshot,
    actionEffects: { list: NONE, diff: NONE, rollback: "非 --dry-run 从快照恢复源文件", clean: "删除旧快照目录（不支持 --dry-run）" }, sideEffects: "list/diff 只读；rollback 恢复源文件；clean 删除旧快照", readOnly: false },
  { name: "drift", family: "scanner", options: SCANNER_OPTIONS, summary: "比较问题基线", sideEffects: NONE, readOnly: true },
  { name: "exempt", family: "scanner", options: SCANNER_OPTIONS, actions: SCANNER_ACTIONS.exempt, summary: "生成豁免模板", sideEffects: "init 在缺失时创建 .wl-exempt.json（不支持 --dry-run）", readOnly: false },
  { name: "contract", family: "contract", options: CONTRACT_OPTIONS, actions: ["extract", "validate", "match"], summary: "提取/校验/匹配脱敏 UI 契约",
    actionEffects: { extract: "仅 --output-file 与 --confirm 同时设置时写契约文件", validate: NONE, match: NONE }, sideEffects: "extract 仅显式 --output-file + --confirm 写契约；validate/match 只读", readOnly: false },
  { name: "rules", family: "local", options: {}, strict: false, actions: ["list", "describe"], positionals: "[list|describe <ruleId>]", summary: "读取注册规则", sideEffects: NONE, readOnly: true },
  { name: "profiles", family: "local", options: {}, strict: false, summary: "读取注册 Profile", sideEffects: NONE, readOnly: true },
  { name: "task", family: "task", options: TASK_OPTIONS, positionals: '"任务"', summary: "判定并持久化任务计划", sideEffects: "适用任务写入 .wl-skills-ui/runs/ 计划；不执行检查", readOnly: false },
  { name: "route", family: "task", options: TASK_OPTIONS, positionals: '"任务"', summary: "只读任务判定", sideEffects: NONE, readOnly: true },
  { name: "explain", family: "task", options: TASK_OPTIONS, positionals: '"任务"', summary: "只读判定解释", sideEffects: NONE, readOnly: true },
  { name: "status", family: "task", options: TASK_OPTIONS, summary: "读取本包执行回执与新鲜度", sideEffects: NONE, readOnly: true },
  { name: "doctor-host", family: "task", options: TASK_OPTIONS, summary: "宿主入口静态诊断", sideEffects: NONE, readOnly: true },
  { name: "protocol", family: "protocol", options: { "input-file": { type: "string" }, json: { type: "boolean" } }, strict: false, actions: ["describe", "request"], summary: "公开集成协议",
    actionEffects: { describe: NONE, request: "按 operation 执行：task/execute 写回执，其余判定/查询只读" }, sideEffects: "describe 只读；request 按 operation 声明持久化计划或执行回执", readOnly: false },
];

export function cliCommands(family) { return CLI_COMMANDS.filter((command) => !family || command.family === family); }
export const SCANNER_GUIDE = { name: "init", family: "scanner", options: SCANNER_OPTIONS, summary: "输出接入指引（wl-scan 的兼容入口，不执行 wl-ui init 安装）", sideEffects: NONE, readOnly: true };
export function scannerCommands() { return [...cliCommands("scanner"), SCANNER_GUIDE]; }
export function cliOptions(name) {
  const command = CLI_COMMANDS.find((entry) => entry.name === name);
  if (!command) throw new Error(`Unregistered UI command: ${name}`);
  return command.options;
}

export function cliParser(name) {
  const command = CLI_COMMANDS.find((entry) => entry.name === name);
  return { options: cliOptions(name), strict: command.strict !== false };
}

function optionSchema(option) {
  const scalar = { type: option.type, ...(option.default !== undefined ? { default: option.default } : {}) };
  return option.multiple ? { type: "array", items: { type: option.type } } : scalar;
}

function publicCommand({ name, options, positionals, ...metadata }, bin = "wl-ui") {
  return {
    name, ...metadata, execution: "programmatic", mapping: `${bin} ${name}`,
    entryPoints: metadata.family === "scanner" && bin === "wl-ui" ? ["wl-ui", "wl-scan"] : [bin],
    optionAliases: Object.fromEntries(Object.entries(options).filter(([, option]) => option.short).map(([key, option]) => [option.short, key])),
    args: [positionals || (metadata.actions ? `[${metadata.actions.join("|")}]` : ""), ...Object.entries(options).map(([key, option]) => `[--${key}${option.type === "string" ? " <value>" : ""}${option.multiple ? "..." : ""}]`)].filter(Boolean).join(" "),
    parameters: { type: "object", properties: Object.fromEntries(Object.entries(options).map(([key, value]) => [key, optionSchema(value)])), additionalProperties: metadata.strict === false },
  };
}

export function publicCliInventory() {
  return CLI_COMMANDS.map((command) => ({ ...publicCommand(command), ...(command.name === "init" ? {
    alternateEntryPoints: [publicCommand(SCANNER_GUIDE, "wl-scan")],
  } : {}) }));
}
