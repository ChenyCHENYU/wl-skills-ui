import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { atomicWriteFile, createAtomicWriter } = require("../../bin/atomic-write.cjs");
const fixtures = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-atomic-write-"));
  fixtures.push(root);
  return root;
}
afterEach(() => fixtures.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe("single-file atomic replacement", () => {
  it("preserves original bytes and existence when a temporary write fails halfway", () => {
    const root = fixture();
    const target = path.join(root, "AGENTS.md");
    const foreign = path.join(root, ".AGENTS.md.wl-skills-foreign.tmp");
    fs.writeFileSync(foreign, "Foreign temporary file");
    const original = Buffer.from("# Team  \r\n\r\n\r\nTail \t");
    const write = createAtomicWriter({ ...fs, writeFileSync: (descriptor) => {
      fs.writeSync(descriptor, "partial write");
      throw new Error("Injected write failure");
    } });
    assert.throws(() => write(target, "replacement"), /Injected/);
    assert.equal(fs.existsSync(target), false);
    fs.writeFileSync(target, original);
    assert.throws(() => write(target, "replacement"), /Injected/);
    assert.deepEqual(fs.readFileSync(target), original);
    assert.deepEqual(fs.readdirSync(root).sort(), [path.basename(foreign), "AGENTS.md"].sort());
  });

  it("preserves the original on rename failure and keeps its permissions after success", () => {
    const root = fixture();
    const target = path.join(root, ".mcp.json");
    fs.writeFileSync(target, "original");
    fs.chmodSync(target, 0o640);
    const write = createAtomicWriter({ ...fs, renameSync: () => { throw new Error("Injected rename failure"); } });
    assert.throws(() => write(target, "replacement"), /Injected/);
    assert.equal(fs.readFileSync(target, "utf8"), "original");
    assert.equal(fs.statSync(target).mode & 0o7777, 0o640);
    assert.deepEqual(fs.readdirSync(root), [".mcp.json"]);
    atomicWriteFile(target, "replacement");
    assert.equal(fs.readFileSync(target, "utf8"), "replacement");
    assert.equal(fs.statSync(target).mode & 0o7777, 0o640);
  });

  it("does not clean up a temporary path it failed to create exclusively", () => {
    const root = fixture();
    const target = path.join(root, "AGENTS.md");
    fs.writeFileSync(target, "original");
    let collision;
    const write = createAtomicWriter({ ...fs, openSync: (temporary, flags, mode) => {
      assert.equal(flags, "wx");
      collision = temporary;
      fs.writeFileSync(temporary, "Foreign concurrent file", { mode });
      throw Object.assign(new Error("collision"), { code: "EEXIST" });
    } });
    assert.throws(() => write(target, "replacement"), /collision/);
    assert.equal(fs.readFileSync(target, "utf8"), "original");
    assert.equal(fs.readFileSync(collision, "utf8"), "Foreign concurrent file");
  });
});
