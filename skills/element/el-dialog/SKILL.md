---
description: |
  弹窗组件规范 Skill — el-dialog 内分页位置、嵌套表格操作列按钮风格标准。
  覆盖规则：R011 R015。
applyTo: "**/*.vue"
---

# 弹窗组件规范

## R011 — 分页放在内容区 【高危】

原生弹窗的 `el-pagination` 紧跟内容区的表格。底部插槽放确认和取消等操作。平台封装的分页以其组件约定为准，核对窄窗口下分页和按钮均可到达。详见[弹窗内分页](../../../standards/ui/05-dialog-pagination.md)。

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
  :close-on-press-escape="false"
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

  <div class="popup-pagination">
    <el-pagination :total="total" layout="total, prev, pager, next" />
  </div>

  <!-- Footer：操作按钮 -->
  <template #footer>
    <div class="dialog-footer">
      <div class="footer-btns">
        <el-button size="small" icon="Close" @click="visible = false">取消</el-button>
        <el-button type="primary" size="small" icon="Check" @click="handleConfirm">确定</el-button>
      </div>
    </div>
  </template>
</el-dialog>
```
