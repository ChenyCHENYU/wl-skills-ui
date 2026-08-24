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

**例外**：内容为长文本描述（如“备注”、“标准内容”）的列可使用 `align="left"`，但需显式标注，不可省略。

BaseTable / AG Grid 推荐统一通过 `defineColumns()`：未声明时默认让叶子列和分组表头居中，
显式 left/right 或动态 `cellStyle.textAlign` 优先，传 `{ defaultAlign: null }` 可退出。
runtime 会把对齐桥接为共享 AG Grid 适配层可执行的 `cellStyle/cellClass/headerClass`，
并合并已有业务 class；Element Table 的显式 `is-center` 同时统一文本轴与 flex 轴。

表格进入编辑态时，仅 `.editable-cell` / `.always-editable-cell` / `.ag-cell-inline-editing` 退出普通文本单元格的左右 padding，让 editor 使用完整单元格宽度；非编辑列仍保留标准留白。

---

## 规则 R002：el-table 必须设置 empty-text

```vue
<!-- ❌ 错误：缺少 empty-text -->
<el-table :data="list">

<!-- ✅ 正确 -->
<el-table :data="list" empty-text="暂无数据">
```

---

## 规则 R039：长文本统一省略并悬停显示完整内容

原生 Element Plus 普通数据列必须声明 `show-overflow-tooltip`：

```vue
<el-table-column
  prop="customerName"
  label="客户名称"
  min-width="160"
  align="center"
  show-overflow-tooltip
/>
```

BaseTable / AG Grid 仍推荐通过 `defineColumns()` 声明，普通文本列会自动补
`showOverflowTooltip: true` 并优先使用平台原生 Tooltip。对于动态 Picker 或未经过
`defineColumns()` 的历史列，项目启动入口必须安装 `runtime/auto` 包级保护；其仅在
真实溢出时提供兜底。自定义渲染列、selection/index/expand、`wrapText`、`autoHeight`、
Tag、编辑列和操作列不会被强制。局部可用 `data-wl-ui-overflow="off"` 显式退出。

---

## 行悬停与选中状态

- hover 使用客户品牌色 4% 透明度，只提示当前位置，不形成整条亮蓝色块。
- selected 使用客户品牌色 7% 透明度，并始终优先于 hover。
- 状态色只作用于数据行背景，不覆盖编辑输入框、校验态、Tag 和业务语义单元格底色。
- 不在业务页面重写 `.ag-row-hover`、`.ag-row-selected`、`hover-row` 或
  `current-row`；Element Table 与 AG Grid 均由化妆包统一管控。

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
