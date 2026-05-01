# 规范 04：状态标签（Tag / Status）

## 基础颜色语义

| type      | 颜色    | 适用语义                          |
|-----------|--------|----------------------------------|
| `success` | 绿色   | 已完成、启用、已核实、已审批、正常   |
| `warning` | 橙色   | 临时、待处理、审批中、未完成        |
| `danger`  | 红色   | 停用、驳回、作废、超期              |
| `info`    | 灰色   | 未处理、未提交、初始状态            |
| `''`      | 蓝色   | 一般状态、默认                     |

---

## 渲染模式（推荐）

```typescript
// ✅ 文件顶部定义映射表 + 渲染函数
import { h } from 'vue'
import { ElTag } from 'element-plus'

const STATUS_TAG_MAP: Record<string, { label: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  '0': { label: '停用', type: 'danger' },
  '1': { label: '启用', type: 'success' },
}

function renderStatusTag(val: string) {
  const cfg = STATUS_TAG_MAP[String(val)]
  // 注意：type 可能为空字符串，需用 undefined 判断
  if (cfg === undefined) return ''
  return h(ElTag, { type: cfg.type || undefined }, { default: () => cfg.label })
}
```

### 在 defineColumns 中使用

```typescript
{ field: 'enableStatus', headerName: '启用状态', pinned: 'right', defaultSlot: renderStatusTag }
```

### 在 el-table-column 中使用

```vue
<el-table-column label="状态" align="center" fixed="right">
  <template #default="{ row }">
    <el-tag :type="STATUS_TAG_MAP[row.status]?.type">
      {{ STATUS_TAG_MAP[row.status]?.label }}
    </el-tag>
  </template>
</el-table-column>
```

---

## 分级标签（renderClassifyTag）

用于隐患级别、检查级别等分级数据：

```typescript
import { renderClassifyTag } from '@/components/ag-cell-renders'

const LEVEL_MAP = {
  '1': { label: '一般', type: 'info' },
  '2': { label: '较大', type: 'warning' },
  '3': { label: '重大', type: 'danger' },
}

// defineColumns 中
{ field: 'checkLevel', headerName: '隐患级别', defaultSlot: (val) => renderClassifyTag(val, LEVEL_MAP) }
```

---

## 状态列固定右侧

所有状态类列（启用/停用、审批状态、核实状态等）**必须** `fixed="right"` / `pinned: 'right'`：

```vue
<!-- el-table -->
<el-table-column label="启用状态" align="center" fixed="right" width="90">

<!-- defineColumns -->
{ field: 'enableStatus', headerName: '启用状态', pinned: 'right', width: 90 }
```

---

## 常见状态枚举参考

```typescript
// 审批状态
const APPROVAL_STATUS_MAP = {
  '0': { label: '未提交', type: 'info' },
  '1': { label: '审批中', type: 'warning' },
  '2': { label: '已审批', type: 'success' },
  '3': { label: '已驳回', type: 'danger' },
}

// 核实状态
const VERIFY_STATUS_MAP = {
  '0': { label: '未核实', type: 'info' },
  '1': { label: '已核实', type: 'success' },
}

// 启用状态
const ENABLE_STATUS_MAP = {
  '0': { label: '停用', type: 'danger' },
  '1': { label: '启用', type: 'success' },
}
```
