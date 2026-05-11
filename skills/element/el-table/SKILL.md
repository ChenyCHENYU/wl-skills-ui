---
description: |
  表格组件规范 Skill — el-table / BaseTable / el-table-column 的对齐、空状态、selection 列标准。
  覆盖规则：R001 R002 R003 R014。
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
  <el-table-column align="center" prop="name" label="名称" min-width="120" />
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
