import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#visual-harness")).toBeVisible();
});

test("品牌主题、表单边框和复合控件结构保持稳定", async ({ page }) => {
  const primary = page.getByRole("button", { name: "新增" });
  await expect(primary).toHaveCSS("background-color", "rgb(0, 42, 143)");
  await expect(primary).toHaveCSS("border-radius", "6px");

  await page.evaluate(() => {
    document.documentElement.style.setProperty("--el-color-primary", "#4368ff");
    document.body.style.setProperty("--el-color-primary", "#4368ff");
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue("--el-color-primary").trim(),
      ),
    )
    .toBe("#002a8f");
  await expect(primary).toHaveCSS("background-color", "rgb(0, 42, 143)");

  const textarea = page.getByTestId("textarea");
  await textarea.focus();
  await expect(textarea).toHaveCSS("border-color", "rgb(0, 42, 143)");
  await expect(textarea).toHaveCSS("border-radius", "6px");
  await expect(textarea).not.toHaveCSS("box-shadow", "none");

  const numberWrapper = page.getByTestId("input-number").locator(".el-input__wrapper");
  await expect(numberWrapper).not.toHaveCSS("box-shadow", "none");
  await expect(page.getByTestId("input-number")).toHaveCSS("border-top-width", "0px");

  const jhNumber = page.getByTestId("jh-input-number");
  const jhNumberInner = page.getByTestId("jh-number-inner-wrapper");
  await expect(jhNumber).toHaveCSS("height", "26px");
  await expect(jhNumber).toHaveCSS("min-height", "26px");
  await expect(jhNumber).not.toHaveCSS("box-shadow", "none");
  await expect(jhNumberInner).toHaveCSS("height", "26px");
  await expect(jhNumberInner).toHaveCSS("box-shadow", "none");
  await expect(jhNumberInner).toHaveCSS("padding-left", "11px");
  await expect(jhNumber.locator("input")).toHaveCSS("text-align", "right");
  await expect(page.getByTestId("jh-number-decrease")).toHaveCSS("display", "flex");
  await expect(page.getByTestId("jh-number-increase")).toHaveCSS("display", "flex");

  const inputGroupInput = page.getByTestId("input-group");
  const inputGroup = page.locator(".el-input.el-input-group").filter({
    has: inputGroupInput,
  });
  const inputGroupWrapper = inputGroup.locator(":scope > .el-input__wrapper");
  const inputGroupAppend = inputGroup.locator(":scope > .el-input-group__append");
  await expect(inputGroup).toHaveCSS("height", "26px");
  await expect(inputGroup).toHaveCSS("border-radius", "6px");
  await expect(inputGroupWrapper).toHaveCSS("height", "26px");
  await expect(inputGroupWrapper).toHaveCSS("box-shadow", "none");
  await expect(inputGroupAppend).toHaveCSS("height", "26px");
  await expect(inputGroupAppend).toHaveCSS("width", "32px");
  await expect(page.getByTestId("input-group-search")).toHaveCSS("width", "14px");
  await inputGroupInput.focus();
  await expect(inputGroup).not.toHaveCSS("box-shadow", "none");
  const inputGroupFormItem = inputGroup.locator(
    "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' el-form-item ')][1]",
  );
  await inputGroupFormItem.evaluate((element) => element.classList.add("is-error"));
  await expect
    .poll(() => inputGroup.evaluate((element) => getComputedStyle(element).boxShadow))
    .toContain("rgb(187, 45, 63)");
  await inputGroupFormItem.evaluate((element) => element.classList.remove("is-error"));
  await inputGroupInput.blur();
  await inputGroup.evaluate((element) => element.classList.add("is-disabled"));
  await expect(inputGroup).toHaveCSS("background-color", "rgb(245, 247, 250)");
  await inputGroup.evaluate((element) => element.classList.remove("is-disabled"));

  const composite = page.getByTestId("composite-owner");
  const inner = page.getByTestId("composite-inner");
  const initialHeight = await composite.evaluate((element) => element.getBoundingClientRect().height);
  expect(initialHeight).toBeGreaterThanOrEqual(26);
  await expect(composite).toHaveCSS("height", `${initialHeight}px`);
  await expect(composite).toHaveCSS("border-radius", "6px");
  await expect(inner).toHaveCSS("box-shadow", "none");
  await inner.locator("input").focus();
  await expect(composite).not.toHaveCSS("box-shadow", "none");
  await expect(inner).toHaveCSS("box-shadow", "none");

  await expect(page.getByTestId("exempt-section").getByRole("button")).toHaveCSS(
    "border-radius",
    "18px",
  );
  await expect(page.getByTestId("exempt-section").getByRole("button")).toHaveCSS(
    "font-family",
    "Georgia, serif",
  );
  await expect(page.getByTestId("exempt-section").locator(".login-custom-input-group")).toHaveCSS(
    "height",
    "38px",
  );

  const messageBoxContainer = page.getByTestId("message-box-container");
  const messageBoxStatus = messageBoxContainer.locator(".el-message-box__status");
  await expect(messageBoxContainer).toHaveCSS("display", "flex");
  await expect(messageBoxContainer).toHaveCSS("gap", "12px");
  await expect(messageBoxStatus).toHaveCSS("position", "static");
  await expect(messageBoxStatus).toHaveCSS("transform", "none");
  await expect(page.getByTestId("message-box-message")).toHaveCSS("padding-left", "0px");

  const splitButtons = page.getByTestId("split-button").locator(":scope > .el-button");
  await expect(splitButtons.first()).toHaveCSS("border-top-left-radius", "6px");
  await expect(splitButtons.first()).toHaveCSS("border-top-right-radius", "0px");
  await expect(splitButtons.last()).toHaveCSS("border-top-left-radius", "0px");
  await expect(splitButtons.last()).toHaveCSS("border-top-right-radius", "6px");
  await expect(splitButtons.first()).toHaveCSS("background-color", "rgb(0, 42, 143)");
  await expect(splitButtons.last()).toHaveCSS("background-color", "rgb(0, 42, 143)");

  const actionMenuButton = page
    .getByTestId("action-dropdown-menu")
    .locator(":scope > .el-dropdown-menu__item > .el-button");
  await expect(actionMenuButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(actionMenuButton).toHaveCSS("border-top-width", "0px");
  await expect(actionMenuButton).toHaveCSS("box-shadow", "none");
  expect(await actionMenuButton.evaluate((element) => getComputedStyle(element).color))
    .toBe(await page.getByTestId("action-dropdown-menu").locator(".el-dropdown-menu__item").evaluate(
      (element) => getComputedStyle(element).color,
    ));

  const pagerItems = page.getByTestId("pagination-contract").locator(".el-pager > li");
  await expect(pagerItems).toHaveCount(3);
  expect(await pagerItems.evaluateAll((items) => items.map((item) => getComputedStyle(item).fontSize)))
    .toEqual(["12px", "12px", "12px"]);
  expect(await pagerItems.evaluateAll((items) => items.map((item) => getComputedStyle(item).fontWeight)))
    .toEqual(["400", "400", "400"]);

  await expect(page.getByTestId("actions-section")).toHaveScreenshot("action-states.png");
  await expect(page.getByTestId("form-section")).toHaveScreenshot("form-and-composite.png");
});

test("上下分屏收缩后由 AG Grid 内部 viewport 滚动", async ({ page }) => {
  const pane = page.getByTestId("split-top-pane");
  const grid = page.getByTestId("split-grid-host");
  const viewport = page.getByTestId("split-grid-viewport");
  await expect(grid).toHaveAttribute("data-wl-ui-split-grid-host", "");
  await expect(pane).toHaveAttribute("data-wl-ui-split-pane", "");
  const initialHeight = await grid.evaluate((element) => element.getBoundingClientRect().height);

  let resizeEvents = 0;
  await grid.evaluate((element) => {
    element.addEventListener("wl-ui:split-grid-resize", () => {
      document.body.dataset.splitResizeEvents = String(
        Number(document.body.dataset.splitResizeEvents || 0) + 1,
      );
    });
  });
  await page.getByTestId("resize-split").click();
  await expect.poll(() => grid.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(
    initialHeight,
  );
  resizeEvents = await page.evaluate(() => Number(document.body.dataset.splitResizeEvents || 0));
  expect(resizeEvents).toBeGreaterThan(0);
  await expect(pane).toHaveCSS("overflow", "hidden");
  await expect(viewport).toHaveCSS("overflow-y", "auto");
  expect(
    await viewport.evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true);
});

test("多表格空状态始终完整并以真实数据区居中", async ({ page }) => {
  const split = page.getByTestId("empty-split-root");
  const topGrid = page.getByTestId("empty-top-grid");
  const bottomGrid = page.getByTestId("empty-bottom-grid");
  const topOverlay = page.getByTestId("empty-top-overlay");
  const bottomOverlay = page.getByTestId("empty-bottom-overlay");

  await expect(split).toHaveAttribute("data-wl-ui-empty-scroll", "row");
  await expect(topGrid).toHaveAttribute("data-wl-ui-empty-host", "");
  await expect(bottomGrid).toHaveAttribute("data-wl-ui-empty-host", "");
  await expect(topOverlay).toHaveCSS("height", "160px");
  await expect(bottomOverlay).toHaveCSS("height", "160px");
  await expect(topOverlay).toHaveCSS("top", "36px");
  await expect(bottomOverlay).toHaveCSS("top", "72px");

  const geometry = await page.evaluate(() => {
    const measure = (gridTestId: string, overlayTestId: string) => {
      const grid = document.querySelector<HTMLElement>(
        `[data-testid="${gridTestId}"]`,
      )!;
      const header = grid.querySelector<HTMLElement>(".ag-header")!;
      const body = grid.querySelector<HTMLElement>(".ag-body-viewport")!;
      const overlay = document.querySelector<HTMLElement>(
        `[data-testid="${overlayTestId}"]`,
      )!;
      const headerRect = header.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      return {
        bodyCenter: bodyRect.top + bodyRect.height / 2,
        bodyHeight: bodyRect.height,
        headerBottom: headerRect.bottom,
        overlayCenter: overlayRect.top + overlayRect.height / 2,
        overlayTop: overlayRect.top,
      };
    };
    const splitRoot = document.querySelector<HTMLElement>(
      '[data-testid="empty-split-root"]',
    )!;
    return {
      bottom: measure("empty-bottom-grid", "empty-bottom-overlay"),
      scrolls: splitRoot.scrollHeight > splitRoot.clientHeight,
      top: measure("empty-top-grid", "empty-top-overlay"),
    };
  });

  expect(geometry.scrolls).toBe(true);
  for (const item of [geometry.top, geometry.bottom]) {
    expect(item.bodyHeight).toBeGreaterThanOrEqual(160);
    // AG Grid 的 header bottom border 与 body 起点会共享 1px，不属于内容相交。
    expect(item.overlayTop + 1).toBeGreaterThanOrEqual(item.headerBottom);
    expect(Math.abs(item.overlayCenter - item.bodyCenter)).toBeLessThanOrEqual(1);
  }

  await expect(page.getByTestId("empty-grid-section")).toHaveScreenshot(
    "ag-grid-empty-state.png",
  );
  await split.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByTestId("empty-grid-section")).toHaveScreenshot(
    "ag-grid-empty-state-scrolled.png",
  );
});

test("长文本真实溢出时省略并按需显示完整内容", async ({ page }) => {
  const customerCell = page
    .getByTestId("business-table")
    .locator(".el-table__body tr")
    .nth(1)
    .locator("td")
    .nth(1)
    .locator(".cell");

  await expect(customerCell).toHaveCSS("overflow", "hidden");
  await expect(customerCell).toHaveCSS("text-overflow", "ellipsis");
  await expect(customerCell).toHaveCSS("white-space", "nowrap");
  expect(
    await customerCell.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);

  await customerCell.hover();
  // Edge 在滚动元素进入视口后偶发不补发 pointerover；显式派发一次保证验证
  // 的是包内 hover 委托链，而不是浏览器指针初始位置。
  await customerCell.dispatchEvent("pointerover", { pointerType: "mouse" });
  const tooltip = page.locator("#wl-ui-overflow-tooltip");
  await expect(tooltip).toBeVisible({ timeout: 2_000 });
  await expect(tooltip).toContainText("蓝德鑫泰新材料股份有限公司");

  const grid = page.getByTestId("ag-grid-contract");
  const focusCell = page.getByTestId("ag-focus-cell");
  const rightCell = page.getByTestId("ag-right-cell");
  await expect(grid).toHaveCSS(
    "font-family",
    '"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif',
  );
  await expect(focusCell).toHaveCSS("border-right-color", "rgba(0, 42, 143, 0.4)");
  await expect(focusCell).toHaveCSS("border-left-color", "rgba(0, 42, 143, 0.4)");
  await expect(rightCell).toHaveCSS("display", "block");
  await expect(rightCell).toHaveCSS("text-align", "right");
  await expect(page.getByTestId("ag-right-header")).toHaveCSS(
    "justify-content",
    "flex-end",
  );
  await expect(page.getByTestId("ag-edit-cell")).toHaveCSS("padding-left", "0px");
  await expect(page.getByTestId("ag-edit-cell")).toHaveCSS("padding-right", "0px");
  const alignmentEdges = await page.evaluate(() => {
    const rect = (id: string) =>
      document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.getBoundingClientRect();
    const leftHeader = rect("ag-left-header-text");
    const leftCell = rect("ag-left-cell-text");
    const rightHeader = rect("ag-right-header-text");
    const rightCellText = rect("ag-right-cell-text");
    return {
      leftDelta: Math.abs(leftHeader.left - leftCell.left),
      rightDelta: Math.abs(rightHeader.right - rightCellText.right),
    };
  });
  expect(alignmentEdges.leftDelta).toBeLessThanOrEqual(1);
  expect(alignmentEdges.rightDelta).toBeLessThanOrEqual(1);

  await expect(page.getByTestId("table-section")).toHaveScreenshot("table-states.png");
});
