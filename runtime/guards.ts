import { installOverflowTooltipGuard } from "./overflow-tooltip";
import { installSplitGridResizeGuard } from "./split-grid-resize";
import { installBrandThemeLock } from "./theme-lock";

/**
 * 安装不依赖业务页面写法的包级运行时保护。
 * 包含客户主题锁、普通表格长文本溢出提示兜底与分屏 AG Grid 尺寸守护；
 * 重复调用安全。
 */
export function installUiRuntimeGuards(): void {
  installBrandThemeLock();
  installOverflowTooltipGuard();
  installSplitGridResizeGuard();
}
