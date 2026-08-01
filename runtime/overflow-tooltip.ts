/**
 * 普通表格长文本兜底。
 *
 * CSS 负责绘制省略号；本模块只在用户悬停或键盘聚焦时按需判断真实溢出，
 * 并为未启用组件原生 tooltip 的普通文本单元格提供完整内容提示。
 * 动态行和虚拟滚动通过事件委托自然覆盖，不需要 MutationObserver。
 */

const MANAGED_CELL_SELECTOR =
  ".ag-root-wrapper .ag-cell-value, .el-table__body .cell";
const EXEMPT_ROOT_SELECTOR =
  ".lp-root, .session-login, .wl-ui-skin-exempt, [data-wl-ui-skin='off']";
const OVERFLOW_OFF_SELECTOR =
  ".wl-ui-overflow-ignore, [data-wl-ui-overflow='off']";
const INTERACTIVE_CONTENT_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "[contenteditable='true']",
  ".el-input",
  ".el-textarea",
  ".el-select",
  ".el-input-number",
  ".el-date-editor",
  ".el-button",
  ".el-link",
  ".el-tag",
  ".el-checkbox",
  ".el-radio",
  ".el-switch",
  ".ag-checkbox",
  ".ag-cell-editor",
].join(", ");
const EXCLUDED_AG_CELL_SELECTOR = [
  ".editable-cell",
  ".always-editable-cell",
  ".default-slot-cell",
  ".operations-cell",
  ".ag-cell-inline-editing",
  ".ag-cell-wrap-text",
  ".ag-checkbox-cell",
].join(", ");
const COMPONENT_TOOLTIP_SELECTOR =
  ".ag-tooltip, .el-popper[role='tooltip'], .el-tooltip__popper";
const TOOLTIP_ID = "wl-ui-overflow-tooltip";

export interface OverflowTooltipGuardOptions {
  /** 普通 Element Table 单元格的悬停延迟。 */
  showDelay?: number;
  /**
   * AG Grid 兜底延迟。默认略晚于平台的 800ms 原生 tooltip，避免重复提示。
   */
  agGridShowDelay?: number;
}

const DEFAULT_OPTIONS: Required<OverflowTooltipGuardOptions> = {
  showDelay: 220,
  agGridShowDelay: 900,
};

let installedDocument: Document | undefined;
let installedOptions = DEFAULT_OPTIONS;
let pendingCell: HTMLElement | undefined;
let visibleCell: HTMLElement | undefined;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let tooltipElement: HTMLElement | undefined;
let previousDescribedBy: string | null = null;

function asElement(target: EventTarget | null): Element | null {
  if (!target || typeof (target as Element).closest !== "function") return null;
  return target as Element;
}

function isPlainTextCell(cell: HTMLElement): boolean {
  if (cell.dataset.wlUiOverflow === "on") return true;
  return cell.childElementCount === 0;
}

function resolveManagedCell(target: EventTarget | null): HTMLElement | null {
  const element = asElement(target);
  const cell = element?.closest<HTMLElement>(MANAGED_CELL_SELECTOR);
  if (!cell || !cell.isConnected) return null;
  if (cell.closest(EXEMPT_ROOT_SELECTOR)) return null;
  if (cell.closest(OVERFLOW_OFF_SELECTOR)) return null;
  if (cell.matches(EXCLUDED_AG_CELL_SELECTOR)) return null;
  if (cell.matches(".el-tooltip") || cell.querySelector(INTERACTIVE_CONTENT_SELECTOR)) {
    return null;
  }
  return isPlainTextCell(cell) ? cell : null;
}

function hasHorizontalOverflow(cell: HTMLElement): boolean {
  return cell.scrollWidth - cell.clientWidth > 1;
}

function getCellText(cell: HTMLElement): string {
  return (cell.textContent ?? "").replace(/\s+/g, " ").trim();
}

function hasDeclaredTooltip(cell: HTMLElement): boolean {
  return Boolean(
    cell.getAttribute("title")?.trim() ||
      cell.getAttribute("aria-describedby")?.trim() ||
      cell.dataset.tooltip?.trim(),
  );
}

function hasVisibleComponentTooltip(doc: Document): boolean {
  const view = doc.defaultView;
  const componentTooltips = Array.from(
    doc.querySelectorAll<HTMLElement>(COMPONENT_TOOLTIP_SELECTOR),
  );
  for (const element of componentTooltips) {
    if (element.id === TOOLTIP_ID || element.hidden) continue;
    if (element.getAttribute("aria-hidden") === "true") continue;
    if (!view) return true;
    const style = view.getComputedStyle(element);
    if (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    ) {
      return true;
    }
  }
  return false;
}

function ensureTooltip(doc: Document): HTMLElement | null {
  if (tooltipElement?.isConnected) return tooltipElement;
  if (!doc.body) return null;
  const tooltip = doc.createElement("div");
  tooltip.id = TOOLTIP_ID;
  tooltip.className = "wl-ui-overflow-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  doc.body.append(tooltip);
  tooltipElement = tooltip;
  return tooltip;
}

function positionTooltip(cell: HTMLElement, tooltip: HTMLElement): void {
  const doc = cell.ownerDocument;
  const view = doc.defaultView;
  const viewportWidth = view?.innerWidth ?? doc.documentElement.clientWidth;
  const viewportHeight = view?.innerHeight ?? doc.documentElement.clientHeight;
  const cellRect = cell.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const edge = 12;
  const maxLeft = Math.max(edge, viewportWidth - tooltipRect.width - edge);
  const centeredLeft =
    cellRect.left + cellRect.width / 2 - tooltipRect.width / 2;
  const left = Math.min(Math.max(edge, centeredLeft), maxLeft);
  const above = cellRect.top - tooltipRect.height - gap;
  const below = Math.min(
    viewportHeight - tooltipRect.height - edge,
    cellRect.bottom + gap,
  );

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(above >= edge ? above : below)}px`;
}

function restoreDescribedBy(): void {
  if (!visibleCell) return;
  if (previousDescribedBy === null) visibleCell.removeAttribute("aria-describedby");
  else visibleCell.setAttribute("aria-describedby", previousDescribedBy);
  visibleCell.removeAttribute("data-wl-ui-overflow-active");
  previousDescribedBy = null;
}

function hideTooltip(): void {
  if (showTimer) clearTimeout(showTimer);
  showTimer = undefined;
  pendingCell = undefined;
  restoreDescribedBy();
  visibleCell = undefined;
  if (!tooltipElement) return;
  tooltipElement.classList.remove("is-visible");
  tooltipElement.hidden = true;
  tooltipElement.textContent = "";
}

function revealTooltip(cell: HTMLElement): void {
  const doc = cell.ownerDocument;
  pendingCell = undefined;
  showTimer = undefined;
  if (!cell.isConnected || !hasHorizontalOverflow(cell)) return;
  if (hasDeclaredTooltip(cell) || hasVisibleComponentTooltip(doc)) return;
  const text = getCellText(cell);
  if (!text) return;
  const tooltip = ensureTooltip(doc);
  if (!tooltip) return;

  tooltip.textContent = text;
  tooltip.hidden = false;
  previousDescribedBy = cell.getAttribute("aria-describedby");
  cell.setAttribute("aria-describedby", TOOLTIP_ID);
  cell.setAttribute("data-wl-ui-overflow-active", "true");
  visibleCell = cell;
  positionTooltip(cell, tooltip);
  tooltip.classList.add("is-visible");
}

function scheduleTooltip(cell: HTMLElement, keyboard = false): void {
  hideTooltip();
  if (!hasHorizontalOverflow(cell) || hasDeclaredTooltip(cell)) return;
  pendingCell = cell;
  const delay = keyboard
    ? 0
    : cell.matches(".ag-cell-value")
      ? installedOptions.agGridShowDelay
      : installedOptions.showDelay;
  showTimer = setTimeout(() => {
    if (pendingCell === cell) revealTooltip(cell);
  }, delay);
}

function onPointerOver(event: Event): void {
  const cell = resolveManagedCell(event.target);
  if (!cell || cell === pendingCell || cell === visibleCell) return;
  scheduleTooltip(cell);
}

function onPointerOut(event: Event): void {
  const pointerEvent = event as PointerEvent;
  const fromCell = resolveManagedCell(event.target);
  if (!fromCell) return;
  const toCell = resolveManagedCell(pointerEvent.relatedTarget);
  if (toCell === fromCell) return;
  if (fromCell === pendingCell || fromCell === visibleCell) hideTooltip();
}

function onFocusIn(event: Event): void {
  const cell = resolveManagedCell(event.target);
  if (cell) scheduleTooltip(cell, true);
}

function onFocusOut(event: Event): void {
  const fromCell = resolveManagedCell(event.target);
  if (fromCell === pendingCell || fromCell === visibleCell) hideTooltip();
}

function onKeyDown(event: Event): void {
  if ((event as KeyboardEvent).key === "Escape") hideTooltip();
}

function bindDocument(doc: Document): void {
  doc.addEventListener("pointerover", onPointerOver);
  doc.addEventListener("pointerout", onPointerOut);
  doc.addEventListener("focusin", onFocusIn);
  doc.addEventListener("focusout", onFocusOut);
  doc.addEventListener("keydown", onKeyDown);
  doc.addEventListener("pointerdown", hideTooltip);
  doc.addEventListener("scroll", hideTooltip, true);
  doc.defaultView?.addEventListener("resize", hideTooltip);
}

function unbindDocument(doc: Document): void {
  doc.removeEventListener("pointerover", onPointerOver);
  doc.removeEventListener("pointerout", onPointerOut);
  doc.removeEventListener("focusin", onFocusIn);
  doc.removeEventListener("focusout", onFocusOut);
  doc.removeEventListener("keydown", onKeyDown);
  doc.removeEventListener("pointerdown", hideTooltip);
  doc.removeEventListener("scroll", hideTooltip, true);
  doc.defaultView?.removeEventListener("resize", hideTooltip);
}

/** 安装普通表格长文本兜底。重复调用安全，SSR 环境自动跳过。 */
export function installOverflowTooltipGuard(
  options: OverflowTooltipGuardOptions = {},
): void {
  if (typeof document === "undefined") return;
  if (installedDocument === document) return;
  if (installedDocument) unbindDocument(installedDocument);
  installedOptions = { ...DEFAULT_OPTIONS, ...options };
  installedDocument = document;
  bindDocument(document);
}

/** 卸载兜底监听，主要供微前端销毁和回归测试使用。 */
export function uninstallOverflowTooltipGuard(): void {
  if (installedDocument) unbindDocument(installedDocument);
  hideTooltip();
  tooltipElement?.remove();
  tooltipElement = undefined;
  installedDocument = undefined;
  installedOptions = DEFAULT_OPTIONS;
}
