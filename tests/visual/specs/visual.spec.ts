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
  await expect(page.getByTestId("exempt-section").locator(".login-custom-input-group")).toHaveCSS(
    "height",
    "38px",
  );

  const splitButtons = page.getByTestId("split-button").locator(":scope > .el-button");
  await expect(splitButtons.first()).toHaveCSS("border-top-left-radius", "6px");
  await expect(splitButtons.first()).toHaveCSS("border-top-right-radius", "0px");
  await expect(splitButtons.last()).toHaveCSS("border-top-left-radius", "0px");
  await expect(splitButtons.last()).toHaveCSS("border-top-right-radius", "6px");
  await expect(splitButtons.first()).toHaveCSS("background-color", "rgb(0, 42, 143)");
  await expect(splitButtons.last()).toHaveCSS("background-color", "rgb(0, 42, 143)");

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

  await expect(page.getByTestId("table-section")).toHaveScreenshot("table-states.png");
});
