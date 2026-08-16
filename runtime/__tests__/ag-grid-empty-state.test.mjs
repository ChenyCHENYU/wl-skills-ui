import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  AG_GRID_EMPTY_BODY_MIN_HEIGHT,
  installAgGridEmptyStateGuard,
  refreshAgGridEmptyStateLayout,
  uninstallAgGridEmptyStateGuard,
} from "../ag-grid-empty-state.ts";

let window;
const previousGlobals = new Map();

function expose(name, value) {
  previousGlobals.set(name, globalThis[name]);
  globalThis[name] = value;
}

function rect(element, { height, left = 0, top = 0, width = 600 }) {
  element.getBoundingClientRect = () => ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  });
}

function emptyGrid({ bodyHeight, top = 0 }) {
  const host = window.document.createElement("div");
  host.className = "ag-grid-table";
  host.innerHTML = `
    <div class="ag-root-wrapper">
      <div class="ag-header"></div>
      <div class="ag-body">
        <div class="ag-body-viewport"></div>
      </div>
      <div class="ag-overlay">
        <div class="ag-overlay-no-rows-wrapper">
          <span class="ag-overlay-no-rows-center">暂无数据</span>
        </div>
      </div>
    </div>
  `;
  const root = host.querySelector(".ag-root-wrapper");
  const body = host.querySelector(".ag-body-viewport");
  const overlay = host.querySelector(".ag-overlay-no-rows-wrapper");
  const totalHeight = 36 + bodyHeight;
  rect(host, { height: totalHeight, top });
  rect(root, { height: totalHeight, top });
  rect(body, { height: bodyHeight, top: top + 36 });
  return { body, host, overlay, root, totalHeight };
}

beforeEach(() => {
  window = new Window({ url: "https://wl-ui.test/" });
  expose("window", window);
  expose("document", window.document);
  expose("Element", window.Element);
  expose("HTMLElement", window.HTMLElement);
  expose("MutationObserver", window.MutationObserver);
  expose(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
    },
  );
});

afterEach(() => {
  uninstallAgGridEmptyStateGuard();
  window.close();
  for (const [name, value] of previousGlobals) {
    if (value === undefined) delete globalThis[name];
    else globalThis[name] = value;
  }
  previousGlobals.clear();
});

describe("AG Grid 空状态布局守护", () => {
  it("始终按真实数据区定位并保留完整 160px 空态", () => {
    assert.equal(AG_GRID_EMPTY_BODY_MIN_HEIGHT, 160);
    const grid = emptyGrid({ bodyHeight: 64 });
    window.document.body.append(grid.host);

    installAgGridEmptyStateGuard();
    refreshAgGridEmptyStateLayout();

    assert.ok(grid.overlay.hasAttribute("data-wl-ui-empty-overlay"));
    assert.equal(
      grid.overlay.style.getPropertyValue("--wl-ui-empty-overlay-top"),
      "36px",
    );
    assert.equal(
      grid.overlay.style.getPropertyValue("--wl-ui-empty-overlay-height"),
      "160px",
    );
    assert.ok(grid.host.hasAttribute("data-wl-ui-empty-host"));
    assert.equal(
      grid.host.style.getPropertyValue("--wl-ui-empty-host-min-height"),
      "196px",
    );
  });

  it("上下分屏保持两个 pane 的基线并只让分屏根承担滚动", () => {
    const split = window.document.createElement("div");
    split.className = "drager_row";
    const topPane = window.document.createElement("div");
    topPane.className = "drager_top";
    const slider = window.document.createElement("div");
    slider.className = "slider_row";
    const bottomPane = window.document.createElement("div");
    bottomPane.className = "drager_bottom";
    const grid = emptyGrid({ bodyHeight: 64 });
    topPane.append(grid.host);
    split.append(topPane, slider, bottomPane);
    window.document.body.append(split);
    rect(split, { height: 220 });
    rect(topPane, { height: 100 });
    rect(bottomPane, { height: 100, top: 120 });

    installAgGridEmptyStateGuard();
    refreshAgGridEmptyStateLayout();

    assert.equal(split.getAttribute("data-wl-ui-empty-scroll"), "row");
    assert.equal(
      topPane.style.getPropertyValue("--wl-ui-empty-pane-min-height"),
      "196px",
    );
    assert.equal(
      bottomPane.style.getPropertyValue("--wl-ui-empty-pane-min-height"),
      "100px",
    );
  });

  it("左右分屏使用同一最小高度，避免两侧视觉尺寸不一致", () => {
    const split = window.document.createElement("div");
    split.className = "drag-col-container";
    const leftPane = window.document.createElement("div");
    leftPane.className = "drag-left";
    const slider = window.document.createElement("div");
    slider.className = "slider-col";
    const rightPane = window.document.createElement("div");
    rightPane.className = "drag-right";
    const grid = emptyGrid({ bodyHeight: 64 });
    rightPane.append(grid.host);
    split.append(leftPane, slider, rightPane);
    window.document.body.append(split);
    rect(split, { height: 100 });
    rect(leftPane, { height: 100, width: 290 });
    rect(rightPane, { height: 100, left: 310, width: 290 });

    installAgGridEmptyStateGuard();
    refreshAgGridEmptyStateLayout();

    assert.equal(split.getAttribute("data-wl-ui-empty-scroll"), "column");
    assert.equal(
      leftPane.style.getPropertyValue("--wl-ui-empty-pane-min-height"),
      "196px",
    );
    assert.equal(
      rightPane.style.getPropertyValue("--wl-ui-empty-pane-min-height"),
      "196px",
    );
  });

  it("数据恢复和豁免区域不会残留尺寸或结构标记", () => {
    const grid = emptyGrid({ bodyHeight: 64 });
    window.document.body.append(grid.host);
    installAgGridEmptyStateGuard();
    refreshAgGridEmptyStateLayout();
    grid.overlay.closest(".ag-overlay").classList.add("ag-hidden");
    refreshAgGridEmptyStateLayout();

    assert.ok(!grid.overlay.hasAttribute("data-wl-ui-empty-overlay"));
    assert.ok(!grid.host.hasAttribute("data-wl-ui-empty-host"));
    assert.equal(grid.host.style.getPropertyValue("--wl-ui-empty-host-min-height"), "");

    const exempt = window.document.createElement("div");
    exempt.className = "session-login";
    const exemptGrid = emptyGrid({ bodyHeight: 64 });
    exempt.append(exemptGrid.host);
    window.document.body.append(exempt);
    refreshAgGridEmptyStateLayout();
    assert.ok(!exemptGrid.overlay.hasAttribute("data-wl-ui-empty-overlay"));
    assert.ok(!exemptGrid.host.hasAttribute("data-wl-ui-empty-host"));
  });

  it("嵌套 Grid 的空态只归属于最近的 Grid 根", () => {
    const outerHost = window.document.createElement("div");
    outerHost.className = "ag-grid-table";
    outerHost.innerHTML = `
      <div class="ag-root-wrapper">
        <div class="ag-body"><div class="ag-body-viewport"></div></div>
      </div>
    `;
    const outerRoot = outerHost.querySelector(".ag-root-wrapper");
    const outerBody = outerHost.querySelector(".ag-body-viewport");
    const innerGrid = emptyGrid({ bodyHeight: 64, top: 36 });
    outerBody.append(innerGrid.host);
    window.document.body.append(outerHost);
    rect(outerHost, { height: 260 });
    rect(outerRoot, { height: 260 });
    rect(outerBody, { height: 224, top: 36 });

    installAgGridEmptyStateGuard();
    refreshAgGridEmptyStateLayout();

    assert.ok(!outerHost.hasAttribute("data-wl-ui-empty-host"));
    assert.ok(innerGrid.host.hasAttribute("data-wl-ui-empty-host"));
    assert.ok(innerGrid.overlay.hasAttribute("data-wl-ui-empty-overlay"));
  });
});
