# 表格长文本包级兜底机制

## 目标

凡完整接入 `@agile-team/wl-skills-ui` 的普通 Element Table、BaseTable 与 AG Grid，普通文本单元格在空间不足时统一单行省略；鼠标悬停或键盘聚焦后显示完整文本。业务页面不需要逐列补丁，也不依赖列定义是否经过 `defineColumns()`。

该能力只治理普通文本。Tag、操作按钮、编辑控件、复选框、自定义 renderer 和主动换行内容保留业务组件自身行为。

## 接入

Native 项目调用 `installCommonPreset()` 时会自动安装包级保护：

```ts
import { installCommonPreset } from "@agile-team/wl-skills-ui/runtime/common-preset";

installCommonPreset();
```

老项目应按真实表格 adapter 引入一次显式 Profile：

```ts
// Base/jh + Element Table
import "@agile-team/wl-skills-ui/runtime/profiles/legacy-jh-element";

// 只有项目确实使用 AG Grid 时改为：
// import "@agile-team/wl-skills-ui/runtime/profiles/legacy-jh-ag";
// 平台子应用（native 运行时 + jh/Base 封装 + 联邦 AG Grid）使用：
// import "@agile-team/wl-skills-ui/runtime/profiles/native-jh-ag";
```

不要同时重复调用 `installCommonPreset()` 和引入 Profile。内部安装函数具备幂等保护，但项目应保留单一、清晰的启动入口。`runtime/auto` 仅供尚未迁移的 full legacy 项目兼容，不应作为新接入默认值。

## 工作机制

1. 样式层只对没有子元素的普通纯文本单元格修正单行省略，解决 AG Grid 同一节点同时为 flex 容器时省略号不绘制的问题。
2. Runtime 在 `document` 上使用事件委托，不扫描整页，也不使用 `MutationObserver` 监听表格结构。
3. 用户悬停或键盘聚焦后才计算 `scrollWidth > clientWidth`；没有真实溢出时不创建 Tooltip。
4. Element/AG Grid 已有 Tooltip、`title` 或 `aria-describedby` 时由原组件优先处理，兜底不会重复弹出。
5. 动态行、Picker 与虚拟滚动复用相同事件入口，新插入的单元格不需要重新注册。

## 防污染边界

以下内容默认排除：

- `.editable-cell`、`.always-editable-cell`、`.ag-cell-inline-editing` 等编辑单元格；
- `.operations-cell`、`.default-slot-cell`、`.ag-cell-wrap-text`；
- input、textarea、select、button、Tag、Link、Checkbox、Radio、Switch、日期和数字输入；
- Element Table 已带 `.el-tooltip` 的原生溢出提示列；
- `.lp-root`、`.session-login`、`.wl-ui-skin-exempt`、`data-wl-ui-skin="off"` 定制区域。

局部显式退出：

```html
<div data-wl-ui-overflow="off">保持业务自身长文本行为</div>
```

自定义纯文本 renderer 确认需要包级提示时，可在实际文本单元格上标记：

```html
<div data-wl-ui-overflow="on">自定义但仍按普通文本处理</div>
```

## 验收

- 短文本：无省略号、无兜底 Tooltip。
- 长文本：单行省略，悬停或键盘聚焦显示完整内容。
- 选中行/hover 行：省略和 Tooltip 不受行状态底色影响。
- 动态/虚拟行：滚动复用 DOM 后仍然有效。
- 操作列、Tag、编辑态、自定义 renderer：布局与交互保持原样。
- 登录页和显式豁免区域：不增加任何长文本接管行为。

自动回归测试位于 `scanner/__tests__/overflow-tooltip.test.mjs`；发布前 `npm run verify` 会同时执行 DOM 行为、SCSS 实际编译、构建与包导出检查。
