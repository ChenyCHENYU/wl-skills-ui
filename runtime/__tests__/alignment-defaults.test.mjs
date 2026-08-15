import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ensureDefaultAlignment,
  normalizeColumnAlignmentsWith,
} from "../../runtime/core/alignment.ts";

describe("ensureDefaultAlignment 默认对齐补齐", () => {
  it("无显式声明时补默认居中（含表头）", () => {
    const column = ensureDefaultAlignment({ name: "status", label: "状态" }, "center");
    assert.equal(column.align, "center");
    assert.equal(column.headerAlign, "center");
  });

  it("显式 align 时不覆盖业务意图", () => {
    const column = ensureDefaultAlignment(
      { name: "amount", label: "金额", align: "right" },
      "center",
    );
    assert.equal(column.align, "right");
    assert.equal(column.headerAlign, undefined);
  });

  it("已有 cellStyle / headerClass 时不接管", () => {
    const cellStyle = () => ({ textAlign: "left" });
    const column = ensureDefaultAlignment(
      { name: "warn", label: "预警", cellStyle, headerClass: "biz-h" },
      "center",
    );
    assert.equal(column.cellStyle, cellStyle);
    assert.equal(column.headerClass, "biz-h");
    assert.equal(column.align, undefined);
  });

  it("递归补齐分组列 children", () => {
    const column = ensureDefaultAlignment(
      {
        label: "危险废物名称",
        children: [
          { name: "nickname", label: "行业俗称" },
          { name: "code", label: "代码", align: "left" },
          {
            label: "嵌套分组",
            children: [{ name: "inner", label: "内层" }],
          },
        ],
      },
      "center",
    );
    assert.equal(column.children[0].align, "center");
    assert.equal(column.children[0].headerAlign, "center");
    // 显式 left 保留
    assert.equal(column.children[1].align, "left");
    // 深层分组同样补齐
    assert.equal(column.children[2].children[0].align, "center");
    // 分组自身不强行加 align（无叶子语义）
    assert.equal(column.align, undefined);
  });

  it("原列对象不被突变", () => {
    const original = { name: "status", label: "状态" };
    ensureDefaultAlignment(original, "center");
    assert.equal(original.align, undefined);
  });
});

describe("normalizeColumnAlignmentsWith 统一入口", () => {
  it("defaultAlign center：补齐 + 桥接为 AG Grid 可消费配置", () => {
    const [column] = normalizeColumnAlignmentsWith(
      [{ name: "status", label: "状态" }],
      { defaultAlign: "center" },
    );
    assert.equal(column.align, "center");
    assert.deepEqual(column.cellStyle, { textAlign: "center" });
    assert.equal(column.headerClass, "wl-ui-table-header-align--center");
  });

  it("不传 options 保持旧行为（仅桥接显式声明，向后兼容）", () => {
    const column = { name: "title", label: "标题" };
    const [result] = normalizeColumnAlignmentsWith([column]);
    assert.equal(result, column);
    assert.equal(result.align, undefined);
    assert.equal(result.cellStyle, undefined);
  });

  it("defaultAlign null 显式关闭补齐", () => {
    const [result] = normalizeColumnAlignmentsWith(
      [{ name: "title", label: "标题" }],
      { defaultAlign: null },
    );
    assert.equal(result.align, undefined);
  });

  it("与 normalizeColumnAlignment 语义兼容：显式 headerAlign 覆盖默认", () => {
    const [column] = normalizeColumnAlignmentsWith(
      [{ name: "amount", label: "金额", align: "right", headerAlign: "center" }],
      { defaultAlign: "center" },
    );
    assert.deepEqual(column.cellStyle, { textAlign: "right" });
    assert.equal(column.headerClass, "wl-ui-table-header-align--center");
  });
});
