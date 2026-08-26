# AG Grid 完整空状态布局

## 目标

所有接入 `wl-skills-ui` 的 BaseTable/AG Grid 在无数据时始终显示同一套完整空态：

- 100×84px 插图；
- 主文案“暂无数据”；
- 辅助说明“未找到匹配数据，请调整筛选条件后重试”；
- 相同字号、间距和视觉中心。

不会因普通单表、上下分屏、左右分屏、单层表头或分组表头而缩小插图、隐藏文案或改变
构图。空间不足时通过受控撑高和最近布局容器滚动解决。

## 根因与禁止方案

AG Grid 的 no-rows overlay 在不同版本中可能覆盖整张 Grid。直接使用 `inset:0` 会把表头
计入居中区域；固定写 `top:36px` 或分组表头 `top:72px` 又依赖表头层数和固定行高，无法
适配动态表头、滚动设施和分屏拖动。

禁止：

- 在业务项目硬编码 `.ag-overlay-no-rows-wrapper { top:36px/72px }`；
- 按高度缩小插图、隐藏辅助说明或切换成文字版；
- 给所有 pane 永久增加 `overflow:auto`；
- 修改 common-core 或访问 Vue 私有实例、猜测 `gridApi`。

## 包内机制

`runtime/ag-grid-empty-state.ts` 随 `runtime/auto` 或 `installCommonPreset()` 安装：

1. 只识别当前可见的 `.ag-overlay-no-rows-wrapper`。
2. 优先读取 `.ag-body-viewport` 的真实矩形，兼容 AG Grid 29/32；缺少 viewport 时才回退
   `.ag-body`。
3. 把 overlay 的 `top/height` 对齐真实数据区，不计算固定表头高度。
4. 数据区小于 160px 时，为 grid host 添加包内最小高度标记，保证完整空态可容纳。
5. 上下分屏只给持有空态表格的 pane 设置内容需求地板（pane 内非表格内容实测高度 +
   空态最小数据区高度），未持有空态表格的 pane 不钉死，拖动手柄始终保留行程；
   空间不足时仅让 `.drager_row` 承担纵向滚动。
6. 左右分屏把两个 pane 撑到同一最小高度，仅让 `.drag-col-container` 承担纵向滚动。
7. 弹窗内独立空表由 `.el-dialog__body` 承担滚动，不突破弹窗可视边界。
8. 数据恢复、路由卸载或手动卸载守护时，包添加的属性和 CSS 变量全部清理。

运行时只写 `data-wl-ui-empty-*` 和 `--wl-ui-empty-*` 私有标记，不修改行高、列配置、
分屏比例或有数据时的 AG Grid 内部滚动。

以下区域保持原定制样式：

- `.lp-root`
- `.session-login`
- `.wl-ui-skin-exempt`
- `[data-wl-ui-skin="off"]`

## 接入

Skin 项目：

```scss
@use "@agile-team/wl-skills-ui/styles/presets/skin" as *;
```

```ts
import "@agile-team/wl-skills-ui/runtime/auto";
```

Native 项目调用一次 `installCommonPreset()`，无需重复引入 `runtime/auto`。

常规场景不需要业务代码。特殊宿主主动变更尺寸后如需立即同步，可调用：

```ts
import { refreshAgGridEmptyStateLayout } from "@agile-team/wl-skills-ui/runtime";

refreshAgGridEmptyStateLayout();
```

## 升级清理

升级后删除业务项目中针对 `.ag-overlay-no-rows-wrapper` 的固定 `top`、`height`、
`transform` 和插图缩放补丁，避免形成两套定位逻辑。不要新增业务侧 `!important` 覆盖。

## 验收

- 单层表头和分组表头的 overlay 顶部都从真实数据区开始；
- 数据区高度不低于 160px，插图、主文案、辅助说明均完整显示；
- 上下双空表出现一个分屏根滚动条，两个 pane 不互相压盖；
- 左右空表保持同高；
- overlay 中心与数据区中心误差不超过 1px；
- 数据恢复后无 `data-wl-ui-empty-*` 和最小高度残留；
- 登录页和显式豁免区域无新增标记；
- `npm test` 与 `npm run test:visual` 全部通过。
