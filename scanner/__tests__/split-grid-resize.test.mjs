import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  installSplitGridResizeGuard,
  SPLIT_GRID_RESIZE_EVENT,
  uninstallSplitGridResizeGuard,
} from "../../runtime/split-grid-resize.ts";

const waitForLayout = () => new Promise((resolve) => setTimeout(resolve, 12));

class TestResizeObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    this.observed = new Set();
    TestResizeObserver.instances.push(this);
  }

  observe(element) {
    this.observed.add(element);
  }

  disconnect() {
    this.observed.clear();
  }

  trigger(element) {
    this.callback([{ target: element }]);
  }
}

function createDom(markup = "") {
  const window = new Window({ url: "https://wl-ui.test/" });
  window.ResizeObserver = TestResizeObserver;
  window.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(window.performance.now()), 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.document.body.innerHTML = markup;
  globalThis.document = window.document;
  globalThis.window = window;
  return window;
}

function splitMarkup(extraClass = "") {
  return `
    <div class="${extraClass}">
      <div class="drager_row">
        <div class="drager_top" style="height: 220px">
          <div id="layout" style="display: flex; flex-direction: column; height: 100%">
            <div id="grid" class="base-table ag-theme-quartz ag-grid-table">
              <div class="ag-root-wrapper"><div class="ag-body-viewport"></div></div>
            </div>
            <div class="jh-pagination"></div>
          </div>
        </div>
        <div class="slider_row"></div>
        <div class="drager_bottom"></div>
      </div>
    </div>
  `;
}

afterEach(() => {
  uninstallSplitGridResizeGuard();
  TestResizeObserver.instances = [];
  delete globalThis.document;
  delete globalThis.window;
});

describe("jh-drag-row 内 AG Grid 尺寸守护", () => {
  it("监听 pane Resize、补齐收缩链并合并通知表格重布局", async () => {
    const window = createDom(splitMarkup());
    const pane = window.document.querySelector(".drager_top");
    const grid = window.document.querySelector("#grid");
    const layout = window.document.querySelector("#layout");
    let gridResizeCount = 0;
    grid.addEventListener(SPLIT_GRID_RESIZE_EVENT, () => gridResizeCount++);

    installSplitGridResizeGuard();
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    await waitForLayout();

    assert.ok(TestResizeObserver.instances[0].observed.has(pane));
    assert.equal(pane.hasAttribute("data-wl-ui-split-pane"), true);
    assert.equal(grid.hasAttribute("data-wl-ui-split-grid-host"), true);
    assert.equal(
      layout.hasAttribute("data-wl-ui-split-grid-flex-parent"),
      true,
    );

    const initialGridEvents = gridResizeCount;
    TestResizeObserver.instances[0].trigger(pane);
    TestResizeObserver.instances[0].trigger(pane);
    await waitForLayout();

    assert.equal(gridResizeCount, initialGridEvents + 1);

    uninstallSplitGridResizeGuard();
    assert.equal(pane.hasAttribute("data-wl-ui-split-pane"), false);
    assert.equal(grid.hasAttribute("data-wl-ui-split-grid-host"), false);
    assert.equal(
      layout.hasAttribute("data-wl-ui-split-grid-flex-parent"),
      false,
    );
  });

  it("运行时安装后新增的分屏也会注册，不需要业务页手工调用", async () => {
    const window = createDom();
    installSplitGridResizeGuard();
    const wrapper = window.document.createElement("div");
    wrapper.innerHTML = splitMarkup();
    window.document.body.append(wrapper.firstElementChild);
    await waitForLayout();

    const pane = window.document.querySelector(".drager_top");
    assert.ok(TestResizeObserver.instances[0].observed.has(pane));
    assert.equal(
      window.document
        .querySelector("#grid")
        .hasAttribute("data-wl-ui-split-grid-host"),
      true,
    );
  });

  it("普通分屏、普通表格和显式豁免区域完全不接管", async () => {
    const window = createDom(`
      <div class="drager_row">
        <div class="drager_top"><div class="el-table"></div></div>
        <div class="slider_row"></div><div class="drager_bottom"></div>
      </div>
      ${splitMarkup("wl-ui-skin-exempt")}
    `);
    installSplitGridResizeGuard();
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    await waitForLayout();

    assert.equal(
      window.document.querySelectorAll("[data-wl-ui-split-grid-host]").length,
      0,
    );
  });
});
