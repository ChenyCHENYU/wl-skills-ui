import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  installBrandThemeLock,
  uninstallBrandThemeLock,
} from "../theme-lock.ts";

let window;
const previousGlobals = new Map();

function expose(name, value) {
  previousGlobals.set(name, globalThis[name]);
  globalThis[name] = value;
}

function flushMutations() {
  return new Promise((resolve) => {
    const done = () => {
      window.document.removeEventListener("wl-test-flush", done);
      resolve();
    };
    window.document.addEventListener("wl-test-flush", done);
    window.document.dispatchEvent(new window.Event("wl-test-flush"));
  });
}

beforeEach(() => {
  window = new Window();
  expose("document", window.document);
  expose("MutationObserver", window.MutationObserver);
  expose("Element", window.Element);
  expose("HTMLElement", window.HTMLElement);
});

afterEach(() => {
  uninstallBrandThemeLock();
  for (const [name, value] of previousGlobals) {
    if (value === undefined) delete globalThis[name];
    else globalThis[name] = value;
  }
  previousGlobals.clear();
});

describe("brand theme lock 过滤契约", () => {
  it("安装时在 html/body 落品牌 token", () => {
    installBrandThemeLock();
    assert.match(
      window.document.documentElement.getAttribute("style"),
      /--el-color-primary:\s*#002a8f\s*!important/
    );
    assert.match(
      window.document.body.getAttribute("style"),
      /--el-color-primary:\s*#002a8f\s*!important/
    );
  });

  it("body 内联 style 被越权改写后重新落锁", async () => {
    installBrandThemeLock();
    window.document.body.style.setProperty("color", "red");
    await flushMutations();
    // body 自身 style 的任何改写（含越权清 token）都必须触发重新落锁。
    window.document.body.style.removeProperty("--el-color-primary");
    window.document.body.setAttribute(
      "style",
      window.document.body.getAttribute("style") || ""
    );
    await flushMutations();
    assert.match(
      window.document.body.getAttribute("style") || "",
      /--el-color-primary:\s*#002a8f\s*!important/
    );
  });
});
