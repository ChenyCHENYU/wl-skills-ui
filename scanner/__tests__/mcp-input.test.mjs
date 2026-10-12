import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const server = resolve(import.meta.dirname, "../../mcp/server.js");

function callTools(root, messages) {
  const called = spawnSync(process.execPath, [server], { cwd: root, env: { ...process.env, WL_PROJECT_ROOT: root }, input: messages.map((message) => JSON.stringify(message)).join("\n") + "\n", encoding: "utf8", timeout: 30000 });
  assert.equal(called.status, 0, called.stderr);
  return called.stdout.trim().split("\n").map((line) => JSON.parse(line));
}

function scanMessage(id, arguments_) {
  return { jsonrpc: "2.0", id, method: "tools/call", params: { name: "wl_ui_scan", arguments: { target: "src", profile: "native-element", parser: "fast", output: "json", ...arguments_ } } };
}

test("raw JSON-RPC envelopes, explicit null IDs and notifications preserve stdio and zero tool records", () => {
  const root = mkdtempSync(join(tmpdir(), "wl-ui-rpc-envelope-"));
  try {
    const invalid = [null, true, 12, "raw", [], {},
      { jsonrpc: "1.0", id: 1, method: "ping" }, { jsonrpc: "2.0", id: 2 },
      { jsonrpc: "2.0", id: false, method: "ping" }, { jsonrpc: "2.0", id: {}, method: "ping" },
      { jsonrpc: "2.0", id: [], method: "ping" }, { jsonrpc: "2.0", id: 3, method: "ping", params: null },
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: false }];
    const messages = [...invalid, { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", method: "tools/list" }, { jsonrpc: "2.0", id: null, method: "ping" }, { jsonrpc: "2.0", id: "alive", method: "ping" }];
    const replies = callTools(root, messages);
    assert.equal(replies.length, invalid.length + 2);
    for (let index = 0; index < invalid.length; index++) {
      const invalidParams = index >= invalid.length - 2;
      assert.equal(replies[index].error?.code, invalidParams ? -32602 : -32600);
      assert.equal(replies[index].id, invalidParams ? invalid[index].id : null);
    }
    assert.deepEqual(replies.at(-2), { jsonrpc: "2.0", id: null, result: {} });
    assert.deepEqual(replies.at(-1), { jsonrpc: "2.0", id: "alive", result: {} });
    assert.equal(existsSync(join(root, ".wl-skills-ui/runs")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("MCP dispatch rejects non-string and prototype tool names without execution records", () => {
  const root = mkdtempSync(join(tmpdir(), "wl-ui-rpc-dispatch-"));
  try {
    const names = [null, true, 1, [], ["toString"], {}, "", " ", "toString", "constructor", "__proto__"];
    const messages = names.map((name, id) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: {} } }));
    messages.push({ jsonrpc: "2.0", id: "method", method: "toString" }, { jsonrpc: "2.0", id: "alive", method: "ping" });
    const replies = callTools(root, messages);
    assert.equal(replies.length, messages.length);
    for (let index = 0; index < names.length; index++) assert.deepEqual({ id: replies[index].id, code: replies[index].error?.code }, { id: index, code: index < 8 ? -32602 : -32601 });
    assert.equal(replies.at(-2).error?.code, -32601);
    assert.deepEqual(replies.at(-1), { jsonrpc: "2.0", id: "alive", result: {} });
    assert.equal(existsSync(join(root, ".wl-skills-ui/runs")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("stdio MCP rejects declared input violations and malformed requests before creating execution records", () => {
  const root = mkdtempSync(join(tmpdir(), "wl-ui-mcp-input-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src/Demo.vue"), "<template><div/></template>");
    const scanInputs = [{ limit: true }, { limit: "20" }, { limit: 0 }, { maxBytes: 4095 }, { parser: "unknown" }, { target: ["src"] }, { only: "R999" }, { extra: true }, { cursor: "-1" }, { cursor: " " }, { cursor: "9007199254740992" }, null, false, []];
    const messages = scanInputs.map((arguments_, index) => ({ jsonrpc: "2.0", id: index + 1, method: "tools/call", params: { name: "wl_ui_scan", arguments: arguments_ } }));
    messages.push(
      { jsonrpc: "2.0", id: 20, method: "tools/call", params: { name: "wl_ui_task", arguments: { targets: [1] } } },
      { jsonrpc: "2.0", id: 21, method: "tools/call", params: { name: "wl_ui_route_intent", arguments: {} } },
      { jsonrpc: "2.0", id: 22, method: "tools/call", params: null },
      { jsonrpc: "2.0", id: 23, method: "tools/call", params: { name: "unknown", arguments: {} } },
      null,
    );
    const responses = callTools(root, messages);
    assert.equal(responses.length, messages.length);
    for (const response of responses) {
      const expected = response.id === 23 ? -32601 : response.id === null ? -32600 : -32602;
      assert.equal(response.error?.code, expected, JSON.stringify(response));
    }
    assert.equal(existsSync(join(root, ".wl-skills-ui/runs")), false);
    assert.equal(existsSync(join(root, ".wl-snapshot")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("stdio MCP rejects project, target and exempt links outside its physical root before creating records", () => {
  const base = mkdtempSync(join(tmpdir(), "wl-ui-mcp-boundary-"));
  try {
    const root = join(base, "project");
    const outside = join(base, "outside");
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(outside, "src"), { recursive: true });
    const source = "<template><div/></template>";
    writeFileSync(join(root, "src/Local.vue"), source);
    writeFileSync(join(outside, "src/Outside.vue"), source);
    writeFileSync(join(outside, "exempt.json"), "{}");
    symlinkSync(outside, join(root, "linked"));
    symlinkSync(join(outside, "exempt.json"), join(root, "exempt.json"));
    const responses = callTools(root, [
      scanMessage(1, { project: "linked" }),
      scanMessage(2, { target: "linked/src" }),
      scanMessage(3, { target: "linked/missing-child" }),
      scanMessage(4, { exempt: "exempt.json" }),
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "wl_ui_contract_extract", arguments: { path: "linked/src/Outside.vue", domain: "steel" } } },
    ]);
    for (const response of responses) {
      assert.equal(response.result?.isError, true, JSON.stringify(response));
      assert.match(response.result.content[0].text, /必须位于项目根目录内/);
      assert.equal(response.result._meta, undefined);
    }
    for (const directory of [root, outside]) assert.equal(existsSync(join(directory, ".wl-skills-ui/runs")), false);
    assert.equal(readFileSync(join(outside, "src/Outside.vue"), "utf8"), source);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("stdio MCP accepts an explicitly configured root alias and project aliases contained within it", () => {
  const base = mkdtempSync(join(tmpdir(), "wl-ui-mcp-contained-"));
  try {
    const root = join(base, "project");
    mkdirSync(join(root, "app/src"), { recursive: true });
    writeFileSync(join(root, "app/src/Demo.vue"), "<template><div/></template>");
    symlinkSync(root, join(base, "configured-root"));
    symlinkSync(join(root, "app"), join(root, "app-alias"));
    mkdirSync(join(root, "..notes/src"), { recursive: true });
    writeFileSync(join(root, "..notes/src/Demo.vue"), "<template><div/></template>");
    const responses = callTools(join(base, "configured-root"), [scanMessage(1, { project: "app-alias" }), scanMessage(2, { project: "..notes" })]);
    for (const response of responses) {
      assert.equal(response.result?.isError, false, JSON.stringify(response));
      assert.equal(JSON.parse(response.result.content[0].text).summary.fileCount, 1);
      assert.equal(response.result._meta.wlExecution.executionStatus, "completed");
    }
    assert.equal(existsSync(join(root, "app/.wl-skills-ui/runs")), true);
  } finally { rmSync(base, { recursive: true, force: true }); }
});
