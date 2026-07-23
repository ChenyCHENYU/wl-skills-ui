# 规范 02：按钮

## 工具栏按钮（列表页顶部）

工具栏必须独占一行，放在列表标题上方、表格上方并左对齐；不得与标题/条数统计挤在同一行。标准顺序为“查询区 → 工具栏 → 列表标题 → 表格 → 分页器”。

### 顺序规则

1. **新增/新增申请**类按钮永远排第一
2. 其余按钮按照操作频次降序排列

### 类型规则

主按钮色值严格遵循客户 UI 规范，禁止使用 `#2254F4`、`#4368FF` 或 Element Plus 默认蓝替代：

| 状态          | Token                        | 规范色值  |
| ------------- | ---------------------------- | --------- |
| 常规          | `--el-color-primary`         | `#002A8F` |
| hover / focus | `--el-color-primary-light-1` | `#1A3F9A` |
| active / 点击 | `--el-color-primary-dark-1`  | `#002681` |
| disabled      | `--el-color-primary-light-7` | `#B2BFDD` |

平台动态主题不得改写品牌按钮体系。包内 L0 token 使用 `!important`，runtime 主题锁负责恢复后续写入 `document.body.style` 的旧主色及功能色；业务页面不要再用局部选择器与主题锁对冲。

| 操作语义       | type      | plain | 说明                     |
| -------------- | --------- | ----- | ------------------------ |
| 新增/添加      | `primary` | false | 蓝色填充                 |
| 保存           | `success` | false | 绿色填充                 |
| 下达/提交/确认 | `primary` | false | 当前流程的主动作         |
| 修改/调整/变更 | `warning` | true  | 橙色轻色面               |
| 导入/导出/查询 | `default` | true  | 中性线框                 |
| 删除/作废      | `danger`  | false | 红色填充（批量操作慎用） |
| 重置/取消      | `default` | true  | 默认灰色线框             |

同一按钮组超过 4 个动作时，只允许当前主动作和破坏性动作使用实心按钮；其余语义按钮使用 `plain` 轻色面。每个按钮必须有与动作一致的图标，未知业务动作不得回退为“无图标的 primary”。

```vue
<!-- ✅ 工具栏按钮组 -->
<el-button type="primary" @click="handleCreate">新增</el-button>
<el-button type="warning" plain icon="Edit" @click="handleEdit">修改</el-button>
<el-button type="success" icon="Save" @click="handleSave">保存</el-button>
<el-button icon="Download" @click="handleExport">导出</el-button>
```

---

## 操作列按钮（表格行内）

统一使用 `renderOps` 图标按钮系统，**禁止** `<el-button>` 在行内使用：

```typescript
// ✅ 正确
renderOps([
  { type: "edit", onClick: () => handleEdit(row) },
  { type: "del", onClick: () => handleVoid(row) },
]);
```

### 视觉状态

| 状态     | 标准表现                                             |
| -------- | ---------------------------------------------------- |
| 默认可用 | 柔和主题蓝，透明背景                                 |
| hover    | 查看/记录/提交变主题蓝，编辑/审核变绿，删除/作废变红 |
| 禁用     | 浅灰且 hover 不变色，使用原生 `disabled`             |
| 选中行   | 保持默认主题蓝，不因选中自动变为语义色               |

### 按钮标签严格对应原型

| 操作     | 正确标签 | 禁止替换为 |
| -------- | -------- | ---------- |
| 修改记录 | **修改** | ~~编辑~~   |
| 软删除   | **作废** | ~~删除~~   |
| 硬删除   | **删除** | ~~移除~~   |

### 条件显示

```typescript
renderOps([
  { type: "del", show: () => canDelete, onClick: () => handleDelete(row) },
  { type: "edit", show: () => canEdit, onClick: () => handleEdit(row) },
]);
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
