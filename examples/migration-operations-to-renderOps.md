# operations → defaultSlot(renderOps) 迁移指南

## 背景

老项目中 BaseTable 的操作列通常使用 `operations: [...]` 格式，渲染为文字按钮。
统一 UI 风格后，操作列改用 `defaultSlot: ({ row }) => renderOps([...])` 格式，渲染为图标按钮组。

## 迁移前（旧格式）

```ts
const columnsDef = [
  { label: "名称", name: "name" },
  { label: "状态", name: "enableStatus" },
  {
    label: "操作",
    width: 180,
    fixed: "right",
    operations: [
      { name: "查看", click: (row) => handleView(row) },
      { name: "编辑", click: (row) => handleEdit(row), show: (row) => row.enableStatus === 1 },
      { name: "删除", click: (row) => handleDel(row), type: "danger" },
    ],
  },
];
```

## 迁移后（新格式）

```ts
import { renderOps } from "@agile-team/wl-skills-ui/runtime";

const columnsDef = [
  { label: "名称", name: "name" },
  { label: "状态", name: "enableStatus" },
  {
    label: "操作",
    width: 140,
    fixed: "right",
    defaultSlot: ({ row }) =>
      renderOps([
        { type: "view", onClick: () => handleView(row) },
        { type: "edit", onClick: () => handleEdit(row), show: row.enableStatus === 1 },
        { type: "del", onClick: () => handleDel(row) },
      ]),
  },
];
```

## 映射关系

| 旧 operations 字段 | 新 renderOps 字段 | 说明 |
|---|---|---|
| `name: "查看"` | `type: "view"` | 预设图标按钮，自带 title |
| `name: "编辑"` | `type: "edit"` | 预设图标按钮 |
| `name: "删除"` | `type: "del"` | 预设图标按钮（红色） |
| `click: fn` | `onClick: fn` | 回调函数 |
| `show: fn/bool` | `show: fn/bool` | 控制显隐 |
| `type: "danger"` | _(由 type 决定)_ | del 自动红色 |
| 自定义文字 | `type: "chip"` 或 `type: "link"` | 胶囊/文字按钮 |

## 预设图标类型

| type | 图标 | 标题 | 颜色 |
|---|---|---|---|
| `view` | Eye (View) | 查看 | 蓝色 |
| `edit` | Edit | 编辑 | 绿色 |
| `del` | Delete | 删除 | 红色 |
| `log` | Document | 记录 | 灰色 |
| `ok` | CircleCheck | 审核 | 绿色 |
| `send` | Upload | 提交 | 蓝色 |

## 非预设操作（胶囊/文字）

```ts
renderOps([
  { type: "view", onClick: () => handleView(row) },
  // 胶囊按钮（图标 + 文字）
  { type: "chip", label: "下载", icon: Download, onClick: () => handleDownload(row) },
  // 纯文字链接
  { type: "link", label: "详情", onClick: () => handleDetail(row) },
])
```

## defaultNode vs defaultSlot

| 属性 | 返回类型 | 使用场景 |
|---|---|---|
| `defaultNode` | `JhTagNode` 对象 | 状态标签（jh-tag 组件格式） |
| `defaultSlot` | `VNode` | 自定义渲染（操作列、徽标、复杂布局） |

- 状态字段用 `defaultNode` + `renderTagNode()`
- 操作列用 `defaultSlot` + `renderOps()`
- 徽标/评级用 `defaultSlot` + `renderBadge()` / `renderRatingLevel()`

## 批量迁移

Scanner 规则 R013 会自动检测旧格式 `operations: [...]`。

```bash
# 扫描所有旧格式
npx wl-scan scan --target src --layer L4

# 查看影响文件
npx wl-scan scan --target src --output json | jq '.issues[] | select(.rule == "R013") | .file'
```

> 注意：operations → renderOps 不可自动修复，需要人工确认每个操作的图标类型和回调。
