# TPL-AG-GRID — AG Grid 列表页模板

> 适用：使用 AG Grid 作为表格组件的高性能列表页（大数据量、复杂列操作）。

## 模板代码（TypeScript 类风格）

```typescript
// [Module]List.ts — 页面逻辑
import { defineColumns, renderOps, renderTagNode } from '@agile-team/wl-skills-ui/runtime';
import type { TableColumnDesc } from '@/types/table';

columnsDef(): TableColumnDesc<any>[] {
  return defineColumns([
    // ── 选择/序号 ──
    {
      type: 'selection',
      label: '',
      width: 55,
      fixed: 'left',
      align: 'center',
      headerAlign: 'center',
    },
    { type: 'index', label: '序号', width: 60, align: 'center' },

    // ── 数据列（已注册字段自动映射，无需 defaultNode）──
    { name: 'riskNo',    label: '编号',     width: 100 },  // → renderBadge
    { name: 'name',      label: '名称',     minWidth: 150 },
    { name: 'riskLevel', label: '风险分级', width: 90 },   // → renderRiskLevel Tag
    { name: 'riskStatus', label: '状态',   width: 90 },    // → renderRiskStatus Tag

    // ── 自定义渲染列 ──
    { name: 'checkLevel', label: '检查层级', width: 90,
      defaultSlot: ({ row }) => renderCheckLevel(row.checkLevel) },

    // ── 操作列 ──
    {
      label: '操作',
      width: 120,
      fixed: 'right',
      align: 'center',
      defaultSlot: ({ row }) => renderOps([
        { type: 'view', onClick: () => this.modal.view(row.id) },
        { type: 'edit', show: !this.isReadonly, onClick: () => this.modal.edit(row.id) },
        { type: 'del',  show: !this.isReadonly, onClick: () => this.handleDel(row.id) },
      ]),
    },
  ]);
}
```

## 工具栏定义

```typescript
toolbarDef() {
  return [
    {
      label: '新增',
      icon: 'Plus',
      type: 'primary',
      onClick: () => this.modal.add(),
    },
    {
      label: '导出',
      icon: 'Download',
      onClick: () => this.handleExport(),
    },
  ];
}
```

## 注意事项

1. 所有列用 `defineColumns()` 包裹 — 已注册字段自动应用渲染器
2. 操作列用 `renderOps([...])` — 图标按钮 + 自动 stopPropagation
3. selection 列必须同时设置 `align: 'center'` + `headerAlign: 'center'`（R014）
4. 分类字段（type/level）用 `renderClassifyTag`，状态字段用 `renderTagNode`
