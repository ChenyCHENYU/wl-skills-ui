import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Window } from "happy-dom";
import {
  getObserverHubStats,
  subscribeDocumentMutations,
  subscribeElementResize,
} from "../observer-hub.ts";
import {
  installUiRuntimeGuards,
  uninstallUiRuntimeGuards,
} from "../guards.ts";

class TestMutationObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    this.connected = false;
    TestMutationObserver.instances.push(this);
  }

  disconnect() {
    this.connected = false;
  }

  observe() {
    this.connected = true;
  }

  trigger(records) {
    this.callback(records, this);
  }
}

class TestResizeObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    this.observed = new Set();
    TestResizeObserver.instances.push(this);
  }

  disconnect() {
    this.observed.clear();
  }

  observe(element) {
    this.observed.add(element);
  }

  unobserve(element) {
    this.observed.delete(element);
  }

  trigger(element) {
    this.callback([{ target: element }], this);
  }
}

let window;
const previousGlobals = new Map();

function expose(name, value) {
  previousGlobals.set(name, globalThis[name]);
  globalThis[name] = value;
}

beforeEach(() => {
  window = new Window({ url: "https://observer-hub.test/" });
  window.MutationObserver = TestMutationObserver;
  window.ResizeObserver = TestResizeObserver;
  window.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(window.performance.now()), 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.document.body.innerHTML = `
    <div class="drager_row">
      <div class="drager_top">
        <div class="ag-grid-table"><div class="ag-root-wrapper">
          <div class="ag-body-viewport"></div>
        </div></div>
      </div>
      <div class="drager_bottom"></div>
    </div>
  `;
  expose("window", window);
  expose("document", window.document);
  expose("Element", window.Element);
  expose("HTMLElement", window.HTMLElement);
});

afterEach(() => {
  uninstallUiRuntimeGuards();
  window.close();
  TestMutationObserver.instances = [];
  TestResizeObserver.instances = [];
  for (const [name, value] of previousGlobals) {
    if (value === undefined) delete globalThis[name];
    else globalThis[name] = value;
  }
  previousGlobals.clear();
});

describe("共享 Observer Hub", () => {
  it("按 Document/Window 复用实例并按 target 分发", () => {
    const mutationCalls = [0, 0];
    const resizeCalls = [0, 0];
    const element = window.document.querySelector(".drager_top");
    const stopMutationA = subscribeDocumentMutations(
      window.document,
      () => mutationCalls[0]++,
      { childList: true, subtree: true },
    );
    const stopMutationB = subscribeDocumentMutations(
      window.document,
      () => mutationCalls[1]++,
      { attributes: true, attributeFilter: ["class"] },
    );
    const stopResizeA = subscribeElementResize(
      element,
      () => resizeCalls[0]++,
    );
    const stopResizeB = subscribeElementResize(
      element,
      () => resizeCalls[1]++,
    );

    assert.equal(TestMutationObserver.instances.length, 1);
    assert.equal(TestResizeObserver.instances.length, 1);
    TestMutationObserver.instances[0].trigger([
      { addedNodes: [], target: element, type: "childList" },
    ]);
    TestResizeObserver.instances[0].trigger(element);
    assert.deepEqual(mutationCalls, [1, 1]);
    assert.deepEqual(resizeCalls, [1, 1]);
    assert.deepEqual(getObserverHubStats(window.document), {
      mutationObserverCount: 1,
      mutationSubscribers: 2,
      resizeObserverCount: 1,
      resizeSubscribers: 2,
      resizeTargets: 1,
    });

    stopMutationA();
    stopMutationB();
    stopResizeA();
    stopResizeB();
    assert.equal(getObserverHubStats(window.document).mutationObserverCount, 0);
    assert.equal(getObserverHubStats(window.document).resizeObserverCount, 0);
  });

  it("四类 guard 默认全开，但只保留一个 mutation 和 resize 实例", () => {
    installUiRuntimeGuards();
    installUiRuntimeGuards();

    const stats = getObserverHubStats(window.document);
    assert.equal(stats.mutationObserverCount, 1);
    assert.equal(stats.mutationSubscribers, 3);
    assert.equal(stats.resizeObserverCount, 1);
    assert.ok(stats.resizeTargets >= 2);
    assert.equal(TestMutationObserver.instances.length, 1);
    assert.equal(TestResizeObserver.instances.length, 1);

    uninstallUiRuntimeGuards();
    assert.deepEqual(getObserverHubStats(window.document), {
      mutationObserverCount: 0,
      mutationSubscribers: 0,
      resizeObserverCount: 0,
      resizeSubscribers: 0,
      resizeTargets: 0,
    });
  });

  it("可按需关闭高成本 guard", () => {
    installUiRuntimeGuards({
      agGridEmptyState: false,
      overflowTooltip: false,
      splitGridResize: false,
    });
    const stats = getObserverHubStats(window.document);
    assert.equal(stats.mutationSubscribers, 1);
    assert.equal(stats.resizeObserverCount, 0);
  });
});
