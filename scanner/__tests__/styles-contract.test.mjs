import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("表单样式契约", () => {
  const form = read("styles/element/_form.scss");
  const baseComponents = read("styles/vendors/_base-components.scss");
  const scope = read("styles/_scope.scss");

  it("业务表单字号统一为 12px，且保留定制页豁免", () => {
    assert.match(form, /--wk-form-font-size:\s*12px\s*!important/);
    for (const selector of [
      "&.el-form-item__label",
      "&.el-input__inner",
      "&.el-textarea__inner",
      "&.el-select__selected-item",
      "&.el-select__placeholder",
      "&.el-date-editor .el-range-input",
    ]) {
      assert.ok(form.includes(selector), `缺少字号治理选择器：${selector}`);
    }
    assert.match(
      baseComponents,
      /font-size:\s*var\(--wk-form-font-size,\s*12px\)\s*!important/,
    );
    for (const exempt of [
      ".lp-root",
      ".session-login",
      ".wl-ui-skin-exempt",
      "[data-wl-ui-skin='off']",
    ]) {
      assert.ok(scope.includes(exempt), `缺少定制页豁免：${exempt}`);
    }
  });

  it("textarea focus 强制品牌色实线与轻外环", () => {
    assert.ok(
      form.includes("&.el-textarea > .el-textarea__inner:focus"),
      "缺少原生 textarea focus",
    );
    assert.ok(
      form.includes(
        "&.com-textarea > .el-textarea > .el-textarea__inner:focus",
      ),
      "缺少 jh textarea focus",
    );
    assert.match(
      form,
      /border:\s*1px solid var\(--el-color-primary,\s*#002a8f\)\s*!important/,
    );
    assert.match(
      form,
      /rgba\(var\(--el-color-primary-rgb,\s*0,\s*42,\s*143\),\s*0\.12\)/,
    );
    assert.doesNotMatch(
      baseComponents,
      /&:focus\s*\{[\s\S]*?rgba\(var\(--el-color-primary-rgb\),\s*0\.12\)/,
    );
  });

  it("数字输入框覆盖子 wrapper 与同节点 wrapper，且阻止双描边", () => {
    for (const selector of [
      "&.el-input-number:not(.el-input__wrapper)",
      "&.el-input-number .el-input__wrapper",
      "&.el-input-number.el-input__wrapper",
      "&.el-input-number.el-input__wrapper:not(.is-disabled):focus-within",
      "&.el-input-number.el-input__wrapper > .el-input > .el-input__wrapper",
    ]) {
      assert.ok(form.includes(selector), `缺少数字框 DOM 分支：${selector}`);
    }
    assert.match(
      form,
      /0 0 0 1\.5px var\(--el-color-primary,\s*#002a8f\) inset !important/,
    );
    assert.match(
      baseComponents,
      /\.el-input-number:not\(\.is-disabled\) \.el-input__wrapper,[\s\S]*?var\(--el-color-danger,\s*#f56c6c\) inset !important/,
    );
    assert.match(
      baseComponents,
      /\.el-input-number\.el-input__wrapper:not\(\.is-disabled\)[\s\S]*?> \.el-input__wrapper \{[\s\S]*?box-shadow:\s*none !important/,
    );
  });
});

describe("长文本省略与悬停契约", () => {
  const table = read("styles/element/_table.scss");
  const agGrid = read("styles/vendors/_ag-grid.scss");
  const registry = read("runtime/core/registry.ts");
  const tableRule = read("scanner/rules/table.mjs");

  it("原生表格和 AG Grid 都具备单行省略样式", () => {
    assert.match(
      table,
      /\.cell\.el-tooltip\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
    );
    assert.match(
      agGrid,
      /\.ag-cell-value\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
    );
  });

  it("普通文本列自动启用 tooltip，自定义/换行列保留业务配置", () => {
    assert.match(registry, /showOverflowTooltip:\s*true/);
    for (const guard of [
      "col.showOverflowTooltip !== undefined",
      "col.tooltipValueGetter !== undefined",
      "col.wrapText === true",
      "col.autoHeight === true",
      "col.defaultNode !== undefined",
      "col.defaultSlot !== undefined",
    ]) {
      assert.ok(registry.includes(guard), `缺少长文本边界：${guard}`);
    }
    assert.match(tableRule, /id:\s*"R039"/);
    assert.match(tableRule, /show-overflow-tooltip/);
  });
});

describe("BaseToolbar 分裂下拉契约", () => {
  const toolbar = read("styles/vendors/_base-query-toolbar.scss");

  it("仅治理 BaseToolbar split-button，并把箭头段合并为同一视觉按钮", () => {
    assert.match(
      toolbar,
      /\.base-toolbar-box[\s\S]*?\.action-button-wrap[\s\S]*?> \.el-dropdown[\s\S]*?> \.el-button-group/,
    );
    assert.match(
      toolbar,
      /> \.el-button\.el-dropdown__caret-button\s*\{[\s\S]*?width:\s*24px !important;[\s\S]*?border-left:\s*0 !important;/,
    );
    assert.match(
      toolbar,
      /&::before\s*\{[\s\S]*?display:\s*none !important;[\s\S]*?content:\s*none !important;/,
    );
    assert.match(
      toolbar,
      /&:focus-within > \.el-button:not\(\.is-disabled\):not\(\[disabled\]\)[\s\S]*?background-color:\s*var\(--el-button-hover-bg-color\) !important;/,
    );
  });

  it("仅扁平化 action-dropdown-menu 内嵌按钮，不污染普通下拉菜单", () => {
    assert.match(
      toolbar,
      /\.el-dropdown-menu\.action-dropdown-menu[\s\S]*?\.el-dropdown-menu__item[\s\S]*?> \.el-button\s*\{[\s\S]*?border:\s*0 !important;[\s\S]*?background:\s*transparent !important;/,
    );
    assert.doesNotMatch(
      toolbar,
      /\n\.el-dropdown-menu \.el-dropdown-menu__item/,
    );
  });
});
