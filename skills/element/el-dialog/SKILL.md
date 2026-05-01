---
description: |
  弹窗组件规范 Skill — el-dialog 内分页位置、嵌套表格操作列按钮风格标准。
  覆盖规则：R011 R015。
applyTo: "**/*.vue"
---

# 弹窗组件规范

## R011 — 分页器必须放在 `<template #footer>` 中 【高危】

弹窗内的 `el-pagination` 必须在 `#footer` slot 内，不得放在内容区（会导致布局溢出）。

```diff
<el-dialog v-model="visible" title="选择记录">
  <el-table :data="list" empty-text="暂无数据">
    <!-- 表格内容 -->
  </el-table>
- <el-pagination ... />

+ <template #footer>
+   <div class="dialog-footer-pagination">
+     <el-pagination
+       v-model:current-page="page.current"
+       v-model:page-size="page.size"
+       :total="page.total"
+       layout="total, sizes, prev, pager, next"
+     />
+   </div>
+ </template>
</el-dialog>
```

---

## R015 — 弹窗嵌套表格操作列必须用 `jh-op-btn` 图标按钮 【高危】

弹窗内 `el-table` 的操作列**不得使用 `el-button link`**，必须与主列表操作列风格一致。

```diff
<!-- ❌ 旧写法 -->
<el-table-column label="操作" width="120">
  <template #default="{ row, $index }">
    <el-button size="small" link type="danger"
      @click="handleDeleteItem(row, $index)">删除</el-button>
    <el-button size="small" link type="primary"
      @click="handleViewItem(row)">查看</el-button>
  </template>
</el-table-column>

<!-- ✅ 新写法 -->
<el-table-column label="操作" width="100" align="center">
  <template #default="{ row, $index }">
    <button class="jh-op-btn jh-op-view" type="button" title="查看"
      @click.stop="handleViewItem(row)">
      <el-icon><View /></el-icon>
    </button>
    <button class="jh-op-btn jh-op-del" type="button" title="删除"
      :disabled="optr === 'view'"
      @click.stop="handleDeleteItem(row, $index)">
      <el-icon><Delete /></el-icon>
    </button>
  </template>
</el-table-column>
```

或使用 `renderOps` 更简洁：

```typescript
{ label: '操作', width: 100, align: 'center',
  defaultSlot: ({ row, $index }) => renderOps([
    { type: 'view', onClick: () => handleViewItem(row) },
    { type: 'del',  show: optr.value !== 'view', onClick: () => handleDeleteItem(row, $index) },
  ])
}
```

---

## 支持的图标类型

| CSS 类       | 图标   | 适用场景  |
| ------------ | ------ | --------- |
| `jh-op-del`  | Delete | 删除/移除 |
| `jh-op-view` | View   | 查看/详情 |
| `jh-op-edit` | Edit   | 编辑/修改 |

---

## 弹窗标准结构

```html
<el-dialog
  v-model="visible"
  title="选择记录"
  width="900px"
  :close-on-click-modal="false"
>
  <!-- 搜索区（可选） -->
  <div class="search-bar">...</div>

  <!-- 表格 -->
  <el-table :data="list" empty-text="暂无数据" height="400">
    <el-table-column
      type="selection"
      width="55"
      align="center"
      header-align="center"
    />
    ...列定义...
  </el-table>

  <!-- Footer：分页 + 操作按钮 -->
  <template #footer>
    <div class="dialog-footer">
      <el-pagination ... />
      <div class="footer-btns">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </div>
  </template>
</el-dialog>
```
