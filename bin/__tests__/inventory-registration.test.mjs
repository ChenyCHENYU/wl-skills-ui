import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { CLI_COMMANDS, TASK_OPTIONS, SCANNER_OPTIONS, CONTRACT_OPTIONS, publicCliInventory } from "../cli-catalog.mjs";
import { MCP_TOOLS, publicMcpTools, publicMcpInventory } from "../../mcp/catalog.mjs";
import { protocol } from "../protocol-cli.mjs";

const root = resolve(import.meta.dirname, "../..");
const cli = join(root, "bin/wl-ui.js");
const server = join(root, "mcp/server.js");

function fixture(body) {
  const project = mkdtempSync(join(tmpdir(), "wl-ui-inventory-"));
  try {
    mkdirSync(join(project, "src"));
    writeFileSync(join(project, "package.json"), JSON.stringify({ devDependencies: { "@agile-team/wl-skills-ui": "*" } }));
    writeFileSync(join(project, "src/Demo.vue"), "<template><el-button>新增</el-button></template>");
    return body(project);
  } finally { rmSync(project, { recursive: true, force: true }); }
}

function runCli(project, args) {
  const run = spawnSync(process.execPath, [cli, ...args], { cwd: project, encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 0, run.error?.message || run.stderr);
  return run;
}

function runMcp(project, name, args = {}) {
  const message = name ? { method: "tools/call", params: { name, arguments: args } } : { method: "tools/list" };
  const run = spawnSync(process.execPath, [server], { cwd: project, env: { ...process.env, WL_PROJECT_ROOT: project }, input: JSON.stringify({ jsonrpc: "2.0", id: 1, ...message }) + "\n", encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 0, run.error?.message || run.stderr);
  return JSON.parse(run.stdout.trim());
}

test("protocol inventory projects all 25 actual CLI registrations with exact declared options and effects", () => {
  const inventory = protocol.describe().inventory;
  assert.equal(CLI_COMMANDS.length, 25);
  assert.equal(new Set(CLI_COMMANDS.map((command) => command.name)).size, CLI_COMMANDS.length);
  assert.deepEqual(inventory.commands, publicCliInventory());
  for (const registration of CLI_COMMANDS) {
    const described = inventory.commands.find((command) => command.name === registration.name);
    assert.equal(described.sideEffects, registration.sideEffects);
    assert.equal(described.readOnly, registration.readOnly);
    assert.deepEqual(Object.keys(described.parameters.properties), Object.keys(registration.options));
  }
  const commands = Object.fromEntries(inventory.commands.map((command) => [command.name, command]));
  for (const name of ["scan", "audit", "fix", "all", "task", "add-preset", "add-vendor", "snapshot", "exempt", "contract"]) assert.equal(commands[name].readOnly, false, name);
  for (const name of ["route", "explain", "status", "rules", "profiles", "diff", "drift", "doctor"]) assert.equal(commands[name].readOnly, true, name);
  assert.equal(commands.fix.parameters.properties["plan-hash"].type, "string");
  assert.equal(commands.fix.parameters.properties["rule"], undefined);
  assert.equal(commands.fix.parameters.properties.confirm, undefined);
  assert.deepEqual(commands.task.parameters.properties.target, { type: "array", items: { type: "string" } });
  assert.match(commands["add-vendor"].sideEffects, /包目录，非业务项目/);
  assert.match(commands.snapshot.actionEffects.clean, /不支持 --dry-run/);
  assert.match(commands.contract.actionEffects.extract, /--output-file.*--confirm/);
  assert.deepEqual(commands.scan.optionAliases, { h: "help" });
  assert.deepEqual(commands.scan.entryPoints, ["wl-ui", "wl-scan"]);
  assert.equal(commands.init.alternateEntryPoints[0].mapping, "wl-scan init");
  assert.equal(commands.init.alternateEntryPoints[0].readOnly, true);
});

test("CLI protocol describe and actual MCP tools/list expose identical schemas, descriptions and write policies", () => fixture((project) => {
  const described = JSON.parse(runCli(project, ["protocol", "describe", "--json"]).stdout);
  assert.deepEqual(described.inventory.commands, publicCliInventory());
  assert.deepEqual(described.inventory.mcpTools, publicMcpInventory());
  const tools = runMcp(project).result.tools;
  assert.equal(tools.length, 18);
  assert.deepEqual(tools, publicMcpTools());
  for (const actual of tools) {
    const published = described.inventory.mcpTools.find((tool) => tool.name === actual.name);
    assert.deepEqual(published.inputSchema, actual.inputSchema);
    assert.equal(published.summary, actual.description);
    assert.equal(published.readOnly, actual.annotations.readOnlyHint);
  }
  for (const registration of MCP_TOOLS) {
    assert.equal(registration.effects.business, "none");
    assert.equal(registration.readOnly, !registration.effects.records);
    assert.equal(registration.write, registration.effects.records ? "persist" : "readonly");
  }
}));

test("MCP query annotations distinguish pure task routing from actual recorded rule queries and scans", () => fixture((project) => {
  const routed = runMcp(project, "wl_ui_route", { task: "修复表格样式" });
  assert.equal(routed.result._meta, undefined);
  assert.equal(existsSync(join(project, ".wl-skills-ui")), false);
  const rules = runMcp(project, "wl_ui_list_rules");
  assert.equal(rules.result._meta.wlExecution.executionStatus, "completed");
  assert.equal(rules.result._meta.wlExecution.validationStatus, "unverified");
  assert.equal(existsSync(join(project, ".wl-skills-ui/runs")), true);
  const scan = runMcp(project, "wl_ui_scan", { target: "src", profile: "native-element", parser: "fast" });
  assert.equal(scan.result._meta.wlExecution.executionStatus, "completed");
  const metadata = publicMcpInventory().find((tool) => tool.name === "wl_ui_scan");
  assert.equal(metadata.readOnly, false);
  assert.match(metadata.sideEffects, /resultCursor.*不.*新增回执/);
  const source = readFileSync(join(project, "src/Demo.vue"), "utf8");
  assert.equal(source, "<template><el-button>新增</el-button></template>");
}));

test("actual scanner consumes registered defaults/options and records conditional report and baseline writes", () => fixture((project) => {
  assert.equal(SCANNER_OPTIONS["refresh-baseline"].type, "boolean");
  const report = join(project, "report.json");
  runCli(project, ["scan", "--project", project, "--target", "src", "--profile", "native-element", "--parser", "fast", "--outFile", report, "--output", "json"]);
  assert.equal(existsSync(report), true);
  assert.equal(existsSync(join(project, ".wl-skills-ui/runs")), true);
  runCli(project, ["audit", "--project", project, "--target", "src", "--profile", "native-element", "--parser", "fast", "--refresh-baseline", "--output", "json"]);
  assert.equal(existsSync(join(project, ".wl-baseline.json")), true);
  assert.equal(readFileSync(join(project, "src/Demo.vue"), "utf8"), "<template><el-button>新增</el-button></template>");
}));

test("actual task CLI retains profile/repeatable target options and query remains read-only", () => fixture((project) => {
  assert.equal(TASK_OPTIONS.profile.type, "string");
  assert.equal(TASK_OPTIONS.target.multiple, true);
  const before = readdirSync(project);
  const result = JSON.parse(runCli(project, ["route", "修复表格样式", "--project", project, "--profile", "native-element", "--target", "src/Demo.vue", "--json"]).stdout);
  assert.equal(result.profile, "native-element");
  assert.deepEqual(readdirSync(project), before);
}));

test("conditional writing command metadata matches real preset and confirmed contract output", () => fixture((project) => {
  runCli(project, ["add-preset", "inventory-biz", "--project", project, "--dry-run"]);
  assert.equal(existsSync(join(project, "src/wl-ui")), false);
  runCli(project, ["add-preset", "inventory-biz", "--project", project]);
  assert.equal(existsSync(join(project, "src/wl-ui/presets/inventory-biz.ts")), true);
  assert.equal(CONTRACT_OPTIONS.confirm.type, "boolean");
  const output = join(project, "ui-contract.json");
  runCli(project, ["contract", "extract", "--project", project, "--path", "src/Demo.vue", "--domain", "produce", "--parser", "fast"]);
  assert.equal(existsSync(output), false);
  runCli(project, ["contract", "extract", "--project", project, "--path", "src/Demo.vue", "--domain", "produce", "--parser", "fast", "--output-file", output, "--confirm"]);
  assert.equal(existsSync(output), true);
}));

test("standalone wl-scan init stays a read-only guide while wl-ui init remains the installer", () => fixture((project) => {
  const before = readdirSync(project);
  const guide = spawnSync(process.execPath, [join(root, "scanner/index.mjs"), "init", "--project", project], { cwd: project, encoding: "utf8", timeout: 30000 });
  assert.equal(guide.status, 0, guide.error?.message || guide.stderr);
  assert.deepEqual(readdirSync(project), before);
  const metadata = publicCliInventory().find((command) => command.name === "init");
  assert.equal(metadata.readOnly, false);
  assert.equal(metadata.alternateEntryPoints[0].readOnly, true);
}));
