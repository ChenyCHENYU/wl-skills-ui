---
description: |
  左树右表骨架 Skill — 检测/对齐 .tree-list 双栏布局（左侧分类树 + 右侧数据列表），
  含 jh-drag-col 拖拽分割条处理；适用于组织/分类驱动的管理页面。
applyTo: "**/*.vue"
---

# layouts/tree-list SKILL

## 适用场景

页面结构为：**左侧分类/组织树 + 右侧数据列表（含搜索 + 表格 + 分页）** 的双栏页面。

---

## Detect — 识别左树右表页

```
检测条件（满足任意 2 项即判定）：
✓ 页面存在并排的 el-tree 或 jh-tree
✓ 存在 jh-drag-col（拖拽分割条）
✓ 根节点含 class="tree-list" / "tree-page" / "left-tree-right-table"
✓ 布局中有宽度约 240px 的左侧容器 + 弹性宽度的右侧容器
✓ 存在 @node-click / @current-change 事件绑定
```

---

## Diagnose — 诊断问题

| 问题 | 规则 | 说明 |
|---|---|---|
| 根节点缺少 `.tree-list` | L-101 | 应为 `<div class="tree-list">` |
| 左侧区未用 `.tree-list__aside` | L-102 | 树容器应有独立 class |
| 右侧区未用 `.tree-list__main` | L-103 | 右侧内容区应有独立 class |
| 缺少 `jh-drag-col` 分割条 | L-104 | 应支持拖拽调整左右宽度 |
| 树节点点击后未触发右侧列表刷新 | L-105 | `@node-click` 应调用 `reload()` 并传入分类参数 |
| 左侧树无搜索/过滤 | L-106 | 数据量大时应加 `filter-node-method` |

---

## Repair — 修复指引

### 标准结构

```vue
<template>
  <div class="tree-list">
    <!-- 左侧树 -->
    <div class="tree-list__aside" :style="{ width: treeWidth + 'px' }">
      <el-tree
        :data="treeData"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        highlight-current
        @node-click="handleNodeClick"
      />
    </div>

    <!-- 拖拽分割条 -->
    <jh-drag-col v-model="treeWidth" :min="180" :max="360" />

    <!-- 右侧内容 -->
    <div class="tree-list__main">
      <!-- 复用 list-page 结构（搜索 + 工具栏 + 表格 + 分页） -->
      <div class="list-page">
        <div class="list-page__query"> ... </div>
        <div class="list-page__toolbar"> ... </div>
        <div class="list-page__table">
          <BaseTable :hook="page" empty-text="暂无数据" :columns="columns" />
        </div>
        <div class="list-page__pagination">
          <jh-pagination :hook="page" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const treeWidth = ref(240);

function handleNodeClick(node) {
  searchParams.value.classifyId = node.id;
  page.reload();
}
</script>
```

### SCSS 对应

```scss
// styles/layouts/_tree-list.scss 已提供基础骨架
// 业务侧如需定制左侧宽度：
.tree-list__aside {
  min-width: 180px;
  max-width: 400px;
}
```

---

## 关联资源

- 样式实现：[styles/layouts/_tree-list.scss](../../../styles/layouts/_tree-list.scss)
- 拖拽列样式：[styles/vendors/_jh-drag-col.scss](../../../styles/vendors/_jh-drag-col.scss)
- 代码模板：[templates/tree-list/TPL-TREE-LIST.md](../../../templates/tree-list/TPL-TREE-LIST.md)
- 相关 skills：[layouts/list-page](../list-page/SKILL.md) | [vendors/jh-components](../../vendors/jh-components/SKILL.md)
