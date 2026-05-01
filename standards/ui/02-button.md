# 规范 02：按钮

## 工具栏按钮（列表页顶部）

### 顺序规则
1. **新增/新增申请**类按钮永远排第一
2. 其余按钮按照操作频次降序排列

### 类型规则

| 操作语义   | type        | plain  | 说明           |
|----------|-------------|--------|----------------|
| 新增/添加 | `primary`   | false  | 蓝色填充        |
| 导入      | `primary`   | true   | 蓝色线框        |
| 导出      | `success`   | true   | 绿色线框        |
| 删除/作废 | `danger`    | false  | 红色填充（批量操作慎用）|
| 审批/提交 | `primary`   | false  | 蓝色填充        |
| 重置/取消 | `default`   | false  | 默认灰色        |

```vue
<!-- ✅ 工具栏按钮组 -->
<el-button type="primary" @click="handleCreate">新增</el-button>
<el-button type="primary" plain @click="handleImport">导入</el-button>
<el-button type="success" plain @click="handleExport">导出</el-button>
```

---

## 操作列按钮（表格行内）

使用 `jh-op-btn` 类，**禁止** `<el-button>` 在行内使用：

```vue
<!-- ❌ 错误 -->
<el-button type="text" @click="handleEdit(row)">编辑</el-button>

<!-- ✅ 正确 -->
<span class="jh-op-btn primary" @click="handleEdit(row)">修改</span>
<span class="jh-op-btn danger"  @click="handleVoid(row)">作废</span>
```

### 按钮标签严格对应原型

| 操作    | 正确标签 | 禁止替换为 |
|--------|---------|----------|
| 修改记录 | **修改** | ~~编辑~~ |
| 软删除  | **作废** | ~~删除~~ |
| 硬删除  | **删除** | ~~移除~~ |

### 条件显示（不同状态不同按钮）

```typescript
// ✅ renderOps 中用 show 控制
renderOps(p, [
  { label: '修改', type: 'primary', show: (row) => row.status === 1 },
  { label: '作废', type: 'danger',  show: (row) => row.status === 1 },
  { label: '编辑', type: 'primary', show: (row) => row.status === 0 },
  { label: '删除', type: 'danger',  show: (row) => row.status === 0 },
])
```

---

## 弹窗底部按钮（对话框）

```vue
<!-- ✅ 标准：取消在左，确认在右；footer 右对齐 -->
<template #footer>
  <div class="dialog-footer">
    <el-button @click="handleClose">取 消</el-button>
    <el-button type="primary" @click="handleConfirm">确 认</el-button>
  </div>
</template>
```

CSS 全局保证 footer 右对齐（已在 `dist/style-override.scss` 中定义）：
```scss
.el-dialog__footer .dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```
