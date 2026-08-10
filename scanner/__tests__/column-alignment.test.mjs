import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeColumnAlignment,
  normalizeColumnAlignments,
} from "../../runtime/core/alignment.ts";

describe("显式列对齐跨表格兼容", () => {
  it("没有 align/headerAlign 时不改变列对象", () => {
    const column = { name: "title", label: "标题" };
    assert.equal(normalizeColumnAlignment(column), column);
  });

  it("把显式对齐桥接为 AG Grid 原生配置", () => {
    const [column] = normalizeColumnAlignments([
      { name: "status", align: "center", headerAlign: "right" },
    ]);
    assert.deepEqual(column.cellStyle, { textAlign: "center" });
    assert.equal(column.headerClass, "wl-ui-table-header-align--right");
    assert.equal(column.align, "center");
    assert.equal(column.headerAlign, "right");
  });

  it("尊重业务已有 cellStyle/headerClass，不覆盖语义样式", () => {
    const cellStyle = () => ({ color: "var(--el-color-danger)" });
    const column = normalizeColumnAlignment({
      name: "warning",
      align: "center",
      cellStyle,
      headerClass: "business-header",
    });
    assert.equal(column.cellStyle, cellStyle);
    assert.equal(column.headerClass, "business-header");
  });

  it("递归处理分组列，但不污染未声明对齐的子列", () => {
    const column = normalizeColumnAlignment({
      label: "分组",
      children: [
        { name: "code" },
        { name: "amount", align: "right" },
      ],
    });
    assert.equal(column.children[0].cellStyle, undefined);
    assert.deepEqual(column.children[1].cellStyle, { textAlign: "right" });
    assert.equal(
      column.children[1].headerClass,
      "wl-ui-table-header-align--right",
    );
  });
});
