import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanProject } from "../engine.mjs";

function fixture(source, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wl-ui-rule-callbacks-"));
  try {
    fs.writeFileSync(path.join(root, "Example.vue"), source);
    callback(options => scanProject({ projectRoot: root, target: "Example.vue", profile: "native-element", ...options }));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test("only/skip choose actual callbacks before scanning, including engine/MCP consumers", () => fixture(
  '<template><el-table><el-table-column prop="name" align="center"/></el-table><el-button>新增</el-button></template>',
  scan => {
    const only = scan({ only: "R001" });
    assert.deepEqual(only.ruleExecutions.map(rule => rule.id), ["R001"]);
    assert.equal(only.ruleExecutions[0].calls, 1);
    assert.equal(only.allIssues.some(issue => issue.rule === "R038"), false);
    assert.equal(only.issues.length, 0);
    const skip = scan({ skip: "R038" });
    assert.equal(skip.ruleExecutions.some(rule => rule.id === "R038"), false);
    assert.equal(skip.allIssues.some(issue => issue.rule === "R038"), false);
    const all = scan({});
    assert.ok(all.ruleExecutions.some(rule => rule.id === "R038" && rule.calls > 0));
    assert.ok(all.issues.some(issue => issue.rule === "R038"));
  },
));

test("unknown rule selectors fail before scanning rather than becoming zero-rule success", () => {
  for (const selectors of [{ only: "R999" }, { skip: "R999" }]) {
    assert.throws(() => scanProject({ target: "missing-before-read.vue", ...selectors }), /不存在或格式无效的规则.*R999/);
  }
});

test("rule callback scope cannot suppress actual compiler SFC errors", () => fixture(
  "<template><el-table></template>",
  scan => {
    for (const selectors of [{ only: "R001" }, { only: "R001", skip: "SFC_PARSE" }]) {
      assert.throws(() => scan({ parser: "sfc", ...selectors }), /SFC 解析失败.*missing end tag/);
      const result = scan({ parser: "auto", ...selectors });
      assert.equal(result.parsing.used.sfc, 1);
      assert.ok(result.parsing.errors.length > 0);
      assert.ok(result.issues.some(issue => issue.rule === "SFC_PARSE"));
      assert.deepEqual(result.ruleExecutions.map(rule => rule.id), ["R001"]);
    }
  },
));
