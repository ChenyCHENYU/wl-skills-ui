---
description: |
  列表页骨架 Skill — 检测/对齐 .list-page 标准布局（搜索区 + 工具栏 + 表格 + 分页），
  适用于 Native 模式新项目；同时提供 AI 修复指引。
applyTo: "**/*.vue"
---

# layouts/list-page SKILL

## 适用场景

页面结构为：**搜索栏 → 工具栏（增删按钮） → 数据表格 → 分页器** 的经典 CRUD 列表页。

---

## Detect — 识别列表页

### 方式一：结构特征识别
```
检测条件（满足任意 2 项即判定为列表页）：
✓ 根节点或第一子节点含 class="list-page" / "page-wrapper" / "table-page"
✓ 存在 <BaseTable> 或 <el-table>
✓ 存在 <BaseQuery> 或包含搜索条件的 el-form
✓ 存在 <jh-pagination> 或 <el-pagination>
✓ 存在工具栏区域（包含"新增"按钮的 el-row / div.toolbar）
```

### 方式二：命令触发
```
用 wl-ui 的 layouts/list-page skill 检查这个文件
→ AI 加载本 SKILL.md，对当前文件做 Detect → Diagnose → Repair
```

---

## Diagnose — 诊断问题

### 结构层问题

| 问题 | 规则 | 说明 |
|---|---|---|
| 根节点缺少 `.list-page` | L-001 | 应为 `<div class="list-page">` |
| 搜索区未用 `.list-page__query` | L-002 | 内部结构应遵循 BEM |
| 工具栏未用 `.list-page__toolbar` | L-003 | 按钮组应在 `.list-page__toolbar` 内 |
| 表格区未用 `.list-page__table` | L-004 | 表格容器应有独立 class |
| 分页区未用 `.list-page__pagination` | L-005 | 分页器位置需在 **内容区**，不得在 dialog footer |

### 内容层问题（复用 scanner 规则）

- R001 ~ R003：表格列对齐 + empty-text
- R005：工具栏按钮缺 icon
- R006：搜索区输入框缺 `size="small"`
- R011：分页在 footer 内（严重）

---

## Repair — 修复指引

### 标准结构

```vue
<template>
  <div class="list-page">
    <!-- 搜索区 -->
    <div class="list-page__query">
      <BaseQuery :params="searchParams" @search="reload" @reset="reset" />
    </div>

    <!-- 工具栏 -->
    <div class="list-page__toolbar">
      <el-button type="primary" icon="Plus" @click="modal.add()">新增</el-button>
      <el-button icon="Download" @click="handleExport">导出</el-button>
    </div>

    <!-- 表格 -->
    <div class="list-page__table">
      <BaseTable :hook="page" empty-text="暂无数据" :columns="columns" />
    </div>

    <!-- 分页 -->
    <div class="list-page__pagination">
      <jh-pagination :hook="page" />
    </div>
  </div>
</template>
```

### SCSS 对应（由 styles/layouts/_list-page.scss 提供）

```scss
// 业务侧无需手写，全局 @use 后自动生效
// 如需定制，在组件 <style scoped> 内覆盖：
.list-page {
  // 自定义
}
```

### 使用脚手架

```bash
# 直接在编辑器让 AI：
# 按 wl-ui 的 templates/list-page/TPL-LIST.md 创建该页面
```

---

## 关联资源

- 样式实现：[styles/layouts/_list-page.scss](../../../styles/layouts/_list-page.scss)
- 代码模板：[templates/list-page/TPL-LIST.md](../../../templates/list-page/TPL-LIST.md)
- 相关 skills：[vendors/base-table](../../vendors/base-table/SKILL.md) | [vendors/jh-components](../../vendors/jh-components/SKILL.md)
