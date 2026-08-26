/**
 * AG Grid 空状态布局守护。
 *
 * 空态插图、主文案和辅助说明始终使用同一套完整规格。本模块只在真实的
 * no-rows overlay 出现时：
 * 1. 以实际数据区而不是整张 Grid（含表头）为定位基准；
 * 2. 为数据区保留 160px 最小高度；
 * 3. 在上下/左右分屏空间不足时，让最近的分屏容器承担滚动。
 *
 * 数据恢复或卸载后，本模块添加的属性和 CSS 变量会全部清理。
 */

import {
  subscribeDocumentMutations,
  subscribeElementResize,
} from "./observer-hub.ts";

const GRID_ROOT_SELECTOR = ".ag-root-wrapper";
const GRID_HOST_SELECTOR = ".ag-grid-table";
const EMPTY_OVERLAY_SELECTOR = ".ag-overlay-no-rows-wrapper";
const ROW_SPLIT_SELECTOR = ".drager_row";
const ROW_PANE_SELECTOR = ".drager_top, .drager_bottom";
const COLUMN_SPLIT_SELECTOR = ".drag-col-container";
const COLUMN_PANE_SELECTOR = ".drag-left, .drag-right";
const DIALOG_BODY_SELECTOR = ".el-dialog__body";
const EXEMPT_SELECTOR =
  ".lp-root, .session-login, .wl-ui-skin-exempt, [data-wl-ui-skin='off']";

const OVERLAY_MARKER = "data-wl-ui-empty-overlay";
const HOST_MARKER = "data-wl-ui-empty-host";
const PANE_MARKER = "data-wl-ui-empty-pane";
const SCROLL_MARKER = "data-wl-ui-empty-scroll";

const OVERLAY_TOP_VAR = "--wl-ui-empty-overlay-top";
const OVERLAY_HEIGHT_VAR = "--wl-ui-empty-overlay-height";
const HOST_MIN_HEIGHT_VAR = "--wl-ui-empty-host-min-height";
const PANE_MIN_HEIGHT_VAR = "--wl-ui-empty-pane-min-height";

/** 完整插图 + 主文案 + 辅助说明所需的统一最小数据区高度。 */
export const AG_GRID_EMPTY_BODY_MIN_HEIGHT = 160;

interface ActiveEmptyGrid {
  body: HTMLElement;
  bodyRect: DOMRect;
  host: HTMLElement;
  hostMinHeight: number;
  hostRect: DOMRect;
  overlay: HTMLElement;
  overlayHeight: number;
  overlayTop: number;
  root: HTMLElement;
}

interface OverlayLayout {
  height: number;
  top: number;
}

let installedDocument: Document | undefined;
let observedElements = new WeakSet<Element>();
let resizeUnsubscribers = new Map<Element, () => void>();
let unsubscribeMutations: (() => void) | undefined;
let animationFrame: number | undefined;

const trackedRoots = new Set<HTMLElement>();
const managedOverlays = new Set<HTMLElement>();
const managedHosts = new Set<HTMLElement>();
const managedPanes = new Set<HTMLElement>();
const managedScrollContainers = new Set<HTMLElement>();
const splitPaneBaselines = new Map<HTMLElement, Map<HTMLElement, number>>();

function px(value: number): string {
  return `${Math.max(0, Math.round(value * 100) / 100)}px`;
}

function isExempt(element: Element): boolean {
  return Boolean(element.closest(EXEMPT_SELECTOR));
}

function isElementVisible(element: HTMLElement, root: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  let current: HTMLElement | null = element;
  while (current) {
    if (
      current.hidden ||
      current.classList.contains("ag-hidden") ||
      current.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }
    if (view) {
      const style = view.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    if (current === root) break;
    current = current.parentElement;
  }
  return true;
}

function findActiveOverlay(root: HTMLElement): HTMLElement | null {
  for (const overlay of Array.from(
    root.querySelectorAll<HTMLElement>(EMPTY_OVERLAY_SELECTOR),
  )) {
    if (overlay.closest(GRID_ROOT_SELECTOR) !== root) continue;
    if (isElementVisible(overlay, root)) return overlay;
  }
  return null;
}

function resolveGridBody(root: HTMLElement): HTMLElement | null {
  // querySelector 对选择器列表仍按 DOM 顺序返回；.ag-body 是 viewport 的祖先，
  // 因而必须显式优先 viewport，避免误把包含滚动设施的整个 body 当成数据区。
  return (
    root.querySelector<HTMLElement>(".ag-body-viewport") ??
    root.querySelector<HTMLElement>(".ag-body")
  );
}

function resolveGridHost(root: HTMLElement): HTMLElement {
  return root.closest<HTMLElement>(GRID_HOST_SELECTOR) ?? root;
}

function resolveOverlayContainer(
  overlay: HTMLElement,
  root: HTMLElement,
): HTMLElement {
  const { offsetParent } = overlay;
  if (offsetParent && (offsetParent === root || root.contains(offsetParent))) {
    return offsetParent as HTMLElement;
  }
  return (
    overlay.parentElement?.closest<HTMLElement>(".ag-overlay, .ag-overlay-panel") ??
    root
  );
}

function observe(element: Element): void {
  if (observedElements.has(element)) return;
  observedElements.add(element);
  resizeUnsubscribers.set(
    element,
    subscribeElementResize(element, () => scheduleRefresh()),
  );
}

function registerRoot(root: HTMLElement): void {
  if (isExempt(root)) return;
  trackedRoots.add(root);
  observe(root);
  const host = resolveGridHost(root);
  observe(host);
  const body = resolveGridBody(root);
  if (body) observe(body);
}

function scanElement(element: Element): void {
  if (element.matches(GRID_ROOT_SELECTOR)) registerRoot(element as HTMLElement);
  for (const root of Array.from(
    element.querySelectorAll<HTMLElement>(GRID_ROOT_SELECTOR),
  )) {
    registerRoot(root);
  }
  const containingRoot = element.closest<HTMLElement>(GRID_ROOT_SELECTOR);
  if (containingRoot) registerRoot(containingRoot);
}

function scanDocument(doc: Document): void {
  for (const root of Array.from(
    doc.querySelectorAll<HTMLElement>(GRID_ROOT_SELECTOR),
  )) {
    registerRoot(root);
  }
}

function collectActiveGrid(root: HTMLElement): ActiveEmptyGrid | null {
  if (!root.isConnected || isExempt(root)) return null;
  const overlay = findActiveOverlay(root);
  const body = resolveGridBody(root);
  if (!overlay || !body) return null;

  const rootRect = root.getBoundingClientRect();
  const bodyRect = body.getBoundingClientRect();
  const host = resolveGridHost(root);
  const hostRect = host.getBoundingClientRect();
  const overlayContainerRect = resolveOverlayContainer(
    overlay,
    root,
  ).getBoundingClientRect();
  const gridChromeHeight = Math.max(0, hostRect.height - bodyRect.height);

  return {
    body,
    bodyRect,
    host,
    hostMinHeight: Math.ceil(
      gridChromeHeight + AG_GRID_EMPTY_BODY_MIN_HEIGHT,
    ),
    hostRect,
    overlay,
    overlayHeight: Math.max(
      bodyRect.height,
      AG_GRID_EMPTY_BODY_MIN_HEIGHT,
    ),
    overlayTop: Math.max(
      0,
      bodyRect.top -
        (overlayContainerRect.height > 0
          ? overlayContainerRect.top
          : rootRect.top),
    ),
    root,
  };
}

function directPanes(root: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(root.children).filter(
    (element): element is HTMLElement =>
      element.nodeType === 1 && element.matches(selector),
  );
}

function ensurePaneBaselines(
  splitRoot: HTMLElement,
  paneSelector: string,
): Map<HTMLElement, number> {
  const current = splitPaneBaselines.get(splitRoot);
  if (current) return current;
  const baselines = new Map<HTMLElement, number>();
  for (const pane of directPanes(splitRoot, paneSelector)) {
    baselines.set(pane, Math.ceil(pane.getBoundingClientRect().height));
  }
  splitPaneBaselines.set(splitRoot, baselines);
  return baselines;
}

function desiredPaneHeight(
  pane: HTMLElement,
  grids: ActiveEmptyGrid[],
): number {
  const paneRect = pane.getBoundingClientRect();
  const uniqueHosts = [...new Set(grids.map((grid) => grid.host))];
  const currentHostHeight = uniqueHosts.reduce(
    (sum, host) => sum + host.getBoundingClientRect().height,
    0,
  );
  const requiredHostHeight = uniqueHosts.reduce((sum, host) => {
    const target = grids
      .filter((grid) => grid.host === host)
      .reduce(
        (maximum, grid) => Math.max(maximum, grid.hostMinHeight),
        0,
      );
    return sum + target;
  }, 0);
  return Math.ceil(
    Math.max(0, paneRect.height - currentHostHeight) + requiredHostHeight,
  );
}

function setOwnedAttribute(
  element: HTMLElement,
  name: string,
  value = "",
): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function reconcileOverlayLayouts(
  desired: Map<HTMLElement, OverlayLayout>,
): void {
  for (const overlay of managedOverlays) {
    if (desired.has(overlay)) continue;
    overlay.removeAttribute(OVERLAY_MARKER);
    overlay.style.removeProperty(OVERLAY_TOP_VAR);
    overlay.style.removeProperty(OVERLAY_HEIGHT_VAR);
  }
  managedOverlays.clear();
  for (const [overlay, layout] of desired) {
    setOwnedAttribute(overlay, OVERLAY_MARKER);
    overlay.style.setProperty(OVERLAY_TOP_VAR, px(layout.top));
    overlay.style.setProperty(OVERLAY_HEIGHT_VAR, px(layout.height));
    managedOverlays.add(overlay);
  }
}

function reconcileMinHeights(
  desired: Map<HTMLElement, number>,
  managed: Set<HTMLElement>,
  marker: string,
  variable: string,
): void {
  for (const element of managed) {
    if (desired.has(element)) continue;
    element.removeAttribute(marker);
    element.style.removeProperty(variable);
  }
  managed.clear();
  for (const [element, height] of desired) {
    setOwnedAttribute(element, marker);
    element.style.setProperty(variable, px(height));
    managed.add(element);
  }
}

function reconcileScrollContainers(
  desired: Map<HTMLElement, "column" | "dialog" | "row">,
): void {
  for (const container of managedScrollContainers) {
    if (desired.has(container)) continue;
    container.removeAttribute(SCROLL_MARKER);
  }
  managedScrollContainers.clear();
  for (const [container, type] of desired) {
    setOwnedAttribute(container, SCROLL_MARKER, type);
    managedScrollContainers.add(container);
  }
}

function collectActiveGrids(): ActiveEmptyGrid[] {
  const activeGrids: ActiveEmptyGrid[] = [];
  for (const root of trackedRoots) {
    if (!root.isConnected) {
      trackedRoots.delete(root);
      continue;
    }
    const active = collectActiveGrid(root);
    if (active) activeGrids.push(active);
  }
  return activeGrids;
}

function collectGridLayouts(
  activeGrids: ActiveEmptyGrid[],
  overlayLayouts: Map<HTMLElement, OverlayLayout>,
  hostMinHeights: Map<HTMLElement, number>,
): void {
  for (const grid of activeGrids) {
    overlayLayouts.set(grid.overlay, {
      height: grid.overlayHeight,
      top: grid.overlayTop,
    });
    hostMinHeights.set(
      grid.host,
      Math.max(hostMinHeights.get(grid.host) ?? 0, grid.hostMinHeight),
    );
  }
}

function addGridGroup(
  groups: Map<HTMLElement, ActiveEmptyGrid[]>,
  root: HTMLElement,
  grid: ActiveEmptyGrid,
): void {
  const grids = groups.get(root) ?? [];
  grids.push(grid);
  groups.set(root, grids);
}

function classifyGridLayouts(
  activeGrids: ActiveEmptyGrid[],
  scrollContainers: Map<HTMLElement, "column" | "dialog" | "row">,
): {
  columnGroups: Map<HTMLElement, ActiveEmptyGrid[]>;
  rowGroups: Map<HTMLElement, ActiveEmptyGrid[]>;
} {
  const rowGroups = new Map<HTMLElement, ActiveEmptyGrid[]>();
  const columnGroups = new Map<HTMLElement, ActiveEmptyGrid[]>();
  for (const grid of activeGrids) {
    const rowSplit = grid.root.closest<HTMLElement>(ROW_SPLIT_SELECTOR);
    if (rowSplit) {
      addGridGroup(rowGroups, rowSplit, grid);
      continue;
    }
    const columnSplit = grid.root.closest<HTMLElement>(COLUMN_SPLIT_SELECTOR);
    if (columnSplit) {
      addGridGroup(columnGroups, columnSplit, grid);
      continue;
    }
    const dialogBody = grid.root.closest<HTMLElement>(DIALOG_BODY_SELECTOR);
    if (dialogBody) scrollContainers.set(dialogBody, "dialog");
  }
  return { columnGroups, rowGroups };
}

function collectRowSplitLayouts(
  rowGroups: Map<HTMLElement, ActiveEmptyGrid[]>,
  paneMinHeights: Map<HTMLElement, number>,
  scrollContainers: Map<HTMLElement, "column" | "dialog" | "row">,
  activeSplitRoots: Set<HTMLElement>,
): void {
  for (const [splitRoot, grids] of rowGroups) {
    activeSplitRoots.add(splitRoot);
    scrollContainers.set(splitRoot, "row");
    const paneGroups = new Map<HTMLElement, ActiveEmptyGrid[]>();
    for (const grid of grids) {
      const pane = grid.root.closest<HTMLElement>(ROW_PANE_SELECTOR);
      if (!pane || pane.parentElement !== splitRoot) continue;
      const paneGrids = paneGroups.get(pane) ?? [];
      paneGrids.push(grid);
      paneGroups.set(pane, paneGrids);
    }
    // 只给真正持有空态 Grid 的 pane 设置地板，且地板值来自当前内容需求
    // （pane 内非 Grid 内容的实测高度 + 空态最小数据区高度），而不是初始
    // 高度快照。
    //
    // 2026-08-26 修复：旧逻辑对分栏内【所有】pane 按首次观测高度做快照并
    // 以 min-height 钉死。两个 pane 的地板相加必然约等于容器高度，拖动手
    // 柄因此失去全部行程——上下分栏只要有任意一侧表格为空，手柄就拖不动，
    // 直到空态消失才解钉。未持有空态 Grid 的 pane 完全不参与钉死；持有
    // 空态 Grid 的 pane 仍保留内容地板，配合分屏根滚动保证空态提示不被
    // 挤没（本模块头部声明的职责 2/3 不变）。
    for (const [pane, paneGrids] of paneGroups) {
      paneMinHeights.set(pane, desiredPaneHeight(pane, paneGrids));
    }
  }
}

function collectColumnSplitLayouts(
  columnGroups: Map<HTMLElement, ActiveEmptyGrid[]>,
  paneMinHeights: Map<HTMLElement, number>,
  scrollContainers: Map<HTMLElement, "column" | "dialog" | "row">,
  activeSplitRoots: Set<HTMLElement>,
): void {
  for (const [splitRoot, grids] of columnGroups) {
    activeSplitRoots.add(splitRoot);
    scrollContainers.set(splitRoot, "column");
    const baselines = ensurePaneBaselines(splitRoot, COLUMN_PANE_SELECTOR);
    let sharedMinHeight = Math.max(0, ...baselines.values());
    for (const pane of baselines.keys()) {
      const paneGrids = grids.filter((grid) => pane.contains(grid.root));
      if (paneGrids.length === 0) continue;
      sharedMinHeight = Math.max(
        sharedMinHeight,
        desiredPaneHeight(pane, paneGrids),
      );
    }
    for (const pane of baselines.keys()) {
      paneMinHeights.set(pane, sharedMinHeight);
    }
  }
}

function cleanupSplitBaselines(activeSplitRoots: Set<HTMLElement>): void {
  for (const splitRoot of splitPaneBaselines.keys()) {
    if (!activeSplitRoots.has(splitRoot)) splitPaneBaselines.delete(splitRoot);
  }
}

function refreshLayouts(): void {
  animationFrame = undefined;
  const activeGrids = collectActiveGrids();
  const overlayLayouts = new Map<HTMLElement, OverlayLayout>();
  const hostMinHeights = new Map<HTMLElement, number>();
  const paneMinHeights = new Map<HTMLElement, number>();
  const scrollContainers = new Map<
    HTMLElement,
    "column" | "dialog" | "row"
  >();
  const activeSplitRoots = new Set<HTMLElement>();

  collectGridLayouts(activeGrids, overlayLayouts, hostMinHeights);
  const { columnGroups, rowGroups } = classifyGridLayouts(
    activeGrids,
    scrollContainers,
  );
  collectRowSplitLayouts(
    rowGroups,
    paneMinHeights,
    scrollContainers,
    activeSplitRoots,
  );
  collectColumnSplitLayouts(
    columnGroups,
    paneMinHeights,
    scrollContainers,
    activeSplitRoots,
  );
  cleanupSplitBaselines(activeSplitRoots);

  reconcileOverlayLayouts(overlayLayouts);
  reconcileMinHeights(
    hostMinHeights,
    managedHosts,
    HOST_MARKER,
    HOST_MIN_HEIGHT_VAR,
  );
  reconcileMinHeights(
    paneMinHeights,
    managedPanes,
    PANE_MARKER,
    PANE_MIN_HEIGHT_VAR,
  );
  reconcileScrollContainers(scrollContainers);
}

function scheduleRefresh(): void {
  if (!installedDocument || animationFrame !== undefined) return;
  const view = installedDocument.defaultView;
  if (view?.requestAnimationFrame) {
    animationFrame = view.requestAnimationFrame(refreshLayouts);
  } else {
    refreshLayouts();
  }
}

function handleMutations(records: MutationRecord[]): void {
  for (const record of records) {
    if (record.target.nodeType === 1) scanElement(record.target as Element);
    for (const node of Array.from(record.addedNodes)) {
      if (node.nodeType === 1) scanElement(node as Element);
    }
  }
  scheduleRefresh();
}

/** 立即重新测量所有已发现的 AG Grid；通常无需业务项目主动调用。 */
export function refreshAgGridEmptyStateLayout(): void {
  if (!installedDocument) return;
  scanDocument(installedDocument);
  refreshLayouts();
}

/** 安装空状态布局守护。重复调用安全，SSR 环境自动跳过。 */
export function installAgGridEmptyStateGuard(): void {
  if (typeof document === "undefined") return;
  if (installedDocument === document) return;
  if (installedDocument) uninstallAgGridEmptyStateGuard();
  installedDocument = document;

  unsubscribeMutations = subscribeDocumentMutations(
    document,
    handleMutations,
    {
      attributeFilter: ["aria-hidden", "class", "hidden"],
      attributes: true,
      childList: true,
      subtree: true,
    },
  );

  scanDocument(document);
  scheduleRefresh();
}

/** 卸载守护并恢复本包添加的全部结构标记。 */
export function uninstallAgGridEmptyStateGuard(): void {
  const view = installedDocument?.defaultView;
  if (animationFrame !== undefined) view?.cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
  unsubscribeMutations?.();
  unsubscribeMutations = undefined;
  for (const unsubscribe of resizeUnsubscribers.values()) unsubscribe();
  resizeUnsubscribers = new Map<Element, () => void>();

  reconcileOverlayLayouts(new Map());
  reconcileMinHeights(
    new Map(),
    managedHosts,
    HOST_MARKER,
    HOST_MIN_HEIGHT_VAR,
  );
  reconcileMinHeights(
    new Map(),
    managedPanes,
    PANE_MARKER,
    PANE_MIN_HEIGHT_VAR,
  );
  reconcileScrollContainers(new Map());

  trackedRoots.clear();
  splitPaneBaselines.clear();
  observedElements = new WeakSet<Element>();
  installedDocument = undefined;
}
