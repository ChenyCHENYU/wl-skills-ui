# 复合控件结构契约

## 目标

复合控件经常同时包含 Element Plus 外壳、内部输入编辑器、标签容器以及 Teleport
弹层。普通 `.el-input` / `.el-input__wrapper` 选择器无法判断谁负责边框和高度，直接扩大
覆盖会导致固定高度裁切、边框消失或双描边。

`standards/component-structures.json` 是这类结构的单一事实源。它不修改 common-core，
只记录 wl-skills-ui 已核对和允许治理的 DOM 契约。

## 每项必须声明

- `rootSelector`：组件结构边界。
- `ownerSelector`：唯一负责默认、hover、focus、error、disabled 边框的节点。
- `innerBorderlessSelectors`：必须保持无描边的内部编辑器。
- `heightPolicy`：固定单行高度、最小高度自然增长或内容驱动。
- `states`：必须回归的交互状态。
- `portalSelectors`：下拉、Tooltip、Dialog 等 Teleport 出口；没有则可省略。
- `fixture`：从真实 DOM 最小化得到的结构样本。
- `knownRootClasses`：供 R040 识别已登记结构。

## 新复合控件准入流程

1. 在浏览器中复制真实 DOM，确认 Element Plus / jh-ui / common-core 版本。
2. 提取最小 fixture，保留会影响选择器匹配的 class、父子层级和 Teleport 出口。
3. 在 `standards/component-structures.json` 登记边框所有者、高度策略与状态。
4. 运行 `pnpm test`；结构测试会校验 selector 唯一命中和 fixture 完整性。
5. 只为已登记结构增加精准 SCSS，并在 `tests/visual` 补充状态断言或截图。
6. 运行 `pnpm release:check` 后方可发布。

R040 只做审查提示，不自动改业务代码。已登记根类不会重复报告；发现疑似未知复合
wrapper 时，应先按上述流程确认，不能直接扩大全局 Element 选择器。

## 当前首批结构

- common-core 多标签输入与人员选择多选。
- 部门选择、树选择和 Element 多选封装。
- 同节点 wrapper + 子 wrapper 的混合数字输入。
- BaseToolbar 分裂按钮及其动作菜单 Teleport 出口。

组件结构变化时，测试会先在 fixture/selector 契约处失败，从而把风险阻断在发版前，
不会等十余个业务项目升级后再发现。
