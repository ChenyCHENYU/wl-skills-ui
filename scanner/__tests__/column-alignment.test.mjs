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
    assert.deepEqual(column.cellStyle({}), { textAlign: "center" });
    assert.equal(column.cellClass({}), "wl-ui-table-cell-align--center");
    assert.equal(column.headerClass, "wl-ui-table-header-align--right");
    assert.equal(column.align, "center");
    assert.equal(column.headerAlign, "right");
  });

  it("组合业务已有 cellStyle，业务值优先且不叠加强制对齐 class", () => {
    const cellStyle = () => ({ color: "var(--el-color-danger)" });
    const cellClass = () => "business-cell";
    const column = normalizeColumnAlignment({
      name: "warning",
      align: "center",
      cellStyle,
      cellClass,
      headerClass: "business-header",
    });
    assert.deepEqual(column.cellStyle({}), {
      textAlign: "center",
      color: "var(--el-color-danger)",
    });
    assert.equal(column.cellClass, cellClass);
    assert.equal(column.headerClass, "business-header");
  });

  it("把对象型 cellStyle 桥接为函数，保留业务 cellClass 与对齐优先级", () => {
    const column = normalizeColumnAlignment({
      name: "amount",
      align: "right",
      cellStyle: { color: "red", textAlign: "left" },
      cellClass: "business-amount",
    });
    assert.deepEqual(column.cellStyle({}), {
      textAlign: "left",
      color: "red",
    });
    assert.equal(column.cellClass, "business-amount");
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
    assert.deepEqual(column.children[1].cellStyle({}), { textAlign: "right" });
    assert.equal(
      column.children[1].cellClass({}),
      "wl-ui-table-cell-align--right",
    );
    assert.equal(
      column.children[1].headerClass,
      "wl-ui-table-header-align--right",
    );
  });
});
