import { expect, test } from "@playwright/test";

/**
 * AG Grid 选择列表头/行复选框对齐契约（2026-08-26 produce 事故复盘固化）。
 *
 * 平台定制版 AG Grid 的关键 DOM 事实（提取自 ag-grid 子应用主块）：
 * 1) 全选框经 eResize.insertAdjacentElement("afterend") 挂为表头 cell 的
 *    直接子节点（形态 A），与 comp-wrapper 平级而非嵌套其内；
 * 2) 行 cell 不携带 ag-checkbox-cell 结构类，行复选框为
 *    .ag-cell > .ag-cell-wrapper > .ag-selection-checkbox；
 * 3) 普通文本表头内部仍保留 display:none 的隐藏 select-all 节点，
 *    任何对 select-all 强制 display、或压缩 comp-wrapper 宽度的全局规则
 *    都会导致隐藏框显形、表头文字被挤没（历史事故形态）。
 *
 * 本规格注入平台结构基线样式（scoped 到 #ag-align-probe），验证包内
 * vendors/_ag-grid.scss 的选择列对齐规则在三种表头 + 两种行 DOM 上
 * 的几何契约，防止未来回退。
 */

const PLATFORM_STRUCTURAL_CSS = `
#ag-align-probe { --ag-icon-size: 16px; --ag-cell-widget-spacing: 6px; }
#ag-align-probe .ag-header-row { position: relative; display: flex; width: 640px; height: 36px; }
#ag-align-probe .ag-row { position: relative; display: flex; width: 640px; height: 28px; }
#ag-align-probe .ag-header-cell {
  position: absolute; display: inline-flex; align-items: center;
  height: 100%; top: 0; overflow: hidden; box-sizing: border-box;
}
#ag-align-probe .ag-header-cell-resize { position: absolute; z-index: 2; width: 8px; height: 100%; top: 0; cursor: ew-resize; }
#ag-align-probe .ag-header-cell-comp-wrapper { flex: 1 1 auto; min-width: 0; overflow: hidden; }
#ag-align-probe .ag-cell-label-container {
  display: flex; align-items: center; justify-content: space-between;
  flex-direction: row-reverse; height: 100%; width: 100%;
}
#ag-align-probe .ag-header-select-all { display: flex; align-items: center; margin-left: 12px; overflow: hidden; }
#ag-align-probe .ag-header-cell-label { display: inline-flex; align-items: center; min-width: 0; }
#ag-align-probe .ag-cell { display: block; box-sizing: border-box; border: 1px solid transparent; overflow: hidden; }
#ag-align-probe .ag-ltr .ag-cell { padding-left: calc(6px - 1px); padding-right: calc(6px - 1px); }
#ag-align-probe .ag-cell-wrapper { display: flex; align-items: center; }
#ag-align-probe .ag-ltr .ag-selection-checkbox { margin-right: var(--ag-cell-widget-spacing); }
#ag-align-probe .ag-checkbox-input-wrapper { display: inline-block; position: relative; width: var(--ag-icon-size); height: var(--ag-icon-size); flex: none; }
`;

const PROBE_DOM = `
<div id="ag-align-probe" class="ag-ltr">
  <div class="ag-header-row">
    <div class="ag-header-cell" data-testid="header-form-a" style="left:0;width:55px;">
      <div class="ag-header-cell-resize"></div>
      <div class="ag-header-select-all"><div class="ag-checkbox-input-wrapper"></div></div>
      <div class="ag-header-cell-comp-wrapper"><div class="ag-cell-label-container"><span class="ag-header-cell-label"></span></div></div>
    </div>
    <div class="ag-header-cell" data-testid="header-text" style="left:55px;width:160px;">
      <div class="ag-header-cell-comp-wrapper"><div class="ag-cell-label-container">
        <div class="ag-header-select-all" style="display:none"><div class="ag-checkbox-input-wrapper"></div></div>
        <span class="ag-header-cell-label">炉号</span>
      </div></div>
    </div>
    <div class="ag-header-cell" data-testid="header-form-b" style="left:215px;width:55px;">
      <div class="ag-header-cell-comp-wrapper"><div class="ag-cell-label-container">
        <div class="ag-header-select-all"><div class="ag-checkbox-input-wrapper"></div></div>
        <span class="ag-header-cell-label"></span>
      </div></div>
    </div>
  </div>
  <div class="ag-row">
    <div class="ag-cell" data-testid="row-custom" style="width:55px;">
      <div class="ag-cell-wrapper"><span class="ag-selection-checkbox"><div class="ag-checkbox-input-wrapper"></div></span><span class="ag-cell-value"></span></div>
    </div>
    <div class="ag-cell ag-checkbox-cell" data-testid="row-structural" style="width:55px;">
      <div class="ag-cell-wrapper"><span class="ag-selection-checkbox"><div class="ag-checkbox-input-wrapper"></div></span><span class="ag-cell-value"></span></div>
    </div>
  </div>
</div>
`;

interface Box {
  left: number;
  width: number;
  visible: boolean;
  display: string;
}

async function setupProbe(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#visual-harness")).toBeVisible();
  await page.addStyleTag({ content: PLATFORM_STRUCTURAL_CSS });
  await page.evaluate((html) => {
    const mount = document.querySelector("#visual-harness");
    if (!mount) throw new Error("visual harness missing");
    const container = document.createElement("div");
    container.innerHTML = html;
    mount.appendChild(container.firstElementChild as ChildNode);
  }, PROBE_DOM);
}

async function boxOf(page: import("@playwright/test").Page, testId: string, selector = ""): Promise<Box> {
  return page.evaluate(
    ([id, sel]) => {
      const root = document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
      const el = (sel ? root.querySelector(sel) : root) as HTMLElement;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        left: rect.left,
        width: rect.width,
        visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden",
        display: style.display,
      };
    },
    [testId, selector],
  );
}

test.beforeEach(({ page }) => setupProbe(page));

test("形态A全选框在表头cell内水平居中（平台定制版直接子节点挂载）", async ({ page }) => {
  const cell = await boxOf(page, "header-form-a");
  const selectAll = await boxOf(page, "header-form-a", ".ag-header-select-all");
  expect(selectAll.visible).toBe(true);
  const cellCenter = cell.left + cell.width / 2;
  const selectAllCenter = selectAll.left + selectAll.width / 2;
  expect(Math.abs(selectAllCenter - cellCenter)).toBeLessThanOrEqual(1);
});

test("文本表头的隐藏select-all保持不可见且文字不被挤压（事故防灾契约）", async ({ page }) => {
  const hidden = await boxOf(page, "header-text", ".ag-header-select-all");
  expect(hidden.display).toBe("none");
  expect(hidden.visible).toBe(false);
  const label = await boxOf(page, "header-text", ".ag-header-cell-label");
  expect(label.visible).toBe(true);
  expect(label.width).toBeGreaterThan(10);
});

test("形态B（标准嵌套布局）select-all保持可见且未越出cell", async ({ page }) => {
  const cell = await boxOf(page, "header-form-b");
  const selectAll = await boxOf(page, "header-form-b", ".ag-header-select-all");
  expect(selectAll.visible).toBe(true);
  expect(selectAll.left).toBeGreaterThanOrEqual(cell.left - 0.5);
  expect(selectAll.left + selectAll.width).toBeLessThanOrEqual(cell.left + cell.width + 0.5);
});

test("行复选框在cell内水平居中（无结构类 + 有结构类两种DOM）", async ({ page }) => {
  const boxes = await Promise.all(
    (["row-custom", "row-structural"] as const).map(async (testId) => ({
      cell: await boxOf(page, testId),
      checkbox: await boxOf(page, testId, ".ag-selection-checkbox"),
      testId,
    })),
  );
  for (const { testId, cell, checkbox } of boxes) {
    expect(checkbox.visible, `${testId} checkbox visible`).toBe(true);
    const cellCenter = cell.left + cell.width / 2;
    const checkboxCenter = checkbox.left + checkbox.width / 2;
    expect(Math.abs(checkboxCenter - cellCenter), `${testId} centered`).toBeLessThanOrEqual(1);
  }
});

test("同列宽下表头全选框与行复选框共享同一水平轴", async ({ page }) => {
  const headerCell = await boxOf(page, "header-form-a");
  const rowCell = await boxOf(page, "row-custom");
  const selectAll = await boxOf(page, "header-form-a", ".ag-header-select-all");
  const rowCheckbox = await boxOf(page, "row-custom", ".ag-selection-checkbox");
  const headerAxis = headerCell.left + (selectAll.left - headerCell.left) + selectAll.width / 2;
  const rowAxis = rowCell.left + (rowCheckbox.left - rowCell.left) + rowCheckbox.width / 2;
  expect(Math.abs(headerAxis - rowAxis)).toBeLessThanOrEqual(1);
});
