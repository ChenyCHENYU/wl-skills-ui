import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractUiContract,
  matchUiContracts,
  validateUiContract,
} from "../ui-contract.mjs";

const PAGE = `<template>
  <main class="list-page">
    <BaseQuery><el-form><el-select size="small" /></el-form></BaseQuery>
    <div class="toolbar">
      <el-button type="primary" size="small" :icon="Plus">新增订单</el-button>
    </div>
    <BaseTable pagination>
      <el-table-column type="selection" align="center" />
      <el-table-column label="操作" align="center" />
    </BaseTable>
    <el-pagination />
  </main>
</template>
<script setup lang="ts">
const privateEndpoint = "/api/internal/orders"
</script>
<style scoped>
.list-page { color: var(--el-color-primary); }
</style>`;

describe("ui-contract 脱敏 JSON", () => {
  it("只提取语义、能力与约束，不保存源码/接口/原始文案", () => {
    const contract = extractUiContract({
      content: PAGE,
      domain: "produce",
      filename: "/private/project/src/views/order/list.vue",
      mode: "native",
      parser: "fast",
      scenario: "query-table",
    });
    const serialized = JSON.stringify(contract);

    assert.equal(contract.schema, "wl-ui-contract.v1");
    assert.equal(contract.visibility, "project-private");
    assert.equal(contract.source.file, "list.vue");
    assert.equal(contract.layout.kind, "list-page");
    assert.ok(contract.layout.regions.includes("table"));
    assert.deepEqual(contract.actions, [
      { semantic: "create", location: "toolbar", size: "small", icon: true },
    ]);
    assert.ok(contract.components.some((item) => item.implementation === "BaseTable"));
    assert.ok(contract.constraints.includes("default-table-axis-center"));
    assert.ok(contract.rules.required.includes("R041"));
    assert.ok(contract.tokens.includes("--el-color-primary"));
    assert.doesNotMatch(serialized, /新增订单|\/api\/internal|private\/project/);
    assert.equal(validateUiContract(contract).ok, true);
  });

  it("fingerprint 忽略来源、文件名和 id，只比较语义结构", () => {
    const left = extractUiContract({
      content: PAGE,
      domain: "produce",
      filename: "left.vue",
      id: "left",
      parser: "fast",
      scenario: "query-table",
    });
    const right = extractUiContract({
      content: `${PAGE}\n<!-- source-only comment -->`,
      domain: "produce",
      filename: "right.vue",
      id: "right",
      parser: "fast",
      scenario: "query-table",
    });
    assert.equal(left.source.hash === right.source.hash, false);
    assert.equal(left.fingerprint, right.fingerprint);
  });

  it("校验器阻止业务字段、API 和源码正文混入契约", () => {
    const contract = extractUiContract({
      content: PAGE,
      domain: "produce",
      parser: "fast",
    });
    contract.components[0].fields = ["customerName"];
    const result = validateUiContract(contract);
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /禁止保存源码/);
  });

  it("匹配按领域、场景、布局与组件族稳定排序", () => {
    const query = extractUiContract({
      content: PAGE,
      domain: "produce",
      id: "query",
      parser: "fast",
      scenario: "query-table",
    });
    const exact = { ...query, id: "exact-copy" };
    const other = extractUiContract({
      content: "<template><el-dialog /></template>",
      domain: "sales",
      id: "other",
      parser: "fast",
      scenario: "dialog-form",
    });
    const matches = matchUiContracts(query, [other, exact]);
    assert.equal(matches[0].id, "exact-copy");
    assert.equal(matches[0].score, 1);
    assert.ok(matches[1].score < matches[0].score);
  });
});
