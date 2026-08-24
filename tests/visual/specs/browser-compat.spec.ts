import { expect, test } from "@playwright/test";

test("Edge 与 Chrome 保持字体、数字框、表格对齐和日期弹层契约", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#visual-harness")).toBeVisible();

  const expectedFont =
    '"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif';

  await expect(page.getByTestId("business-table")).toHaveCSS("font-family", expectedFont);
  await expect(page.getByTestId("ag-grid-contract")).toHaveCSS("font-family", expectedFont);
  await expect(page.getByTestId("ag-focus-cell")).toHaveCSS("font-size", "13px");
  await expect(page.getByTestId("ag-focus-cell")).toHaveCSS("font-weight", "400");

  const jhNumber = page.getByTestId("jh-input-number");
  await expect(jhNumber).toHaveCSS("height", "26px");
  await expect(jhNumber.locator("input")).toHaveCSS("text-align", "right");

  await expect(page.getByTestId("ag-focus-cell")).toHaveCSS(
    "border-right-color",
    "rgba(0, 42, 143, 0.4)",
  );
  await expect(page.getByTestId("ag-right-cell")).toHaveCSS("text-align", "right");
  await expect(page.getByTestId("ag-right-header")).toHaveCSS(
    "justify-content",
    "flex-end",
  );

  await page
    .getByTestId("picker-section")
    .getByRole("combobox", { name: "请选择日期" })
    .click();
  const pickerPopper = page.locator(".el-picker__popper").last();
  const pickerPanel = pickerPopper.locator(
    "> .el-picker-panel.el-date-picker",
  );
  await expect(pickerPanel).toBeVisible();
  await expect(pickerPanel).toHaveCSS("position", "relative");
  const pickerGeometry = await pickerPanel.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const popper = element.parentElement!;
    const popperStyle = getComputedStyle(popper);
    return {
      panelWidth: panel.width,
      panelHeight: panel.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      popperPosition: popperStyle.position,
    };
  });
  expect(pickerGeometry.panelWidth).toBeLessThan(
    pickerGeometry.viewportWidth * 0.75,
  );
  expect(pickerGeometry.panelHeight).toBeLessThan(
    pickerGeometry.viewportHeight * 0.75,
  );
  expect(pickerGeometry.popperPosition).not.toBe("static");
});
