/**
 * 客户品牌主题锁。
 *
 * 平台会在登录后的路由守卫中把后端主题写入 document.body.style，普通样式表
 * 即使提高选择器特异性也无法稳定压过内联变量。本模块把客户已确认的品牌色、
 * 功能色和圆角以 inline !important 写回，并监听后续改写，确保包值最终生效。
 */

import { subscribeDocumentMutations } from "./observer-hub.ts";

export const BRAND_THEME_TOKENS = Object.freeze({
  "--el-color-primary": "#002a8f",
  "--el-color-primary-rgb": "0, 42, 143",
  "--el-color-primary-light-1": "#1a3f9a",
  "--el-color-primary-light-2": "#3355a5",
  "--el-color-primary-light-3": "#4d6ab1",
  "--el-color-primary-light-4": "#667fbc",
  "--el-color-primary-light-5": "#8094c7",
  "--el-color-primary-light-6": "#99aad2",
  "--el-color-primary-light-7": "#b2bfdd",
  "--el-color-primary-light-8": "#ccd4e9",
  "--el-color-primary-light-9": "#e5eaf4",
  "--el-color-primary-dark-1": "#002681",
  "--el-color-primary-dark-2": "#002272",
  "--el-color-primary-dark-3": "#001d64",
  "--el-color-primary-dark-4": "#001956",

  "--el-color-success": "#2bb268",
  "--el-color-success-light-1": "#40ba77",
  "--el-color-success-light-2": "#55c286",
  "--el-color-success-light-3": "#6bcb95",
  "--el-color-success-light-4": "#80d3a4",
  "--el-color-success-light-5": "#95dbb4",
  "--el-color-success-light-6": "#aae3c3",
  "--el-color-success-light-7": "#bfebd2",
  "--el-color-success-light-8": "#d5f4e1",
  "--el-color-success-light-9": "#eaf9f0",
  "--el-color-success-dark-1": "#229051",
  "--el-color-success-dark-2": "#1b733f",
  "--el-color-success-dark-3": "#14562f",
  "--el-color-success-dark-4": "#0d3a20",

  "--el-color-warning": "#ea9a13",
  "--el-color-warning-light-1": "#eca42b",
  "--el-color-warning-light-2": "#efae42",
  "--el-color-warning-light-3": "#f1b85a",
  "--el-color-warning-light-4": "#f3c171",
  "--el-color-warning-light-5": "#f5cb89",
  "--el-color-warning-light-6": "#f7d5a1",
  "--el-color-warning-light-7": "#f9dfb8",
  "--el-color-warning-light-8": "#fce8d0",
  "--el-color-warning-light-9": "#fef2e7",
  "--el-color-warning-dark-1": "#c47f0e",
  "--el-color-warning-dark-2": "#9d650a",
  "--el-color-warning-dark-3": "#754a07",
  "--el-color-warning-dark-4": "#4e3004",

  "--el-color-danger": "#bb2d3f",
  "--el-color-danger-light-1": "#c34253",
  "--el-color-danger-light-2": "#ca5766",
  "--el-color-danger-light-3": "#d16b78",
  "--el-color-danger-light-4": "#d8808b",
  "--el-color-danger-light-5": "#dd969f",
  "--el-color-danger-light-6": "#e4abb2",
  "--el-color-danger-light-7": "#e8c0c5",
  "--el-color-danger-light-8": "#f0d5d9",
  "--el-color-danger-light-9": "#f7eaec",
  "--el-color-danger-dark-1": "#962433",
  "--el-color-danger-dark-2": "#711b26",
  "--el-color-danger-dark-3": "#4b1219",
  "--el-color-danger-dark-4": "#26090d",

  "--el-color-error": "#bb2d3f",
  "--el-color-error-light-1": "#c34253",
  "--el-color-error-light-2": "#ca5766",
  "--el-color-error-light-3": "#d16b78",
  "--el-color-error-light-4": "#d8808b",
  "--el-color-error-light-5": "#dd969f",
  "--el-color-error-light-6": "#e4abb2",
  "--el-color-error-light-7": "#e8c0c5",
  "--el-color-error-light-8": "#f0d5d9",
  "--el-color-error-light-9": "#f7eaec",
  "--el-color-error-dark-1": "#962433",
  "--el-color-error-dark-2": "#711b26",
  "--el-color-error-dark-3": "#4b1219",
  "--el-color-error-dark-4": "#26090d",

  "--el-border-radius-base": "6px",
  "--el-border-radius-small": "2px",
  "--el-border-radius-round": "20px",
  "--el-border-radius-circle": "100%",
} as const);

let installedDocument: Document | undefined;
let unsubscribeMutations: (() => void) | undefined;
let waitingForBody = false;

function enforceOn(target: HTMLElement | null): void {
  if (!target) return;

  for (const [name, value] of Object.entries(BRAND_THEME_TOKENS)) {
    if (
      target.style.getPropertyValue(name).trim().toLowerCase() !== value ||
      target.style.getPropertyPriority(name) !== "important"
    ) {
      target.style.setProperty(name, value, "important");
    }
  }
}

function bindObserver(doc: Document): void {
  enforceOn(doc.documentElement);
  enforceOn(doc.body);

  if (unsubscribeMutations) return;
  unsubscribeMutations = subscribeDocumentMutations(doc, (mutations) => {
    // 只有 html/body 自身的 style 被改写，或 body 被 html 的 childList 整替
    // 时才需要重新落锁；深层子树的任何变更都不可能影响两者的内联 token。
    // 该过滤把每帧 62 token × 2 元素的 CSSOM 读取压缩到真正的越权写场景。
    const needsEnforce = mutations.some(
      (mutation) =>
        (mutation.type === "attributes" &&
          (mutation.target === doc.documentElement ||
            mutation.target === doc.body)) ||
        (mutation.type === "childList" &&
          mutation.target === doc.documentElement),
    );
    if (needsEnforce) {
      enforceOn(doc.documentElement);
      enforceOn(doc.body);
    }
  }, {
    attributes: true,
    attributeFilter: ["style"],
    childList: true,
    subtree: true,
  });
}

function handleBodyReady(): void {
  waitingForBody = false;
  if (installedDocument) bindObserver(installedDocument);
}

/**
 * 安装客户品牌主题锁。可重复调用；SSR/构建阶段自动无操作。
 */
export function installBrandThemeLock(): void {
  if (typeof document === "undefined") return;
  if (installedDocument && installedDocument !== document) {
    uninstallBrandThemeLock();
  }
  installedDocument = document;
  bindObserver(document);

  if (!document.body && !waitingForBody) {
    waitingForBody = true;
    document.addEventListener("DOMContentLoaded", handleBodyReady, {
      once: true,
    });
  }
}

/** 停止主题变量回写。已写入的 token 保留，避免卸载瞬间产生视觉闪烁。 */
export function uninstallBrandThemeLock(): void {
  unsubscribeMutations?.();
  unsubscribeMutations = undefined;
  if (installedDocument) {
    installedDocument.removeEventListener("DOMContentLoaded", handleBodyReady);
  }
  installedDocument = undefined;
  waitingForBody = false;
}
