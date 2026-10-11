import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanProject } from "../engine.mjs";
import { runFix } from "../fix.mjs";

function fixture(callback) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "wl-ui-source-boundary-"));
  try {
    const root = path.join(base, "project");
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    const source = '<template><el-table><el-table-column prop="name"/></el-table></template>';
    const local = path.join(root, "src/Local.vue");
    const outside = path.join(base, "Outside.vue");
    fs.writeFileSync(local, source);
    fs.writeFileSync(outside, source);
    callback({ root, local, outside, source });
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
}

test("directory scans and fixes reject external symlink leaves before reading or writing them", () => fixture(({ root, local, outside, source }) => {
  fs.symlinkSync(outside, path.join(root, "src/ZOutside.vue"));
  const scan = selectors => scanProject({ projectRoot: root, target: "src", profile: "native-element", ...selectors });
  assert.throws(() => scan({ only: "R001" }), /必须位于项目根目录内.*符号链接/);
  assert.throws(() => scan({ target: "src/ZOutside.vue", only: "R001" }), /必须位于项目根目录内.*符号链接/);
  for (const dryRun of [true, false]) {
    assert.throws(() => runFix({ projectRoot: root, target: path.join(root, "src"), only: new Set(["R001"]), dryRun }), /必须位于项目根目录内.*符号链接/);
    assert.equal(fs.readFileSync(local, "utf8"), source);
    assert.equal(fs.readFileSync(outside, "utf8"), source);
    assert.equal(fs.existsSync(path.join(root, ".wl-snapshot")), false);
  }
}));

test("legitimate symlinked Vue files within the same project remain usable", () => fixture(({ root, local }) => {
  fs.symlinkSync(local, path.join(root, "src/Alias.vue"));
  const result = scanProject({ projectRoot: root, target: "src", profile: "native-element", only: "R001" });
  assert.deepEqual(result.checkedFiles, ["src/Alias.vue", "src/Local.vue"]);
  assert.equal(result.ruleExecutions[0].calls, 2);
  assert.ok(result.issues.some(issue => issue.file === "src/Alias.vue" && issue.rule === "R001"));
}));
