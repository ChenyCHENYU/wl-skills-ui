import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import jsonc from "../../bin/shared-jsonc.cjs";

const cli = resolve(import.meta.dirname, "../../bin/wl-ui.js");
const cleanup = [];
function project() {
  const root = mkdtempSync(join(tmpdir(), "ui-install-lifecycle-"));
  cleanup.push(root);
  writeFileSync(join(root, "package.json"), '{"name":"fixture","private":true}\n');
  return root;
}
function run(root, args) {
  const result = spawnSync(process.execPath, [cli, ...args, "--project", root], { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  return result;
}
function failingPreload(root, basename) {
  const preload = join(root, "inject-write-failure.cjs");
  writeFileSync(preload, `const fs = require("node:fs");
const originalOpen = fs.openSync;
const originalWrite = fs.writeFileSync;
const tracked = new Set();
fs.openSync = function (file, ...args) {
  const descriptor = originalOpen(file, ...args);
  if (typeof file === "string" && file.includes(${JSON.stringify(`.${basename}.wl-skills-`)})) tracked.add(descriptor);
  return descriptor;
};
fs.writeFileSync = function (file, ...args) {
  if (tracked.has(file)) { fs.writeSync(file, "PARTIAL"); throw new Error("Injected temporary write failure"); }
  return originalWrite(file, ...args);
};\n`);
  return preload;
}
afterEach(() => cleanup.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe("UI install ownership", () => {
  it("keeps Markdown, MCP, HTML and Profile originals intact when CLI temporary writes fail", () => {
    const targets = [
      ["AGENTS.md", "# Team  \r\n\r\nTail \t", ["--skills-only"]],
      [".mcp.json", '{"mcpServers":{"team":{"command":"team"}}}\n', ["--skills-only"]],
      ["index.html", "<html><head></head><body>Team  </body></html>\r\n", []],
      [".wl-ui-profile.json", '{"schema":1,"profile":"legacy-jh-element","extra":"Team"}\n', ["--skills-only", "--profile", "native-element"]],
    ];
    for (const [rel, original, args] of targets) {
      const root = project();
      writeFileSync(join(root, rel), original);
      const result = spawnSync(process.execPath, ["--require", failingPreload(root, rel), cli, "init", "--editor", "agents-generic", ...args, "--project", root], { cwd: root, encoding: "utf8", timeout: 30000 });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Injected temporary write failure/);
      assert.equal(readFileSync(join(root, rel), "utf8"), original);
      assert.equal(existsSync(join(root, rel)), true);
    }
  });

  it("preserves every user byte outside routers, including CRLF, blank lines and trailing spaces", () => {
    const root = project();
    const original = "# Team instructions  \r\n\r\n\r\n\r\nKeep spacing. \t\r\nTail  \t";
    for (const rel of ["AGENTS.md", "CLAUDE.md"]) writeFileSync(join(root, rel), original);
    run(root, ["init", "--editor", "agents-generic,claude-code", "--skills-only"]);
    for (const rel of ["AGENTS.md", "CLAUDE.md"]) assert.ok(readFileSync(join(root, rel), "utf8").startsWith(original));
    run(root, ["update", "--force", "--editor", "agents-generic,claude-code", "--skills-only"]);
    for (const rel of ["AGENTS.md", "CLAUDE.md"]) assert.ok(readFileSync(join(root, rel), "utf8").startsWith(original));
    run(root, ["clean"]);
    for (const rel of ["AGENTS.md", "CLAUDE.md"]) assert.equal(readFileSync(join(root, rel), "utf8"), original);
  });

  it("retains a pre-existing empty shared file after removing its contribution", () => {
    const root = project();
    writeFileSync(join(root, "AGENTS.md"), "");
    run(root, ["init", "--editor", "agents-generic", "--skills-only"]);
    run(root, ["clean"]);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), "");
  });

  it("preserves edited ordinary rules during update --force and clean", () => {
    const root = project();
    run(root, ["init", "--editor", "cursor", "--skills-only"]);
    const file = join(root, ".cursor/rules/element-el-table.mdc");
    const modified = readFileSync(file, "utf8") + "\nProject-specific rule.\n";
    writeFileSync(file, modified);
    run(root, ["update", "--force", "--editor", "cursor", "--skills-only"]);
    assert.equal(readFileSync(file, "utf8"), modified);
    run(root, ["clean"]);
    assert.equal(readFileSync(file, "utf8"), modified);
    const manifest = JSON.parse(readFileSync(join(root, ".wl-skills-ui-manifest.json")));
    assert.ok(manifest.files[".cursor/rules/element-el-table.mdc"]);
  });

  it("does not claim identical project files or same-name MCP entries", () => {
    const root = project();
    mkdirSync(join(root, ".github/wl-skills-ui"), { recursive: true });
    const support = join(root, ".github/wl-skills-ui/README.md");
    writeFileSync(support, "User readme.\n");
    writeFileSync(join(root, ".mcp.json"), '{"mcpServers":{"wl-skills-ui":{"command":"user-owned"}}}\n');
    run(root, ["init", "--editor", "agents-generic", "--skills-only", "--force"]);
    run(root, ["clean"]);
    assert.equal(readFileSync(support, "utf8"), "User readme.\n");
    assert.equal(JSON.parse(readFileSync(join(root, ".mcp.json"))).mcpServers["wl-skills-ui"].command, "user-owned");
  });

  it("references an identical pre-existing rule without acquiring clean permission", () => {
    const sourceProject = project();
    run(sourceProject, ["init", "--editor", "cursor", "--skills-only"]);
    const rel = ".cursor/rules/element-el-table.mdc";
    const original = readFileSync(join(sourceProject, rel), "utf8");
    const root = project();
    mkdirSync(join(root, ".cursor/rules"), { recursive: true });
    writeFileSync(join(root, rel), original);
    run(root, ["init", "--editor", "cursor", "--skills-only"]);
    const manifest = JSON.parse(readFileSync(join(root, ".wl-skills-ui-manifest.json")));
    assert.equal(manifest.files[rel], undefined);
    assert.match(manifest.references[rel], /相同/);
    run(root, ["clean"]);
    assert.equal(readFileSync(join(root, rel), "utf8"), original);
  });

  it("preserves JSONC comments and removes only its server", () => {
    const root = project();
    writeFileSync(join(root, ".mcp.json"), '{\n // team configuration\n "mcpServers": {"team":{"command":"team"},},\n "extra": true,\n}\n');
    run(root, ["init", "--editor", "agents-generic", "--skills-only"]);
    assert.ok(jsonc.parseJsonc(readFileSync(join(root, ".mcp.json"), "utf8")).mcpServers["wl-skills-ui"]);
    run(root, ["clean"]);
    const text = readFileSync(join(root, ".mcp.json"), "utf8");
    assert.match(text, /\/\/ team configuration/);
    assert.deepEqual(jsonc.parseJsonc(text), { mcpServers: { team: { command: "team" } }, extra: true });
  });

  it("preserves comments added inside its own MCP entry on update and clean", () => {
    const root = project();
    run(root, ["init", "--editor", "agents-generic", "--skills-only"]);
    const file = join(root, ".mcp.json");
    const modified = readFileSync(file, "utf8").replace('"command":', '// user execution note\n"command":');
    writeFileSync(file, modified);
    run(root, ["update", "--force", "--editor", "agents-generic", "--skills-only"]);
    assert.equal(readFileSync(file, "utf8"), modified);
    run(root, ["clean"]);
    assert.equal(readFileSync(file, "utf8"), modified);
  });

  it("supports .clinerules directories and all editors without replacing team rules", () => {
    const root = project();
    mkdirSync(join(root, ".clinerules"));
    writeFileSync(join(root, ".clinerules/team.md"), "Keep team rules.\n");
    run(root, ["init", "--editor", "all", "--skills-only"]);
    assert.ok(existsSync(join(root, ".clinerules/wl-skills-ui.md")));
    run(root, ["clean"]);
    assert.equal(readFileSync(join(root, ".clinerules/team.md"), "utf8"), "Keep team rules.\n");
    assert.equal(existsSync(join(root, ".clinerules/wl-skills-ui.md")), false);
  });

  it("migrates a former single .clinerules into a directory and retains other ownership", () => {
    const root = project();
    run(root, ["init", "--editor", "all", "--skills-only"]);
    rmSync(join(root, ".clinerules"));
    mkdirSync(join(root, ".clinerules"));
    writeFileSync(join(root, ".clinerules/team.md"), "Team route.\n");
    run(root, ["update", "--force", "--editor", "all", "--skills-only"]);
    assert.ok(existsSync(join(root, ".clinerules/wl-skills-ui.md")));
    run(root, ["clean"]);
    assert.equal(readFileSync(join(root, ".clinerules/team.md"), "utf8"), "Team route.\n");
    assert.equal(existsSync(join(root, "AGENTS.md")), false);
  });

  it("records HTML link contributions, preserving project changes and original imports", () => {
    const root = project();
    writeFileSync(join(root, "index.html"), "<html><head></head><body>Team</body></html>\n");
    run(root, ["init", "--editor", "agents-generic"]);
    assert.match(readFileSync(join(root, "index.html"), "utf8"), /wl-skills-ui:tokens:begin/);
    writeFileSync(join(root, "index.html"), readFileSync(join(root, "index.html"), "utf8").replace("Team", "New team content"));
    run(root, ["update", "--force", "--editor", "agents-generic", "--skills-only"]);
    run(root, ["clean"]);
    const cleaned = readFileSync(join(root, "index.html"), "utf8");
    assert.match(cleaned, /New team content/);
    assert.doesNotMatch(cleaned, /wl-skills-ui/);
    const original = '<head><link href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css"></head>\n';
    writeFileSync(join(root, "index.html"), original);
    run(root, ["init", "--editor", "agents-generic"]);
    run(root, ["clean"]);
    assert.equal(readFileSync(join(root, "index.html"), "utf8"), original);
  });

  it("migrates a hash-owned historical whole-file router without losing project instructions", () => {
    const root = project();
    const old = readFileSync(resolve(import.meta.dirname, "../../skills/_meta/_compat/headers/agents.txt"), "utf8") + "Old UI rules.\n";
    writeFileSync(join(root, "AGENTS.md"), old);
    const oldHash = createHash("sha256").update(old).digest("hex");
    const foreign = "<!-- wl-skills-kit:begin -->\nKit route\n<!-- wl-skills-kit:end -->";
    const appended = `\r\n\r\n \t${foreign}\r\n\r\n\r\n  \t`;
    writeFileSync(join(root, "AGENTS.md"), `${old}${appended}`);
    writeFileSync(join(root, ".wl-skills-ui-manifest.json"), JSON.stringify({ version: "1.9.14", editors: ["agents-generic"], files: { "AGENTS.md": oldHash } }));
    run(root, ["update", "--editor", "agents-generic", "--skills-only"]);
    const updated = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.doesNotMatch(updated, /Old UI rules/);
    assert.match(updated, /wl-skills-ui:begin/);
    assert.match(updated, /Kit route/);
    run(root, ["clean"]);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), appended);
  });
});
