import { expect, test } from "@playwright/test";

test("Edge 与 Chrome 使用同一受管字体、复合数字框和 AG Grid 语义", async ({ page }) => {
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
});
