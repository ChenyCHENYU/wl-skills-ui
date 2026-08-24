import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVueSfc } from "../sfc-parser.mjs";

const SOURCE = `<template>
  <el-dialog>
    <template #footer>
      <el-button>保存</el-button>
    </template>
  </el-dialog>
</template>

<script>export default { name: "LegacyPage" }</script>
<script setup lang="ts">const ready = true</script>

<style scoped>.page { color: red; }</style>
<style lang="scss">.page { &__body { color: blue; } }</style>
`;

describe("Vue SFC parser", () => {
  it("fast 模式不会被嵌套 template 截断，并读取全部 style/script", () => {
    const parsed = parseVueSfc(SOURCE, {
      filename: "Nested.vue",
      mode: "fast",
    });

    assert.equal(parsed.parser, "fast");
    assert.match(parsed.template.text, /<el-button>保存<\/el-button>/);
    assert.match(parsed.template.text, /<\/el-dialog>/);
    assert.equal(parsed.scripts.length, 2);
    assert.equal(parsed.scripts[1].setup, true);
    assert.equal(parsed.scripts[1].lang, "ts");
    assert.equal(parsed.styles.length, 2);
    assert.equal(parsed.styles[0].scoped, true);
    assert.equal(parsed.styles[1].lang, "scss");
  });

  it("auto 模式优先使用项目 compiler-sfc 并保持源码行号", () => {
    const parsed = parseVueSfc(SOURCE, {
      filename: "Nested.vue",
      mode: "auto",
      projectRoot: process.cwd(),
    });

    assert.ok(["sfc", "fast"].includes(parsed.parser));
    assert.match(parsed.template.text, /<template #footer>/);
    assert.equal(parsed.styles.length, 2);
    assert.equal(parsed.scripts.length, 2);
    assert.equal(parsed.template.lineOffset, 0);
    assert.equal(parsed.scripts[0].lineOffset, 8);
  });

  it("无 template 文件安全回退整文件内容", () => {
    const parsed = parseVueSfc("const answer = 42", { mode: "fast" });
    assert.equal(parsed.template.text, "const answer = 42");
    assert.deepEqual(parsed.styles, []);
    assert.deepEqual(parsed.scripts, []);
  });

  it("拒绝未知 parser 模式", () => {
    assert.throws(
      () => parseVueSfc(SOURCE, { mode: "magic" }),
      /fast \/ auto \/ sfc/,
    );
  });
});
