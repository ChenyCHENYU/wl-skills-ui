---
description: |
  AG Grid 列渲染规范 Skill — 使用 defineColumns + renderOps + renderTagNode 等运行时函数
  实现 AG Grid 表格列的自动化配置、状态彩色 Tag、操作列图标按钮。
applyTo: "**/*.{ts,vue}"
---

# AG Grid 列渲染规范

## 核心原则

1. 所有列定义用 `defineColumns()` 包裹 — 自动应用已注册字段映射，并默认让叶子列与分组表头居中；显式左右对齐优先，特殊页面可传 `{ defaultAlign: null }` 退出
2. 操作列统一用 `renderOps([...])` — 图标按钮系统，自动分隔线 + stopPropagation
3. 状态字段用 `renderTagNode()` / `renderClassifyTag()` — 彩色 Tag，见 tag-status/SKILL.md

Skin/历史项目必须在 `main.ts` 引入一次
`@agile-team/wl-skills-ui/runtime/profiles/legacy-jh-ag`。它修复普通纯文本 flex 单元格的省略号，
并在未配置平台原生 Tooltip 且真实溢出时兜底完整内容。编辑列、操作列、Tag、
复选框、自定义 renderer、主动换行列和皮肤豁免区域不会被接管。

> 与 `wl-skills-kit` 协同说明：本 Skill 负责 AG Grid/列渲染/操作列 runtime 能力，也要服务非 kit 项目的通用 AG Grid 场景。若扫描发现项目希望升级为团队最佳实践，再提示使用 `wl-skills-kit` 进行页面结构和工作流规范化；在此之前，`wl-skills-ui` 仍应保证样式和渲染能力可独立生效。

> 行状态由包统一管控：hover 为品牌色 4% 浅底，selected 为 7% 浅底且优先于
> hover。业务代码不要重写 `.ag-row-hover`、`.ag-row-selected` 或对应 AG
> Grid 主题变量，也不要为了行状态修改编辑控件、校验态和语义单元格背景。

---

## 标准列定义写法

```typescript
import { defineColumns, renderOps, renderTagNode, renderBadge } from '@agile-team/wl-skills-ui/runtime';

columnsDef(): TableColumnDesc<any>[] {
  return defineColumns([
    // ── 序号/选择列 ──
    { type: 'index',     label: '序号', width: 60,  align: 'center' },
    { type: 'selection', label: '',     width: 55,  align: 'center', headerAlign: 'center', fixed: 'left' },

    // ── 普通数据列 ──
    { name: 'riskNo',  label: '风险编号', width: 100 },   // renderBadge 已自动映射
    { name: 'riskLevel', label: '风险分级', width: 90 }, // renderRiskLevel 已自动映射

    // ── 自定义渲染列 ──
    { name: 'status', label: '状态', width: 90,
      defaultNode: ({ row }) => renderTagNode(row.status, MY_STATUS_MAP) },

    // ── 操作列 ──
    { label: '操作', width: 120, fixed: 'right',
      defaultSlot: ({ row }) => renderOps([
        { type: 'view', onClick: () => modal.view(row.id) },
        { type: 'edit', show: !isReadonly.value, onClick: () => modal.edit(row.id) },
        { type: 'del',  show: !isReadonly.value, onClick: () => handleDel(row.id) },
      ])
    },
  ]);
}
```

---

## renderOps 操作类型

| type   | 图标        | CSS 类       | 默认 title |
| ------ | ----------- | ------------ | ---------- |
| `view` | View        | `jh-op-view` | 查看       |
| `edit` | Edit        | `jh-op-edit` | 编辑       |
| `del`  | Delete      | `jh-op-del`  | 删除       |
| `log`  | Document    | `jh-op-log`  | 记录       |
| `ok`   | CircleCheck | `jh-op-ok`   | 审核       |
| `send` | Upload      | `jh-op-send` | 提交       |

---

## COLUMN_AUTO_MAP 已注册字段

使用 `defineColumns()` 包裹后，以下字段**无需手写 defaultNode**，自动渲染：

| 字段名               | 渲染效果       | 需调用                       |
| -------------------- | -------------- | ---------------------------- |
| `enableStatus`       | 启用/停用 Tag  | `installCommonPreset()` 后自动 |
| `riskLevel`          | 风险分级 Tag   | `installCommonPreset()` 后自动 |
| `permitStatus`       | 作业票状态 Tag | 同上                         |
| `trainStatus`        | 培训状态 Tag   | 同上                         |
| `credentialStatus`   | 证书状态 Tag   | 同上                         |
| `riskNo` / `checkNo` | 蓝色编号徽标   | 同上                         |
| `ratingLevel`        | 彩色评级徽标   | 同上                         |

完整列表见 `runtime/core/registry.ts` + `runtime/presets/common.ts`。

---

## 条件显示操作按钮

```typescript
renderOps([
  { type: 'edit', show: canEdit.value,        onClick: ... },  // 响应式
  { type: 'del',  show: row.status !== '3',   onClick: ... },  // 行级条件
  { type: 'ok',   show: () => row.status === '2', onClick: ... }, // 函数形式
])
```

> `show: false` 时按钮不渲染（不占位）。`show` 支持 `boolean | Ref<boolean> | () => boolean`。
