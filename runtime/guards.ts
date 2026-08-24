import {
  installAgGridEmptyStateGuard,
  uninstallAgGridEmptyStateGuard,
} from "./ag-grid-empty-state.ts";
import {
  installOverflowTooltipGuard,
  uninstallOverflowTooltipGuard,
} from "./overflow-tooltip.ts";
import {
  installSplitGridResizeGuard,
  uninstallSplitGridResizeGuard,
} from "./split-grid-resize.ts";
import {
  installBrandThemeLock,
  uninstallBrandThemeLock,
} from "./theme-lock.ts";

export interface UiRuntimeGuardOptions {
  agGridEmptyState?: boolean;
  overflowTooltip?: boolean;
  splitGridResize?: boolean;
  themeLock?: boolean;
}

/**
 * 安装不依赖业务页面写法的包级运行时保护。
 * 包含客户主题锁、普通表格长文本溢出提示兜底与分屏 AG Grid 尺寸守护；
 * 重复调用安全。
 */
export function installUiRuntimeGuards(
  options: UiRuntimeGuardOptions = {},
): void {
  if (options.themeLock !== false) installBrandThemeLock();
  if (options.overflowTooltip !== false) installOverflowTooltipGuard();
  if (options.splitGridResize !== false) installSplitGridResizeGuard();
  if (options.agGridEmptyState !== false) installAgGridEmptyStateGuard();
}

/** 卸载全部包级保护，并清理本包添加的监听和结构标记。 */
export function uninstallUiRuntimeGuards(): void {
  uninstallAgGridEmptyStateGuard();
  uninstallSplitGridResizeGuard();
  uninstallOverflowTooltipGuard();
  uninstallBrandThemeLock();
}
