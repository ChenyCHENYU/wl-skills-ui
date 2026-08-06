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
  const tooltip = page.locator("#wl-ui-overflow-tooltip");
  await expect(tooltip).toBeVisible({ timeout: 2_000 });
  await expect(tooltip).toContainText("蓝德鑫泰新材料股份有限公司");

  await expect(page.getByTestId("table-section")).toHaveScreenshot("table-states.png");
});
