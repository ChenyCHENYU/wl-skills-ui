# @agile-team/wk-skills-ui 快速接入指南

---

## 前置条件

- Node ≥ 18，Vue ≥ 3.2，Element Plus ≥ 2.2
- 项目有全局 SCSS 入口（如 `src/assets/style/main.scss`）

---

## 场景 A — 老项目化妆（Skin 模式）

> 适合：已有布局框架和封装组件，不想改业务代码，只要视觉对齐。

```bash
# 1. 安装
pnpm add @agile-team/wk-skills-ui

# 2. AI 编辑器：安装化妆模式 skills（过滤掉 runtime/layouts）
npx wk-ui init --mode skin
```

```html
<!-- index.html — 在所有样式之前 -->
<head>
  <link rel="stylesheet" href="/node_modules/@agile-team/wk-skills-ui/design/tokens/base.css" />
</head>
```

```scss
/* 全局 SCSS 入口 */
@use '@agile-team/wk-skills-ui/styles/presets/skin' as *;
```

```bash
# 3. 扫描问题（只看化妆层 L0/L1/L2）
npx wk-ui scan --target src --mode skin --outFile audit.md

# 4. 让 AI 按 legacy-skin-align 流程修复
# 在编辑器里：用 wk-ui 的 legacy-skin-align 流程跑当前项目
```

---

## 场景 B — 新项目原生（Native 模式）

> 适合：从零搭建，全量接入五层架构（tokens + element + vendors + layouts + runtime）。

```bash
# 1. 安装
pnpm add @agile-team/wk-skills-ui

# 2. 安装全套 skills
npx wk-ui init --mode native
```

```html
<!-- index.html -->
<head>
  <link rel="stylesheet" href="/node_modules/@agile-team/wk-skills-ui/design/tokens/base.css" />
</head>
```

```scss
/* 全局 SCSS 入口 */
@use '@agile-team/wk-skills-ui/styles' as *;
```

```ts
// src/main.ts
import { installCommonPreset } from '@agile-team/wk-skills-ui/runtime/common-preset';
installCommonPreset();  // 注册通用业务枚举到 COLUMN_AUTO_MAP

// 可选：注入动态字典解析器
import { setDictResolver } from '@agile-team/wk-skills-ui/runtime';
import { bizStore } from '@/store/business-logic';
setDictResolver((dictKey, value) => bizStore().get(dictKey, value));
```

```ts
// 业务列定义
import { defineColumns, renderOps } from '@agile-team/wk-skills-ui/runtime';

const columns = defineColumns([
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { name: 'name',         label: '名称',   minWidth: 150 },
  { name: 'enableStatus', label: '启用状态', width: 90 },   // 自动渲染 Tag
  { name: 'riskLevel',    label: '风险分级', width: 90 },   // 自动渲染 Tag
  {
    label: '操作', width: 120, fixed: 'right', align: 'center',
    defaultSlot: ({ row }) => renderOps([
      { type: 'view', onClick: () => modal.value.view(row.id) },
      { type: 'edit', onClick: () => modal.value.edit(row.id) },
      { type: 'del',  onClick: () => handleDel(row.id) },
    ]),
  },
]);
```

---

## 常用 CLI 命令

```bash
# 全量扫描（接入检查 + 风格审计 + 报告）
npx wk-ui all --project . --outFile report.md

# 仅扫描 L0 颜色 token 问题
npx wk-ui scan --target src --layer L0

# 自动修复（dry-run 先预览）
npx wk-ui fix --target src --dry-run
npx wk-ui fix --target src

# 脚手架新业务预设
npx wk-ui add-preset my-biz
```

---

## 参考文件

| 文件 | 用途 |
|---|---|
| `reference/ag-cell-renders.ts` | 状态 Tag / Badge / 操作列渲染函数完整参考 |
| `reference/define-columns.ts` | `COLUMN_AUTO_MAP` 完整字段列表 |
| `reference/SelectPopupCom.vue` | 选择弹窗标准实现（分页在 footer 外） |
| `templates/list-page/TPL-LIST.md` | 标准列表页脚手架 |
| `templates/form-dialog/TPL-FORM-DIALOG.md` | 标准表单弹窗脚手架 |
| `skills/_flows/legacy-skin-align.md` | 老项目化妆全流程（AI 触发用）|
| `skills/_flows/new-project-init.md` | 新项目接入全流程（AI 触发用）|
