---
description: |
  AG Grid 列渲染规范 Skill — 使用 defineColumns + renderOps + renderTagNode 等运行时函数
  实现 AG Grid 表格列的自动化配置、状态彩色 Tag、操作列图标按钮。
applyTo: "**/*.{ts,vue}"
---

# AG Grid 列渲染规范

## 核心原则

1. 所有列定义用 `defineColumns()` 包裹 — 自动应用已注册字段映射
2. 操作列统一用 `renderOps([...])` — 图标按钮系统，自动分隔线 + stopPropagation
3. 状态字段用 `renderTagNode()` / `renderClassifyTag()` — 彩色 Tag，见 tag-status/SKILL.md

---

## 标准列定义写法

```typescript
import { defineColumns, renderOps, renderTagNode, renderBadge } from '@agile-team/wk-skills-ui/runtime';

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
