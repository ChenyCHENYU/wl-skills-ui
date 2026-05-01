# 规范 01：表格列（el-table-column / ag-grid）

## 适用组件
- `<el-table-column>` (Element Plus)
- AG Grid 列定义（`defineColumns` + `COLUMN_AUTO_MAP`）

---

## 规则 R001：所有列必须居中对齐

```vue
<!-- ❌ 错误：缺少 align -->
<el-table-column label="状态" prop="status" />

<!-- ✅ 正确 -->
<el-table-column label="状态" prop="status" align="center" />
```

**例外**：内容为长文本描述（如"备注"、"标准内容"）的列可使用 `align="left"`，但需显式标注，不可省略。

---

## 规则 R002：el-table 必须设置 empty-text

```vue
<!-- ❌ 错误：缺少 empty-text -->
<el-table :data="list">

<!-- ✅ 正确 -->
<el-table :data="list" empty-text="暂无数据">
```

---

## 规则 R004：操作列使用 renderOps / jh-op-btn

操作列按钮**不得**直接使用 `<el-button>` 或裸文本，必须通过 `renderOps` 渲染：

```typescript
// ✅ AG Grid defineColumns 方式
import { renderOps } from '@/components/ag-cell-renders'

defineColumns([
  // ...
  {
    field: 'ops',
    headerName: '操作',
    cellRenderer: (p) => renderOps(p, [
      { label: '修改', type: 'primary', show: (row) => row.status === 1 },
      { label: '作废', type: 'danger',  show: (row) => row.status === 1 },
      { label: '删除', type: 'danger',  show: (row) => row.status === 0 },
    ]),
  },
])
```

```vue
<!-- ✅ el-table 方式 -->
<el-table-column label="操作" align="center" width="120">
  <template #default="{ row }">
    <span class="jh-op-btn primary" @click="handleEdit(row)">修改</span>
    <span class="jh-op-btn danger"  @click="handleVoid(row)" v-if="row.status === 1">作废</span>
  </template>
</el-table-column>
```

---

## 规则 R009：选择列宽度标准

| 列类型        | 宽度     |
|-------------|----------|
| 序号列 (index) | 60px    |
| 多选列 (selection) | 55px |
| 普通固定列   | 按内容估算，最小 80px |

---

## 状态列固定右侧 + 色块渲染

```typescript
// ✅ 状态映射 + 渲染函数（文件顶部定义）
const STATUS_TAG_MAP: Record<string, { label: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  '0': { label: '停用', type: 'danger' },
  '1': { label: '启用', type: 'success' },
}

function renderStatusTag(val: string) {
  const cfg = STATUS_TAG_MAP[val]
  if (!cfg) return ''
  return h(ElTag, { type: cfg.type }, { default: () => cfg.label })
}
```

```typescript
// ✅ defineColumns 中引用
{ field: 'enableStatus', headerName: '启用状态', pinned: 'right', defaultSlot: renderStatusTag }
```

---

## COLUMN_AUTO_MAP 自动配置

`defineColumns` 会根据 `COLUMN_AUTO_MAP` 自动为以下字段设置标准格式：

| field 包含关键字 | 自动效果 |
|----------------|---------|
| `checkNo`      | renderBadge 徽章渲染 |
| `level`, `classify` | renderClassifyTag 分级渲染 |
| `status`       | 提示需自定义 renderStatusTag |
| `createTime`, `updateTime` | 宽度 160px |
