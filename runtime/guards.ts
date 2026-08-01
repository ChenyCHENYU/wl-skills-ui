import { installOverflowTooltipGuard } from "./overflow-tooltip";
import { installBrandThemeLock } from "./theme-lock";

/**
 * 安装不依赖业务页面写法的包级运行时保护。
 * 包含客户主题锁与普通表格长文本溢出提示兜底；重复调用安全。
 */
export function installUiRuntimeGuards(): void {
  installBrandThemeLock();
  installOverflowTooltipGuard();
}

