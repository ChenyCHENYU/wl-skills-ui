# 上下分屏 AG Grid 尺寸重布局

## 问题与边界

`jh-drag-row` 的 `.drager_top/.drager_bottom` 使用 `overflow:hidden` 隔离上下区域。
拖动分隔条后，如果 BaseTable/AG Grid 宿主没有沿 flex 高度链一起收缩，外层只会裁切
旧尺寸表格，上表内部不会得到新的 viewport 高度，也就看不到应有的纵向滚动条。

本方案只治理以下同时成立的结构：

- 根节点是 `.drager_row`；
- 直接 pane 是 `.drager_top` 或 `.drager_bottom`；
- pane 内真实存在 `.ag-grid-table` 或 `.ag-root-wrapper`；
- 不在 `.lp-root`、`.session-login`、`.wl-ui-skin-exempt`、
  `[data-wl-ui-skin="off"]` 中。

普通分屏内容、Element Table、非分屏 AG Grid 和定制区域均不接管。

## 实现机制

1. `runtime/auto` 安装 `ResizeObserver`，只观察已识别分屏的两个直接 pane。
2. 动态路由晚挂载的新分屏通过仅监听 `childList` 的 `MutationObserver` 注册；不监听
   全站 style/class 变化，也不扫描每一帧。
3. 发现 AG Grid 后，为 pane、必要祖先和 grid host 增加包内结构标记；SCSS 只对这些
   标记补 `min-height:0`。当 grid 的直接父级本来就是纵向 flex 时，grid 使用
   `flex:1 1 0 + height:0` 占据剩余空间。
4. grid host 真实尺寸改变后，AG Grid 自身的 `ResizeObserver` 完成布局计算并让内部
   `.ag-body-viewport` 生成滚动条。
5. 同一动画帧内的连续 Resize 会合并，并在 grid host 上派发局部
   `wl-ui:split-grid-resize` 事件，供特殊平台封装按需调用公开 grid API。

本实现不会给 `.drager_top/.drager_bottom` 增加 `overflow:auto`，不会访问 Vue 私有实例，
不会遍历或猜测 `gridApi`，也不会广播全局 `window.resize`。卸载守护时，本包增加的结构
标记会一并清理。

## 接入

Skin 项目必须同时接入样式与一次运行时保护：

```scss
@use "@agile-team/wl-skills-ui/styles/presets/skin" as *;
```

```ts
import "@agile-team/wl-skills-ui/runtime/auto";
```

Native 项目调用 `installCommonPreset()` 即可，它已经包含相同守护，不要重复引入
`runtime/auto`。

平台封装若确实还需要主动调用 `api.doLayout()`，可选监听局部事件：

```ts
gridHost.addEventListener("wl-ui:split-grid-resize", () => {
  gridApi.doLayout?.();
});
```

常规 AG Grid 无需业务代码监听；宿主尺寸变化已经会触发它自己的 ResizeObserver。

## 验收

- 拖动前后 `.drager_top/.drager_bottom` 仍为 `overflow:hidden`。
- `.ag-grid-table` 的实际高度随 pane 收缩，并带
  `data-wl-ui-split-grid-host`。
- `.ag-body-viewport` 的 `scrollHeight > clientHeight` 时出现内部纵向滚动条。
- 分屏外的 AG Grid、普通表格、登录页和显式豁免区无新增结构标记。
- `npm run test:visual` 中“上下分屏收缩后由 AG Grid 内部 viewport 滚动”通过。
