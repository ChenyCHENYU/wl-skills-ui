import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const repo = resolve(import.meta.dirname, "../..");
const cli = join(repo, "bin/wl-ui.js");
const manifestPath = ".wl-skills/state/ui/manifest.json";
const roots = [];
function fixture(metadata = { name: "fixture", private: true }) {
  const root = mkdtempSync(join(tmpdir(), "ui-compact-")); roots.push(root);
  if (metadata) writeFileSync(join(root, "package.json"), JSON.stringify(metadata));
  return root;
}
function run(root, args, expected = 0, preload) {
  const result = spawnSync(process.execPath, [...(preload ? ["--require", preload] : []), cli, ...args, "--project", root], { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result;
}
function manifest(root) { return JSON.parse(readFileSync(join(root, manifestPath), "utf8")); }
function tree(root, prefix = "") {
  const files = {};
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, tree(root, rel));
    else files[rel] = readFileSync(join(root, rel)).toString("base64");
  }
  return files;
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

test("compact 默认保留必要工具文件、一个配置源，不复制叶技能或自动配置 MCP", () => {
  const root = fixture({ name: "fixture", private: true, wlSkills: { custom: { keep: true } } });
  run(root, ["init", "--skills-only"]);
  assert.deepEqual(Object.keys(tree(root)).sort(), [".agents/skills/wl-skills-ui/SKILL.md", manifestPath, ".wl-skills/state/.gitignore", "AGENTS.md", "package.json"].sort());
  const metadata = JSON.parse(readFileSync(join(root, "package.json")));
  assert.deepEqual(metadata.wlSkills, { custom: { keep: true }, schemaVersion: 1, integration: "compact", hosts: ["codex"], mcp: false });
  assert.ok(Buffer.byteLength(readFileSync(join(root, "AGENTS.md"))) < 1400);
  assert.equal(existsSync(join(root, ".mcp.json")), false);
  assert.equal(manifest(root).integration, "compact");
  assert.match(run(root, ["doctor"]).stdout, /按需关闭|未启用|未配置|按需启用/);
});

test("配置和显式 hosts 决定入口，目录不扩大宿主选择，三种主流宿主共用一个技能", () => {
  const root = fixture({ name: "fixture", wlSkills: { hosts: ["claude"] } });
  mkdirSync(join(root, ".cursor")); mkdirSync(join(root, ".kiro"));
  run(root, ["init", "--skills-only"]);
  assert.ok(existsSync(join(root, ".claude/skills/wl-skills-ui/SKILL.md")));
  assert.equal(existsSync(join(root, ".agents")), false);
  run(root, ["update", "--skills-only"]);
  assert.deepEqual(manifest(root).hosts, ["claude"]);
  run(root, ["update", "--hosts", "codex,zcode,kilo", "--editor", "claude-code", "--skills-only"]);
  assert.deepEqual(manifest(root).hosts, ["codex", "zcode", "kilo"]);
  assert.equal(existsSync(join(root, ".claude/skills/wl-skills-ui/SKILL.md")), false);
  assert.deepEqual(Object.keys(manifest(root).files), [".agents/skills/wl-skills-ui/SKILL.md", "AGENTS.md"]);
  assert.equal(existsSync(join(root, ".cursor/rules")), false);
});

test("旧清单迁移仅退休未修改贡献，保留用户规则与外来 Markdown 字节", () => {
  const root = fixture();
  run(root, ["init", "--editor", "cursor,agents-generic", "--integration", "expanded", "--skills-only", "--mcp"]);
  const keep = ".cursor/rules/element-el-table.mdc";
  const remove = ".cursor/rules/element-el-form.mdc";
  const customized = `${readFileSync(join(root, keep), "utf8")}\nUser business rule.\n`;
  writeFileSync(join(root, keep), customized);
  const outside = "\r\n<!-- wl-skills-kit:begin -->\r\nTeam rule.  \r\n<!-- wl-skills-kit:end -->\r\n";
  writeFileSync(join(root, "AGENTS.md"), readFileSync(join(root, "AGENTS.md"), "utf8") + outside);
  writeFileSync(join(root, ".wl-skills-ui-manifest.json"), readFileSync(join(root, manifestPath)));
  rmSync(join(root, manifestPath));
  const metadata = JSON.parse(readFileSync(join(root, "package.json"))); delete metadata.wlSkills;
  writeFileSync(join(root, "package.json"), JSON.stringify(metadata));
  run(root, ["update", "--hosts", "codex", "--integration", "compact", "--no-mcp", "--skills-only"]);
  assert.equal(existsSync(join(root, ".wl-skills-ui-manifest.json")), false);
  assert.equal(existsSync(join(root, remove)), false);
  assert.equal(readFileSync(join(root, keep), "utf8"), customized);
  assert.ok(readFileSync(join(root, "AGENTS.md"), "utf8").endsWith(outside));
  assert.ok(manifest(root).files[keep], "保留原始基线，后续 clean 无权删除用户修改");
  run(root, ["clean"]);
  assert.equal(readFileSync(join(root, keep), "utf8"), customized);
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), outside);
});

test("同版本更新仍按配置迁移，dry-run 不改任何字节", () => {
  const root = fixture();
  run(root, ["init", "--hosts", "claude", "--skills-only"]);
  const metadata = JSON.parse(readFileSync(join(root, "package.json"))); metadata.wlSkills.hosts = ["codex"];
  writeFileSync(join(root, "package.json"), JSON.stringify(metadata));
  const before = tree(root);
  run(root, ["update", "--dry-run", "--skills-only"]);
  assert.deepEqual(tree(root), before);
  run(root, ["update", "--skills-only"]);
  assert.ok(existsSync(join(root, ".agents/skills/wl-skills-ui/SKILL.md")));
  assert.equal(existsSync(join(root, ".claude/skills/wl-skills-ui/SKILL.md")), false);
});

test("迁移末尾写入失败时恢复已退休文件、配置、入口与旧清单", () => {
  const root = fixture();
  run(root, ["init", "--editor", "cursor", "--integration", "expanded", "--skills-only"]);
  const preload = join(root, "inject.cjs");
  writeFileSync(preload, `const fs = require('node:fs'); const open = fs.openSync; const write = fs.writeFileSync; const descriptors = new Set();
fs.openSync = function(file, ...args) { const fd = open(file, ...args); if (String(file).includes('.manifest.json.wl-skills-')) descriptors.add(fd); return fd; };
fs.writeFileSync = function(file, ...args) { if (descriptors.has(file)) throw new Error('Injected final manifest failure'); return write(file, ...args); };`);
  const before = tree(root);
  const result = run(root, ["update", "--hosts", "codex", "--integration", "compact", "--skills-only"], 1, preload);
  assert.match(result.stderr, /Injected final manifest failure/);
  assert.deepEqual(tree(root), before);
});

test("MCP 按需开启与关闭，只移除本包节点并保留外来 JSONC", () => {
  const root = fixture();
  writeFileSync(join(root, ".mcp.json"), '{\n// Team connection\n"mcpServers":{"team":{"command":"team"}}\n}\n');
  run(root, ["init", "--mcp", "--hosts", "claude", "--skills-only"]);
  assert.match(readFileSync(join(root, ".mcp.json"), "utf8"), /wl-skills-ui/);
  run(root, ["update", "--no-mcp", "--skills-only"]);
  const text = readFileSync(join(root, ".mcp.json"), "utf8");
  assert.match(text, /Team connection/); assert.match(text, /"team"/); assert.doesNotMatch(text, /wl-skills-ui/);
});

test("无 package.json 项目复用统一配置目录，非法配置和越界链接零写入", () => {
  const root = fixture(null);
  run(root, ["init", "--skills-only"]);
  assert.ok(existsSync(join(root, ".wl-skills/config.json")));
  assert.equal(existsSync(join(root, "package.json")), false);
  const invalid = fixture({ name: "invalid", wlSkills: { hosts: ["glm"] } });
  const before = tree(invalid);
  run(invalid, ["init", "--skills-only"], 1);
  assert.deepEqual(tree(invalid), before);
  const blocked = fixture(); const outside = fixture();
  symlinkSync(outside, join(blocked, ".agents"), "dir");
  run(blocked, ["init", "--skills-only"], 2);
  assert.deepEqual(readdirSync(outside), ["package.json"]);
});

test("compact 实际依赖的任务、扫描、状态保留真实包版本与统一证据路径", () => {
  const pkg = JSON.parse(readFileSync(join(repo, "package.json")));
  const root = fixture({ name: "runtime-fixture", devDependencies: { [pkg.name]: pkg.version, vue: "^3.4.0" } });
  mkdirSync(join(root, "node_modules/@agile-team"), { recursive: true });
  symlinkSync(repo, join(root, "node_modules", pkg.name), "dir");
  const source = "src/index.vue"; mkdirSync(dirname(join(root, source)), { recursive: true });
  writeFileSync(join(root, source), '<template><div class="example">Example</div></template>\n<style scoped>.example { display: block; }</style>\n');
  run(root, ["init", "--skills-only"]);
  const task = JSON.parse(run(root, ["task", "检查当前 Vue 代码", "--target", source, "--run-id", "compact-runtime", "--json"]).stdout);
  assert.equal(task.ready, true); assert.equal(task.notice.runtime.status, "aligned");
  run(root, ["scan", "--target", source, "--run-id", "compact-runtime", "--output", "json"]);
  const status = JSON.parse(run(root, ["status", "--run-id", "compact-runtime", "--json"]).stdout);
  assert.equal(status.executionStatus, "completed");
  assert.ok(existsSync(join(root, ".wl-skills/state/ui/runs/compact-runtime")));
  assert.equal(existsSync(join(root, ".wl-skills-ui")), false);
});

test("新清单存在时不接管并存的未知旧清单", () => {
  const root = fixture();
  run(root, ["init", "--skills-only"]);
  const legacy = join(root, ".wl-skills-ui-manifest.json");
  const foreign = '{"projectNote":"user migration notes"}\n';
  writeFileSync(legacy, foreign);
  run(root, ["update", "--skills-only"]);
  assert.equal(readFileSync(legacy, "utf8"), foreign);
  run(root, ["clean"]);
  assert.equal(readFileSync(legacy, "utf8"), foreign);
});
