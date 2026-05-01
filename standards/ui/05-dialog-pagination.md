# 规范 05：弹窗内分页（Dialog + Pagination）

## 核心原则

**分页必须放在内容区（content area），不得放在 `#footer` 插槽中。**

原因：`el-pagination` 组件内部有 fixed/absolute 定位逻辑，放入 `#footer` 后会逃出弹窗容器，导致分页漂浮在页面底部。

---

## 正确布局（SelectPopupCom 标准）

```vue
<el-dialog v-model="visible" width="80%" title="选择">
  <el-row :gutter="8">
    <!-- 主内容区：表格 + 分页 -->
    <el-col :span="18">
      <!-- 搜索区 -->
      <div class="search-bar">...</div>

      <!-- 表格 -->
      <el-table :data="tableData" empty-text="暂无数据">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column type="index" label="序号" width="60" align="center" />
        <!-- 数据列 -->
      </el-table>

      <!-- ✅ 分页：放在内容区，右对齐 -->
      <div class="popup-pagination">
        <el-pagination
          v-model:current-page="page.current"
          v-model:page-size="page.size"
          :total="page.total"
          layout="total, prev, pager, next"
          background
          small
        />
      </div>
    </el-col>

    <!-- 已选项区 -->
    <el-col :span="6">
      <div class="selected-panel">...</div>
    </el-col>
  </el-row>

  <!-- ✅ footer：只放操作按钮，不放分页 -->
  <template #footer>
    <div class="dialog-footer">
      <el-button @click="handleClose">取 消</el-button>
      <el-button type="primary" @click="handleConfirm">确 认</el-button>
    </div>
  </template>
</el-dialog>
```

---

## 必要 CSS

```scss
// 分页右对齐
.popup-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

// footer 按钮右对齐（全局已有，参考 dist/style-override.scss）
.el-dialog__footer .dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

---

## 规则 R011（scanner 检测）

scanner 会扫描 `#footer` 插槽中是否包含 `el-pagination`，若有则报 **error** 级别警告：

```
R011 [error] el-pagination 位于 #footer 插槽中 — 请移至内容区域
```

修复方法：将 `<el-pagination>` 从 `<template #footer>` 中移出，放入 `el-col` 内容区，包裹在 `<div class="popup-pagination">` 中。

---

## 分页常用配置

```vue
<!-- 标准小型分页（弹窗内） -->
<el-pagination
  v-model:current-page="page.current"
  v-model:page-size="page.size"
  :total="page.total"
  :page-sizes="[10, 20, 50]"
  layout="total, sizes, prev, pager, next"
  background
  small
  @size-change="handleSizeChange"
  @current-change="handlePageChange"
/>

<!-- 标准普通分页（列表页底部） -->
<el-pagination
  v-model:current-page="page.current"
  v-model:page-size="page.size"
  :total="page.total"
  :page-sizes="[20, 50, 100]"
  layout="total, sizes, prev, pager, next, jumper"
  background
  @size-change="handleSizeChange"
  @current-change="handlePageChange"
/>
```
