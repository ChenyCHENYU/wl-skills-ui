---
description: |
  表格组件规范 Skill — el-table / BaseTable / el-table-column 的对齐、空状态、selection 列标准。
  覆盖规则：R001 R002 R003 R014 R039。
applyTo: "**/*.vue"
---

# 表格组件规范

## R001 — el-table-column 必须 `align="center"` 【高危】

**所有列**（含 selection / index）均必须居中对齐。

```diff
- <el-table-column label="名称" prop="name">
+ <el-table-column align="center" label="名称" prop="name">

- <el-table-column type="selection" width="70" align="left">
+ <el-table-column type="selection" width="55" align="center" header-align="center" fixed="left">

- <el-table-column type="index" width="80">
+ <el-table-column type="index" align="center" width="60">
```

> ⚠️ selection 列：`width=55`，`align="center"` **且** `header-align="center"` 两者必须同时设置，缺一会导致复选框垂直错位。

---

## R002 — el-table 必须 `empty-text="暂无数据"` 【中危】

```diff
- <el-table :data="list">
+ <el-table :data="list" empty-text="暂无数据">
```

修复空状态时不要猜测固定高度；应先识别当前表格的真实内容区域（含主表、子表、弹窗表格、展开行内嵌套表格），保证空态在对应表格自身区域内水平/垂直居中，空态图标、文字比例保持同一套视觉规范。若业务页面存在树筛选、组织机构、标签页等上下文，仅在能从 DOM/文案/变量中确认存在时才补充对应提示，不要硬写“左侧选择组织机构”等不一定存在的描述。

---

## R003 — BaseTable 必须 `empty-text="暂无数据"` 【中危】

```diff
- <BaseTable :hook="page">
+ <BaseTable :hook="page" empty-text="暂无数据">
```

---

## R014 — selection 列必须 `header-align="center"` 【中危】

```diff
- <el-table-column type="selection" width="55" fixed="left" align="center">
+ <el-table-column type="selection" width="55" fixed="left" align="center" header-align="center">
```

---

## R039 — 普通数据列必须超长省略并悬停显示完整内容 【中危】

```diff
- <el-table-column prop="customerName" label="客户名称" align="center" />
+ <el-table-column prop="customerName" label="客户名称" align="center" show-overflow-tooltip />
```

BaseTable / AG Grid 使用 `defineColumns()` 后由 runtime 自动为普通文本列补齐
`showOverflowTooltip: true`。自定义渲染、结构列、换行列不强制；需要主动关闭时
显式声明 `showOverflowTooltip: false`。

Skin/历史项目还必须在启动入口引入一次
对应的 `@agile-team/wl-skills-ui/runtime/profiles/*` 入口。它为未经过 `defineColumns()` 的动态
Picker/BaseTable/AG Grid 普通文本提供真实溢出兜底；未溢出、已有 Tooltip、Tag、
操作列、编辑列、自定义 renderer 与皮肤豁免区域均不接管。局部可使用
`data-wl-ui-overflow="off"` 退出。

行 hover/selected 色由包内表格 token 统一管理，业务页面不要重写
`hover-row`、`current-row` 或直接覆盖 `td.el-table__cell` 背景，以免编辑控件、
校验态和语义单元格底色发生冲突。

---

## 完整标准写法示例

```html
<el-table :data="list" empty-text="暂无数据">
  <el-table-column
    type="selection"
    width="55"
    fixed="left"
    align="center"
    header-align="center"
  />
  <el-table-column type="index" align="center" width="60" label="序号" />
  <el-table-column
    align="center"
    prop="name"
    label="名称"
    min-width="120"
    show-overflow-tooltip
  />
  <el-table-column align="center" prop="status" label="状态" width="90">
    <template #default="{ row }">
      <!-- 使用 renderTagSlot 渲染彩色 Tag，见 tag-status/SKILL.md -->
    </template>
  </el-table-column>
</el-table>
```

---

## labelWidth 选取建议

| 最长标签字数 | 建议 labelWidth             |
| ------------ | --------------------------- |
| ≤ 5 字       | `100px`                     |
| 6~7 字       | `120px`                     |
| 8~9 字       | `150px`（**推荐统一值**）   |
| ≥ 10 字      | `180px`（特殊表单单独处理） |
