import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { extractUiContract, loadUiContractLibrary, readUiContractLibrary } from "../ui-contract.mjs";

const server = resolve(import.meta.dirname, "../../mcp/server.js");
const cli = resolve(import.meta.dirname, "../contract-cli.mjs");

function fixture(callback) {
  const base = fs.mkdtempSync(join(tmpdir(), "wl-ui-contract-boundary-"));
  try {
    const root = join(base, "project");
    const library = join(root, "library");
    const outside = join(base, "outside");
    fs.mkdirSync(library, { recursive: true });
    fs.mkdirSync(outside);
    const contract = extractUiContract({ content: "<template><el-table/></template>", filename: "Demo.vue", domain: "produce", parser: "fast" });
    fs.writeFileSync(join(library, "local.json"), JSON.stringify({ ...contract, id: "local" }));
    fs.writeFileSync(join(outside, "foreign.json"), JSON.stringify({ ...contract, id: "foreign" }));
    fs.writeFileSync(join(root, "query.json"), JSON.stringify(contract));
    return callback({ root, library, outside, contract });
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
}

const hazards = [
  ["external JSON leaf", "outside-project", ({ library, outside }) => fs.symlinkSync(join(outside, "foreign.json"), join(library, "foreign.json"))],
  ["external directory alias", "outside-project", ({ library, outside }) => fs.symlinkSync(outside, join(library, "foreign"))],
  ["directory cycle", "symlink-cycle", ({ library }) => fs.symlinkSync(library, join(library, "cycle"))],
  ["self-referencing link", "symlink-cycle", ({ library }) => fs.symlinkSync("loop.json", join(library, "loop.json"))],
  ["missing linked file", "missing-input", ({ library }) => fs.symlinkSync("missing.json", join(library, "broken.json"))],
  ["invalid JSON artifact", "invalid-json", ({ library }) => fs.writeFileSync(join(library, "broken.json"), "{bad")],
  ["invalid UI contract", "invalid-contract", ({ library, contract }) => fs.writeFileSync(join(library, "broken.json"), JSON.stringify({ ...contract, fingerprint: "wrong" }))],
];

for (const [name, expectedCode, addHazard] of hazards) {
  test(`library reports ${name} as a gap without reading foreign bytes or returning a complete candidate set`, (context) => fixture((data) => {
    addHazard(data);
    let foreignReads = 0;
    const originalRead = fs.readFileSync;
    const readMock = context.mock.method(fs, "readFileSync", (path, ...args) => {
      if (String(path).startsWith(data.outside)) { foreignReads++; throw new Error("foreign file read attempted"); }
      return originalRead(path, ...args);
    });
    syncBuiltinESMExports();
    try {
      const report = readUiContractLibrary(data.library, { projectRoot: data.root });
      assert.equal(report.complete, false);
      assert.equal(report.status, "gap");
      assert.ok(report.gaps.some((gap) => gap.code === expectedCode), JSON.stringify(report.gaps));
      assert.equal(foreignReads, 0);
      assert.deepEqual(report.contracts.map((contract) => contract.id), ["local"]);
      assert.throws(() => loadUiContractLibrary(data.library, { projectRoot: data.root }), (error) => error.code === "ui-contract-library-gap" && error.library.complete === false);
    } finally { readMock.mock.restore(); syncBuiltinESMExports(); }
  }));
}

test("library retains contained directory/file links, deduplicates aliases and explains ordinary skipped files", () => fixture(({ root, library, contract }) => {
  fs.mkdirSync(join(root, "shared"));
  fs.writeFileSync(join(root, "shared/contained.json"), JSON.stringify({ ...contract, id: "contained" }));
  fs.symlinkSync(join(root, "shared"), join(library, "a-shared"));
  fs.symlinkSync(join(root, "shared"), join(library, "b-shared"));
  fs.symlinkSync(join(library, "local.json"), join(library, "local-alias.json"));
  fs.writeFileSync(join(library, "preferences.json"), JSON.stringify({ theme: "custom" }));
  fs.writeFileSync(join(library, "README.md"), "Library notes");
  const report = readUiContractLibrary(library, { projectRoot: root });
  assert.equal(report.status, "complete");
  assert.equal(report.complete, true);
  assert.deepEqual(report.gaps, []);
  assert.deepEqual(report.contracts.map((candidate) => candidate.id).sort(), ["contained", "local"]);
  assert.deepEqual(report.readFiles.sort(), ["library/local.json", "library/preferences.json", "shared/contained.json"]);
  assert.deepEqual(report.skipped.map((item) => item.reason).sort(), ["duplicate-directory", "duplicate-file", "not-json", "not-ui-contract"]);
  assert.equal(loadUiContractLibrary(library, { projectRoot: root }).length, 2);
}));

test("missing library inputs produce gaps, while an explicitly empty library remains empty", () => fixture(({ root, library }) => {
  for (const input of [join(root, "missing"), join(library, "local.json")]) {
    const report = readUiContractLibrary(input, { projectRoot: root });
    assert.equal(report.status, "gap");
    assert.equal(report.complete, false);
    assert.equal(report.contracts.length, 0);
  }
  fs.rmSync(join(library, "local.json"));
  const empty = readUiContractLibrary(library);
  assert.equal(empty.status, "empty");
  assert.equal(empty.complete, true);
  assert.deepEqual(empty.contracts, []);
}));

for (const operation of ["readFileSync", "readdirSync"]) {
  test(`actual ${operation} I/O failure makes the library incomplete`, (context) => fixture(({ root, library }) => {
    const original = fs[operation];
    const failed = context.mock.method(fs, operation, (path, ...args) => {
      if (String(path).endsWith(operation === "readFileSync" ? "local.json" : "library")) {
        const error = new Error("fixture permission failure");
        error.code = "EACCES";
        throw error;
      }
      return original(path, ...args);
    });
    syncBuiltinESMExports();
    try {
      const report = readUiContractLibrary(library, { projectRoot: root });
      assert.equal(report.complete, false);
      assert.equal(report.status, "gap");
      assert.ok(report.gaps.some((gap) => gap.code === "unreadable-input"));
    } finally { failed.mock.restore(); syncBuiltinESMExports(); }
  }));
}

test("real MCP reports recursive library gaps and emits no matches or passed verification", () => fixture((data) => {
  const inputs = [];
  for (const [name, expectedCode, addHazard] of hazards) {
    const library = join(data.root, name.replaceAll(" ", "-"));
    fs.mkdirSync(library);
    addHazard({ ...data, library });
    inputs.push({ expectedCode, library });
  }
  const messages = inputs.map(({ library }, index) => ({ jsonrpc: "2.0", id: index + 1, method: "tools/call", params: { name: "wl_ui_contract_match", arguments: { library, contractJson: JSON.stringify(data.contract) } } }));
  const called = spawnSync(process.execPath, [server], { cwd: data.root, env: { ...process.env, WL_PROJECT_ROOT: data.root }, input: messages.map((message) => JSON.stringify(message)).join("\n") + "\n", encoding: "utf8", timeout: 30000 });
  assert.equal(called.status, 0, called.stderr);
  const responses = called.stdout.trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(responses.length, inputs.length);
  for (const [index, response] of responses.entries()) {
    assert.equal(response.result.isError, true, JSON.stringify(response));
    assert.doesNotMatch(response.result.content[0].text, /^❌/, JSON.stringify(response));
    const result = JSON.parse(response.result.content[0].text);
    assert.equal(result.library.status, "gap");
    assert.equal(result.library.complete, false);
    assert.ok(result.library.gaps.some((gap) => gap.code === inputs[index].expectedCode));
    assert.deepEqual(result.matches, []);
    assert.equal(response.result._meta.wlExecution.executionStatus, "failed");
    assert.notEqual(response.result._meta.wlExecution.validationStatus, "passed");
  }
  assert.equal(fs.existsSync(join(data.outside, ".wl-skills-ui")), false);
}));

test("real contract CLI returns nonzero and structured gaps, then accepts contained candidates after repair", () => fixture(({ root, library, outside }) => {
  const link = join(library, "foreign.json");
  fs.symlinkSync(join(outside, "foreign.json"), link);
  const args = [cli, "match", "--input", join(root, "query.json"), "--library", library, "--project", root];
  const failed = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.equal(failed.status, 1, failed.stderr);
  assert.equal(JSON.parse(failed.stdout).library.status, "gap");
  assert.deepEqual(JSON.parse(failed.stdout).matches, []);
  fs.rmSync(link);
  const passed = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(JSON.parse(passed.stdout).library.complete, true);
  assert.equal(JSON.parse(passed.stdout).matches[0].id, "local");
}));

test("real MCP accepts contained library aliases through the configured root alias without duplicating candidates", () => fixture(({ root, library, contract }) => {
  const alias = join(root, "library-alias");
  fs.symlinkSync(library, alias);
  fs.symlinkSync(join(library, "local.json"), join(library, "local-alias.json"));
  fs.writeFileSync(join(library, "preferences.json"), "{}");
  const configuredRoot = join(root, "../configured-root");
  fs.symlinkSync(root, configuredRoot);
  const message = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "wl_ui_contract_match", arguments: { library: join(configuredRoot, "library-alias"), contractJson: JSON.stringify(contract) } } };
  const called = spawnSync(process.execPath, [server], { cwd: configuredRoot, env: { ...process.env, WL_PROJECT_ROOT: configuredRoot }, input: JSON.stringify(message) + "\n", encoding: "utf8", timeout: 30000 });
  assert.equal(called.status, 0, called.stderr);
  const response = JSON.parse(called.stdout.trim());
  assert.equal(response.result.isError, false, JSON.stringify(response));
  const result = JSON.parse(response.result.content[0].text);
  assert.equal(result.candidates, 1);
  assert.equal(result.library.complete, true);
  assert.deepEqual(result.library.gaps, []);
  assert.deepEqual(result.library.skipped.map((item) => item.reason).sort(), ["duplicate-file", "not-ui-contract"]);
  assert.equal(result.matches[0].id, "local");
  assert.equal(response.result._meta.wlExecution.validationStatus, "unverified");
}));
