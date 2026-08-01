import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  installOverflowTooltipGuard,
  uninstallOverflowTooltipGuard,
} from "../../runtime/overflow-tooltip.ts";

const waitForTimer = () => new Promise((resolve) => setTimeout(resolve, 5));

function createDom() {
  const window = new Window({ url: "https://wl-ui.test/" });
  globalThis.document = window.document;
  globalThis.window = window;
  return window;
}

function setHorizontalMetrics(element, clientWidth, scrollWidth) {
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(element, "scrollWidth", {
    configurable: true,
    value: scrollWidth,
  });
  element.getBoundingClientRect = () => ({
    x: 20,
    y: 40,
    top: 40,
    right: 140,
    bottom: 66,
    left: 20,
    width: 120,
    height: 26,
    toJSON: () => ({}),
  });
}

function appendAgCell(document, className = "ag-cell ag-cell-value") {
  let root = document.querySelector(".ag-root-wrapper");
  if (!root) {
    root = document.createElement("div");
    root.className = "ag-root-wrapper";
    document.body.append(root);
  }
  const cell = document.createElement("div");
  cell.className = className;
  cell.textContent = "益德鑫泰新材料股份有限公司";
  root.append(cell);
  return cell;
}

function hover(window, element) {
  element.dispatchEvent(new window.PointerEvent("pointerover", { bubbles: true }));
}

afterEach(() => {
  uninstallOverflowTooltipGuard();
  delete globalThis.document;
  delete globalThis.window;
});

describe("包级长文本溢出 Tooltip", () => {
  it("AG Grid flex 普通文本真实溢出时显示，离开后清理", async () => {
    const window = createDom();
    const cell = appendAgCell(window.document);
    setHorizontalMetrics(cell, 120, 260);
    installOverflowTooltipGuard({ showDelay: 0, agGridShowDelay: 0 });

    hover(window, cell);
    await waitForTimer();

    const tooltip = window.document.querySelector("#wl-ui-overflow-tooltip");
    assert.ok(tooltip);
    assert.equal(tooltip.hidden, false);
    assert.equal(tooltip.textContent, "益德鑫泰新材料股份有限公司");
    assert.equal(cell.dataset.wlUiOverflowActive, "true");
    assert.equal(cell.getAttribute("aria-describedby"), tooltip.id);

    cell.dispatchEvent(
      new window.PointerEvent("pointerout", {
        bubbles: true,
        relatedTarget: window.document.body,
      }),
    );
    assert.equal(tooltip.hidden, true);
    assert.equal(cell.hasAttribute("data-wl-ui-overflow-active"), false);
    assert.equal(cell.hasAttribute("aria-describedby"), false);
  });

  it("内容未溢出时不创建提示", async () => {
    const window = createDom();
    const cell = appendAgCell(window.document);
    setHorizontalMetrics(cell, 260, 260);
    installOverflowTooltipGuard({ showDelay: 0, agGridShowDelay: 0 });

    hover(window, cell);
    await waitForTimer();

    assert.equal(
      window.document.querySelector("#wl-ui-overflow-tooltip"),
      null,
    );
  });

  it("事件委托覆盖安装后新增的虚拟滚动单元格", async () => {
    const window = createDom();
    installOverflowTooltipGuard({ showDelay: 0, agGridShowDelay: 0 });
    const cell = appendAgCell(window.document);
    setHorizontalMetrics(cell, 100, 220);

    hover(window, cell);
    await waitForTimer();

    assert.equal(
      window.document.querySelector("#wl-ui-overflow-tooltip")?.textContent,
      "益德鑫泰新材料股份有限公司",
    );
  });

  it("排除操作列、编辑/Tag、自带 Tooltip 与皮肤豁免区域", async () => {
    const window = createDom();
    installOverflowTooltipGuard({ showDelay: 0, agGridShowDelay: 0 });

    const operation = appendAgCell(
      window.document,
      "ag-cell ag-cell-value operations-cell",
    );
    const tagged = appendAgCell(window.document);
    tagged.replaceChildren(window.document.createElement("span"));
    tagged.firstElementChild.className = "el-tag";
    tagged.firstElementChild.textContent = "很长的状态";
    const declared = appendAgCell(window.document);
    declared.title = "已有提示";
    const disabled = appendAgCell(window.document);
    disabled.dataset.wlUiOverflow = "off";
    const exemptRoot = window.document.createElement("div");
    exemptRoot.className = "wl-ui-skin-exempt";
    const exempt = window.document.createElement("div");
    exempt.className = "ag-root-wrapper";
    const exemptCell = window.document.createElement("div");
    exemptCell.className = "ag-cell ag-cell-value";
    exemptCell.textContent = "定制区域长文本";
    exempt.append(exemptCell);
    exemptRoot.append(exempt);
    window.document.body.append(exemptRoot);

    for (const cell of [operation, tagged, declared, disabled, exemptCell]) {
      setHorizontalMetrics(cell, 80, 220);
      hover(window, cell);
      await waitForTimer();
      assert.equal(
        window.document.querySelector("#wl-ui-overflow-tooltip"),
        null,
        `不应接管 ${cell.className}`,
      );
    }
  });

  it("平台原生 AG Tooltip 优先，键盘提示可用 Escape 关闭", async () => {
    const window = createDom();
    const cell = appendAgCell(window.document);
    cell.tabIndex = 0;
    setHorizontalMetrics(cell, 80, 220);
    const nativeTooltip = window.document.createElement("div");
    nativeTooltip.className = "ag-tooltip";
    nativeTooltip.textContent = "平台提示";
    window.document.body.append(nativeTooltip);
    installOverflowTooltipGuard({ showDelay: 0, agGridShowDelay: 0 });

    hover(window, cell);
    await waitForTimer();
    assert.equal(
      window.document.querySelector("#wl-ui-overflow-tooltip"),
      null,
    );

    nativeTooltip.remove();
    cell.dispatchEvent(new window.FocusEvent("focusin", { bubbles: true }));
    await waitForTimer();
    const fallback = window.document.querySelector("#wl-ui-overflow-tooltip");
    assert.equal(fallback?.hidden, false);

    cell.dispatchEvent(
      new window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );
    assert.equal(fallback?.hidden, true);
  });

  it("Element Table 原生 el-tooltip 优先，普通文本使用兜底", async () => {
    const window = createDom();
    const body = window.document.createElement("div");
    body.className = "el-table__body";
    const nativeCell = window.document.createElement("div");
    nativeCell.className = "cell el-tooltip";
    nativeCell.textContent = "组件已有 Tooltip";
    const plainCell = window.document.createElement("div");
    plainCell.className = "cell";
    plainCell.textContent = "普通长文本单元格";
    body.append(nativeCell, plainCell);
    window.document.body.append(body);
    setHorizontalMetrics(nativeCell, 80, 180);
    setHorizontalMetrics(plainCell, 80, 180);
    installOverflowTooltipGuard({ showDelay: 0, agGridShowDelay: 0 });

    hover(window, nativeCell);
    await waitForTimer();
    assert.equal(
      window.document.querySelector("#wl-ui-overflow-tooltip"),
      null,
    );

    hover(window, plainCell);
    await waitForTimer();
    assert.equal(
      window.document.querySelector("#wl-ui-overflow-tooltip")?.textContent,
      "普通长文本单元格",
    );
  });
});
