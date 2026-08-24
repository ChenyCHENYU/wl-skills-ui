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
  const jhUi = read("styles/vendors/_jh-ui.scss");
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

  it("所有输入结构保留统一左右间距，placeholder 不贴边", () => {
    assert.match(form, /--wk-form-control-padding-inline:\s*11px/);
    assert.match(form, /padding:\s*0 var\(--wk-form-control-padding-inline\) !important/);
    assert.match(form, /\.el-textarea__inner[\s\S]*?padding:\s*4px var\(--wk-form-control-padding-inline\)/);
    assert.match(jhUi, /&\.el-input > \.el-input__inner,[\s\S]*?padding:\s*0 var\(--wk-form-control-padding-inline,\s*11px\) !important/);
    assert.match(jhUi, /&\.com-picker \.el-input > \.el-input__inner,[\s\S]*?padding:\s*0 var\(--wk-form-control-padding-inline,\s*11px\) !important/);
    assert.match(form, /&\.el-input__inner::placeholder/);
  });

  it("数字输入框覆盖子 wrapper 与同节点 wrapper，且阻止双描边", () => {
    for (const selector of [
      "&.el-input-number:not(.com-inputNumber-content):not(.el-input__wrapper)",
      "&.el-input-number:not(.com-inputNumber-content) .el-input__wrapper",
      "&.el-input-number.el-input__wrapper:not(.com-inputNumber-content)",
      "&.el-input-number.el-input__wrapper:not(.com-inputNumber-content):not(.is-disabled):focus-within",
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

  it("jh-input-number 由复合根统一外轮廓，但保留组件自身高度链、对齐与 controls", () => {
    assert.match(
      jhUi,
      /&\.com-inputNumber-content\.el-input-number\.el-input__wrapper\s*\{[\s\S]*?height:\s*var\(--wk-form-control-height,\s*26px\)\s*!important;[\s\S]*?box-shadow:/,
    );
    assert.match(
      jhUi,
      /\.com-inputNumber-content\.el-input-number\.el-input__wrapper[\s\S]*?> \.el-input[\s\S]*?> \.el-input__wrapper\s*\{[\s\S]*?height:\s*100%\s*!important;[\s\S]*?box-shadow:\s*none !important/,
    );
    assert.match(
      jhUi,
      /\.com-inputNumber-content\.el-input-number\.el-input__wrapper[\s\S]*?> \.el-input[\s\S]*?> \.el-input__wrapper\s*\{[\s\S]*?padding-left:\s*var\(--wk-form-control-padding-inline,\s*11px\)\s*!important/,
    );
    assert.doesNotMatch(
      form,
      /&\.el-input-number\s+\.el-input-number__(increase|decrease)/,
    );
    assert.doesNotMatch(
      form,
      /&\.el-input-number\s+\.el-input__inner[\s\S]*?text-align:\s*left\s*!important/,
    );
    assert.match(jhUi, /&\.com-inputNumber-content\.el-input-number\.el-input__wrapper\s*\{[\s\S]*?position:\s*relative\s*!important/);
    assert.match(jhUi, /\.com-inputNumber-content\.el-input-number\.el-input__wrapper[\s\S]*?width:\s*var\(--wk-form-number-controls-width,\s*24px\) !important/);
    assert.match(jhUi, /\.com-inputNumber-content\.el-input-number\.el-input__wrapper[\s\S]*?height:\s*50% !important/);
    assert.match(jhUi, /\.com-inputNumber-content\.el-input-number\.el-input__wrapper[\s\S]*?right:\s*0 !important/);
  });

  it("普通数字框步进按钮固定为右侧上下两格，不再隐藏", () => {
    assert.match(form, /--wk-form-number-controls-width:\s*24px/);
    assert.match(form, /\.el-input-number__increase[\s\S]*?top:\s*0 !important/);
    assert.match(form, /\.el-input-number__decrease[\s\S]*?bottom:\s*0 !important/);
    assert.match(form, /:where\(\.el-input-number__increase, \.el-input-number__decrease\)[\s\S]*?height:\s*50% !important/);
    assert.doesNotMatch(form, /\.el-input-number__\{\s*display:\s*none/);
  });

  it("input-group 由组合根统一附加段高度、圆角、图标和状态描边", () => {
    for (const selector of [
      "&.el-input.el-input-group",
      "&.el-input.el-input-group > .el-input__wrapper",
      "&.el-input.el-input-group > .el-input__inner",
      "&.el-input.el-input-group > .el-input-group__append",
      "&.el-input.el-input-group > .el-input-group__prepend",
      "&.el-input .el-input__prefix-inner > .el-icon",
      "&.el-input .el-input__suffix-inner > .el-icon",
    ]) {
      assert.ok(form.includes(selector), `缺少 input-group 分支：${selector}`);
    }
    assert.match(
      form,
      /&\.el-input\.el-input-group\s*\{[\s\S]*?height:\s*var\(--wk-form-control-height\)\s*!important;[\s\S]*?border-radius:\s*var\(--wk-form-control-radius\)\s*!important;[\s\S]*?box-shadow:/,
    );
    assert.match(
      form,
      /&\.el-input\.el-input-group > \.el-input__wrapper\s*\{[\s\S]*?border-radius:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important/,
    );
    assert.match(
      form,
      /\.el-icon,[\s\S]*?width:\s*14px\s*!important;[\s\S]*?height:\s*14px\s*!important/,
    );
  });
});

describe("Element Date/Time Picker 弹层隔离", () => {
  const picker = read("styles/element/_picker.scss");
  const elementIndex = read("styles/element/index.scss");

  it("只重置真实 picker popper 内面板，不破坏 Popper 外层定位", () => {
    assert.match(elementIndex, /@forward '\.\/picker'/);
    assert.match(picker, /\.el-picker__popper:not\(\.wl-ui-picker-geometry-off\)/);
    assert.match(picker, /> :where\([\s\S]*?\.el-date-picker,[\s\S]*?\.el-time-panel/);
    assert.match(picker, /position:\s*relative\s*!important/);
    assert.match(picker, /inset:\s*auto\s*!important/);
    assert.match(picker, /width:\s*auto\s*!important/);
    const rootBlock = picker.match(
      /html body \.el-picker__popper:not\(\.wl-ui-picker-geometry-off\)\s*\{([^}]*)\}/,
    )?.[1];
    assert.ok(rootBlock, "缺少 picker popper 根规则");
    assert.doesNotMatch(rootBlock, /position\s*:/, "不得覆盖 Popper 外层定位");
  });
});

describe("上下分屏 AG Grid 高度链契约", () => {
  const dragRow = read("styles/vendors/_jh-drag-row.scss");
  const resizeRuntime = read("runtime/split-grid-resize.ts");

  it("只在运行时识别的分屏 AG Grid 内补齐收缩链，不给外层制造滚动条", () => {
    for (const marker of [
      "[data-wl-ui-split-pane]",
      "[data-wl-ui-split-grid-chain]",
      "[data-wl-ui-split-grid-flex-parent]",
      "[data-wl-ui-split-grid-host]",
    ]) {
      assert.ok(dragRow.includes(marker), `缺少分屏结构标记：${marker}`);
    }
    assert.match(
      dragRow,
      /\[data-wl-ui-split-grid-flex-parent\][\s\S]*?> \[data-wl-ui-split-grid-host\][\s\S]*?flex:\s*1 1 0\s*!important;[\s\S]*?height:\s*0\s*!important/,
    );
    assert.doesNotMatch(dragRow, /\.drager_(top|bottom)[^{]*\{[^}]*overflow:\s*(auto|scroll)/);
  });

  it("ResizeObserver 按帧合并并通知 AG Grid 自己重布局", () => {
    assert.match(resizeRuntime, /subscribeElementResize/);
    assert.match(
      read("runtime/observer-hub.ts"),
      /ResizeObserver/,
    );
    assert.match(resizeRuntime, /window\.requestAnimationFrame\(flushPendingPanes\)/);
    assert.match(resizeRuntime, /host\.dispatchEvent\(/);
    assert.doesNotMatch(
      resizeRuntime,
      /window\.dispatchEvent\(new window\.Event\("resize"\)\)/,
    );
    assert.ok(resizeRuntime.includes('const SPLIT_ROOT_SELECTOR = ".drager_row"'));
    for (const exempt of [
      ".lp-root",
      ".session-login",
      ".wl-ui-skin-exempt",
      "[data-wl-ui-skin='off']",
    ]) {
      assert.ok(resizeRuntime.includes(exempt), `缺少分屏豁免：${exempt}`);
    }
  });
});

describe("AG Grid 列对齐契约", () => {
  const agGrid = read("styles/vendors/_ag-grid.scss");

  it("为叶子表头和分组表头提供 left/center/right 同轴对齐", () => {
    for (const [alignment, justify] of [
      ["left", "flex-start"],
      ["center", "center"],
      ["right", "flex-end"],
    ]) {
      assert.ok(
        agGrid.includes(`.ag-header-cell.wl-ui-table-header-align--${alignment}`),
      );
      assert.ok(
        agGrid.includes(`.ag-header-group-cell.wl-ui-table-header-align--${alignment}`),
      );
      assert.match(
        agGrid,
        new RegExp(`header-align--${alignment}[\\s\\S]*?justify-content:\\s*${justify}`),
      );
    }
    assert.doesNotMatch(
      agGrid,
      /^\.ag-header-cell-label\s*\{[^}]*justify-content:\s*center/m,
      "不得把所有业务表头强制居中",
    );
  });

  it("编辑态退出文本单元格 padding，内容对齐只命中显式 class", () => {
    assert.match(
      agGrid,
      /\.ag-cell\.editable-cell,[\s\S]*?\.ag-cell\.always-editable-cell,[\s\S]*?\.ag-cell\.ag-cell-inline-editing\s*\{[\s\S]*?padding-left:\s*0\s*!important;[\s\S]*?padding-right:\s*0\s*!important/,
    );
    for (const alignment of ["left", "center", "right"]) {
      assert.ok(
        agGrid.includes(`.wl-ui-table-cell-align--${alignment}`),
        `缺少单元格对齐桥接：${alignment}`,
      );
    }
    assert.doesNotMatch(
      agGrid,
      /^\.ag-cell\s*\{[^}]*text-align:/m,
      "不得强制所有单元格对齐",
    );
  });

  it("对齐轴贯穿嵌套 ag-cell-wrapper / ag-cell-value", () => {
    for (const [alignment, justify] of [
      ["left", "flex-start"],
      ["center", "center"],
      ["right", "flex-end"],
    ]) {
      assert.match(
        agGrid,
        new RegExp(
          `wl-ui-table-cell-align--${alignment}[\\s\\S]*?justify-content:\\s*${justify}\\s*!important`,
        ),
      );
    }
    assert.match(
      agGrid,
      /\.ag-cell:is\([\s\S]*?:where\(\.ag-cell-wrapper, \.ag-cell-value\)\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?align-items:\s*center\s*!important/,
    );
  });
});

describe("Element Table 居中契约", () => {
  const table = read("styles/element/_table.scss");

  it("显式 is-center 同时统一文本、flex 与单一语义组件的中心轴", () => {
    assert.match(table, /th\.el-table__cell\.is-center > \.cell/);
    assert.match(table, /td\.el-table__cell\.is-center > \.cell:has\(> \*\)/);
    assert.match(table, /justify-content:\s*center\s*!important/);
    assert.match(table, /margin-inline:\s*auto\s*!important/);
  });
});

describe("MessageBox 状态图标契约", () => {
  const dialog = read("styles/element/_dialog.scss");

  it("仅修正 container 直属状态图标，不强制普通弹窗位置", () => {
    assert.match(
      dialog,
      /\.el-message-box__container:has\(> \.el-message-box__status\)/,
    );
    assert.match(
      dialog,
      /> \.el-message-box__status\s*\{[\s\S]*?position:\s*static\s*!important;[\s\S]*?transform:\s*none\s*!important/,
    );
    assert.doesNotMatch(
      dialog,
      /\.el-message-box \.el-message-box__status\s*\{[^}]*top:\s*\d+px/,
    );
  });
});

describe("长文本省略与悬停契约", () => {
  const table = read("styles/element/_table.scss");
  const agGrid = read("styles/vendors/_ag-grid.scss");
  const registry = read("runtime/core/registry.ts");
  const overflowRuntime = read("runtime/overflow-tooltip.ts");
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
    assert.match(
      agGrid,
      /\.ag-cell-value:not\(\.editable-cell\)[\s\S]*?display:\s*block\s*!important/,
    );
    assert.match(
      table,
      /\.cell:not\(\.el-tooltip\)[\s\S]*?:not\(:has\(> \*\)\)[\s\S]*?text-overflow:\s*ellipsis/,
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

  it("包级兜底仅按需处理普通文本，并覆盖动态/虚拟表格", () => {
    assert.match(overflowRuntime, /doc\.addEventListener\("pointerover"/);
    assert.doesNotMatch(overflowRuntime, /new MutationObserver/);
    assert.match(overflowRuntime, /scrollWidth - cell\.clientWidth > 1/);
    for (const boundary of [
      ".operations-cell",
      ".always-editable-cell",
      ".default-slot-cell",
      ".ag-cell-wrap-text",
      ".el-tag",
      ".wl-ui-skin-exempt",
      "[data-wl-ui-skin='off']",
    ]) {
      assert.ok(
        overflowRuntime.includes(boundary),
        `缺少包级长文本边界：${boundary}`,
      );
    }
  });
});

describe("表格行状态色契约", () => {
  const table = read("styles/element/_table.scss");
  const agGrid = read("styles/vendors/_ag-grid.scss");

  it("Element Table 与 AG Grid 使用同一套柔和 hover/selected 色阶", () => {
    for (const source of [table, agGrid]) {
      assert.match(
        source,
        /row-hover-bg:\s*rgba\(var\(--el-color-primary-rgb\),\s*0\.04\)/,
      );
      assert.match(
        source,
        /row-selected-bg:\s*rgba\(var\(--el-color-primary-rgb\),\s*0\.07\)/,
      );
    }
    assert.match(
      table,
      /--el-table-row-hover-bg-color:\s*var\(--wk-table-row-hover-bg\)\s*!important/,
    );
    assert.match(
      table,
      /--el-table-current-row-bg-color:\s*var\(--wk-table-row-selected-bg\)\s*!important/,
    );
    assert.match(
      agGrid,
      /--ag-row-hover-color:\s*var\(--wk-grid-row-hover-bg\)\s*!important/,
    );
    assert.match(
      agGrid,
      /--ag-selected-row-background-color:\s*var\(--wk-grid-row-selected-bg\)\s*!important/,
    );
  });

  it("AG Grid 选中态优先于 hover，且不覆盖编辑控件与业务单元格背景", () => {
    assert.match(
      agGrid,
      /\.ag-row:not\(\.ag-row-selected\):hover,[\s\S]*?\.ag-row\.ag-row-hover:not\(\.ag-row-selected\)/,
    );
    assert.match(
      agGrid,
      /\.ag-row\.ag-row-selected,[\s\S]*?\.ag-row\.ag-row-selected:hover,[\s\S]*?\.ag-row\.ag-row-selected\.ag-row-hover/,
    );
    assert.doesNotMatch(
      agGrid,
      /\.ag-row[^{]*\{[^}]*\.el-input__wrapper/,
    );
  });

  it("AG Grid 焦点描边完整，并把左右对齐交还列配置", () => {
    assert.match(
      agGrid,
      /\.ag-cell\.ag-cell-focus\s*\{[\s\S]*?border-color:\s*var\([\s\S]*?--ag-range-selection-border-color/,
    );

    const cellRule = agGrid.match(/\.ag-cell\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    assert.doesNotMatch(cellRule, /display:\s*flex\s*!important/);
    assert.doesNotMatch(cellRule, /justify-content:\s*center\s*!important/);

    const headerLabelRule =
      agGrid.match(/\.ag-header-cell-label\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    assert.doesNotMatch(headerLabelRule, /justify-content:\s*center\s*!important/);
    assert.doesNotMatch(
      agGrid,
      /\.ag-header-cell\.ag-header-cell-sortable:first-child,\s*\n\.ag-pinned-left-header/,
    );
  });
});

describe("跨浏览器字体契约", () => {
  const tokenScss = read("styles/tokens/index.scss");
  const tokenCss = read("design/tokens/base.css");
  const typography = read("styles/element/_typography.scss");
  const agGrid = read("styles/vendors/_ag-grid.scss");

  it("统一中英文数字字体链，但不向 body 或全局后代强刷字体", () => {
    for (const source of [tokenScss, tokenCss]) {
      assert.match(
        source,
        /--wk-font-family-sans:\s*"Microsoft YaHei UI",\s*"Microsoft YaHei",\s*"PingFang SC"/,
      );
    }
    assert.match(typography, /#{skin\.\$managed-scope-selector}/);
    assert.match(typography, /--el-font-family:\s*var\(--wk-font-family-sans\)\s*!important/);
    assert.doesNotMatch(typography, /(^|\n)\s*\*\s*\{/);
    assert.doesNotMatch(typography, /(^|\n)\s*(html|body)\s*\{/);
    assert.match(
      agGrid,
      /--ag-font-family:\s*var\(--wk-font-family-sans\)\s*!important/,
    );
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
    assert.match(
      toolbar,
      /> \.el-button\.el-button--primary:not\(\.is-link\):not\(\.is-text\):not\(\.is-plain\)[\s\S]*?background-color:\s*transparent !important;/,
    );
  });
});

describe("分页页码视觉契约", () => {
  const pagination = read("styles/element/_pagination.scss");
  const jhPagination = read("styles/vendors/_jh-pagination.scss");

  it("所有直属页码使用同一字号字重，不依赖可选的 number class", () => {
    for (const source of [pagination, jhPagination]) {
      assert.match(
        source,
        /\.el-pager\s*>\s*li\s*\{[\s\S]*?font-size:[^;]+!important;[\s\S]*?font-weight:\s*400 !important;/,
      );
    }
    assert.doesNotMatch(jhPagination, /\.el-pager \.number/);
  });
});

describe("AG Grid 完整空状态契约", () => {
  const agGrid = read("styles/vendors/_ag-grid.scss");
  const runtime = read("runtime/ag-grid-empty-state.ts");

  it("完整插图与两行文案固定为同一规格，不按高度降级隐藏", () => {
    assert.match(runtime, /AG_GRID_EMPTY_BODY_MIN_HEIGHT = 160/);
    assert.match(
      agGrid,
      /\.ag-overlay-no-rows-wrapper\[data-wl-ui-empty-overlay\][\s\S]*?min-height:\s*160px !important/,
    );
    assert.match(agGrid, /flex:\s*0 0 84px/);
    assert.match(agGrid, /content:\s*var\(--wk-empty-hint\)/);
    assert.doesNotMatch(runtime, /compact|minimal|text-only/);
  });

  it("以实际 body viewport 定位，不猜单层或分组表头高度", () => {
    assert.match(
      runtime,
      /querySelector<HTMLElement>\("\.ag-body-viewport"\)/,
    );
    assert.match(runtime, /bodyRect\.top\s*-/);
    assert.match(
      agGrid,
      /top:\s*var\(--wl-ui-empty-overlay-top\) !important/,
    );
    assert.doesNotMatch(runtime, /ag-header-height|36\s*\*\s*2/);
  });

  it("只在空态给上下或左右分屏增加受控滚动，并支持完整清理", () => {
    for (const boundary of [
      ".drager_row",
      ".drag-col-container",
      ".session-login",
      ".wl-ui-skin-exempt",
      "[data-wl-ui-skin='off']",
    ]) {
      assert.ok(runtime.includes(boundary), `缺少空态边界：${boundary}`);
    }
    assert.match(
      agGrid,
      /\[data-wl-ui-empty-scroll="row"\][\s\S]*?overflow-y:\s*auto !important/,
    );
    assert.match(
      agGrid,
      /\[data-wl-ui-empty-scroll="column"\][\s\S]*?overflow-y:\s*auto !important/,
    );
    assert.match(runtime, /uninstallAgGridEmptyStateGuard/);
    assert.match(runtime, /reconcileOverlayLayouts\(new Map\(\)\)/);
  });
});
