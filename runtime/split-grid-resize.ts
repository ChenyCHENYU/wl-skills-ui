import {
  subscribeDocumentMutations,
  subscribeElementResize,
} from "./observer-hub.ts";

const SPLIT_ROOT_SELECTOR = ".drager_row";
const SPLIT_PANE_SELECTOR = ".drager_top, .drager_bottom";
const GRID_SELECTOR = ".ag-grid-table, .ag-root-wrapper";
const EXEMPT_SELECTOR =
  ".lp-root, .session-login, .wl-ui-skin-exempt, [data-wl-ui-skin='off']";

export const SPLIT_GRID_RESIZE_EVENT = "wl-ui:split-grid-resize";

export interface SplitGridResizeDetail {
  height: number;
  pane: HTMLElement;
  width: number;
}

// 与其余 guard 一致：记录安装所在 document，微前端销毁重建换 document
// 时先卸载再重绑，避免监听残留在旧 document 上。
let installedDocument: Document | undefined;
let observedPanes = new WeakSet<Element>();
let resizeUnsubscribers = new Map<Element, () => void>();
let unsubscribeMutations: (() => void) | undefined;
const pendingPanes = new Set<HTMLElement>();
let addedMarkers = new Map<HTMLElement, Set<string>>();
let frameId: number | null = null;

function addMarker(element: HTMLElement, name: string): void {
  if (element.hasAttribute(name)) return;
  element.setAttribute(name, "");
  const names = addedMarkers.get(element) ?? new Set<string>();
  names.add(name);
  addedMarkers.set(element, names);
}

function removeOwnedMarker(element: HTMLElement, name: string): void {
  const names = addedMarkers.get(element);
  if (!names?.has(name)) return;
  element.removeAttribute(name);
  names.delete(name);
  if (names.size === 0) addedMarkers.delete(element);
}

function isManagedSplitRoot(element: Element): element is HTMLElement {
  return (
    element instanceof window.HTMLElement &&
    element.matches(SPLIT_ROOT_SELECTOR) &&
    !element.closest(EXEMPT_SELECTOR)
  );
}

function getGridHosts(pane: HTMLElement): HTMLElement[] {
  const hosts = new Set<HTMLElement>();
  for (const element of Array.from(
    pane.querySelectorAll<HTMLElement>(GRID_SELECTOR),
  )) {
    const agGridTable = element.closest(".ag-grid-table") as HTMLElement | null;
    if (agGridTable && pane.contains(agGridTable)) {
      hosts.add(agGridTable);
      continue;
    }
    if (element.matches(".ag-root-wrapper")) {
      hosts.add(element);
    }
  }
  return [...hosts];
}

function markHeightChain(pane: HTMLElement, gridHost: HTMLElement): void {
  addMarker(pane, "data-wl-ui-split-pane");
  addMarker(gridHost, "data-wl-ui-split-grid-host");

  let parent = gridHost.parentElement;
  while (parent && parent !== pane) {
    addMarker(parent, "data-wl-ui-split-grid-chain");
    parent = parent.parentElement;
  }

  const directParent = gridHost.parentElement;
  if (!directParent) return;
  const style = window.getComputedStyle(directParent);
  if (
    (style.display === "flex" || style.display === "inline-flex") &&
    style.flexDirection === "column"
  ) {
    addMarker(directParent, "data-wl-ui-split-grid-flex-parent");
  } else {
    removeOwnedMarker(directParent, "data-wl-ui-split-grid-flex-parent");
  }
}

function notifyPane(pane: HTMLElement): void {
  const hosts = getGridHosts(pane);
  if (hosts.length === 0) return;

  for (const host of hosts) {
    markHeightChain(pane, host);
    const { height, width } = host.getBoundingClientRect();
    host.dispatchEvent(
      new window.CustomEvent<SplitGridResizeDetail>(SPLIT_GRID_RESIZE_EVENT, {
        bubbles: true,
        detail: { height, pane, width },
      }),
    );
  }

  // AG Grid 通过自身 ResizeObserver 感知宿主的真实尺寸变化；同时发出局部事件，
  // 供平台封装按需调用公开 gridApi。禁止广播 window.resize，避免让分屏之外的
  // 图表、Tooltip 和其他组件无意义地反复重排。
}

function flushPendingPanes(): void {
  frameId = null;
  const panes = [...pendingPanes];
  pendingPanes.clear();
  for (const pane of panes) notifyPane(pane);
}

function schedulePane(pane: HTMLElement): void {
  if (!pane.isConnected || !pane.querySelector(GRID_SELECTOR)) return;
  pendingPanes.add(pane);
  if (frameId !== null) return;
  frameId = window.requestAnimationFrame(flushPendingPanes);
}

function registerSplitRoot(root: HTMLElement): void {
  for (const pane of Array.from(
    root.querySelectorAll<HTMLElement>(SPLIT_PANE_SELECTOR),
  )) {
    if (pane.parentElement !== root) continue;
    if (!observedPanes.has(pane)) {
      observedPanes.add(pane);
      resizeUnsubscribers.set(
        pane,
        subscribeElementResize(pane, (entries) => {
          for (const entry of entries) {
            if (entry.target instanceof window.HTMLElement) {
              schedulePane(entry.target);
            }
          }
        }),
      );
    }
    schedulePane(pane);
  }
}

function scanNode(node: Node): void {
  if (!(node instanceof window.Element)) return;
  if (isManagedSplitRoot(node)) registerSplitRoot(node);
  for (const root of Array.from(
    node.querySelectorAll<HTMLElement>(SPLIT_ROOT_SELECTOR),
  )) {
    if (isManagedSplitRoot(root)) registerSplitRoot(root);
  }
  const containingRoot = node.closest<HTMLElement>(SPLIT_ROOT_SELECTOR);
  if (containingRoot && isManagedSplitRoot(containingRoot)) {
    registerSplitRoot(containingRoot);
  }
}

function scanDocument(): void {
  for (const root of Array.from(
    document.querySelectorAll<HTMLElement>(SPLIT_ROOT_SELECTOR),
  )) {
    if (isManagedSplitRoot(root)) registerSplitRoot(root);
  }
}

function handleDragEnd(event: Event): void {
  const { target } = event;
  if (!(target instanceof window.Element)) return;
  const root = target.closest<HTMLElement>(SPLIT_ROOT_SELECTOR);
  if (!root || !isManagedSplitRoot(root)) return;
  registerSplitRoot(root);
}

/** 清理已断连 pane 的 resize 订阅，防止强引用 Map 保留游离 DOM。 */
function pruneDisconnectedPanes(): void {
  for (const pane of Array.from(resizeUnsubscribers.keys())) {
    if (pane.isConnected) continue;
    resizeUnsubscribers.get(pane)?.();
    resizeUnsubscribers.delete(pane);
    observedPanes.delete(pane);
    if (pane instanceof HTMLElement) pendingPanes.delete(pane);
  }
}

export function installSplitGridResizeGuard(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  if (installedDocument === document) return;
  if (installedDocument) uninstallSplitGridResizeGuard();
  installedDocument = document;

  unsubscribeMutations = subscribeDocumentMutations(
    document,
    (records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) scanNode(node);
      }
      pruneDisconnectedPanes();
    },
    { childList: true, subtree: true },
  );

  document.addEventListener("mouseup", handleDragEnd, true);
  document.addEventListener("touchend", handleDragEnd, true);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanDocument, { once: true });
  } else {
    scanDocument();
  }
}

export function uninstallSplitGridResizeGuard(): void {
  if (!installedDocument) return;
  installedDocument = undefined;
  unsubscribeMutations?.();
  unsubscribeMutations = undefined;
  for (const unsubscribe of resizeUnsubscribers.values()) unsubscribe();
  resizeUnsubscribers = new Map<Element, () => void>();
  observedPanes = new WeakSet<Element>();
  pendingPanes.clear();
  for (const [element, names] of addedMarkers) {
    for (const name of names) element.removeAttribute(name);
  }
  addedMarkers = new Map<HTMLElement, Set<string>>();
  if (frameId !== null) window.cancelAnimationFrame(frameId);
  frameId = null;
  document.removeEventListener("mouseup", handleDragEnd, true);
  document.removeEventListener("touchend", handleDragEnd, true);
  document.removeEventListener("DOMContentLoaded", scanDocument);
}
