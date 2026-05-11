---
description: |
  历史项目 UI 全量迁移 Skill — 针对从旧版本（无 wl-skills-ui）升级到标准规范的完整改造流程。
  包含：依赖安装、tokens 接入、SCSS 替换、runtime 注册、columnsDef 迁移、全量扫描验证。
applyTo: "**"
---

# 历史项目 UI 迁移 Skill

## 适用场景

- 已有业务系统从零接入 wl-skills-ui
- 旧版 jh-ui 系统升级到新规范
- 统一多个历史项目到同一 UI 标准

---

## 迁移五步法

### Step 1 — 安装依赖

```bash
pnpm add @agile-team/wl-skills-ui
```

### Step 2 — 接入 CSS Tokens

在 `index.html` `<head>` 最顶部追加（必须在所有样式之前）：

```html
<link
  rel="stylesheet"
  href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css"
/>
```

### Step 3 — 替换 SCSS 入口

在全局 SCSS 入口（`src/assets/style/main.scss` 或 `src/styles/index.scss`）追加：

```scss
@use "@agile-team/wl-skills-ui/styles" as *;
// 可选 portal 视觉增强：
// @use '@agile-team/wl-skills-ui/styles/portal';
```

> 注意：如果项目有旧的 element-plus 覆盖样式，确认无冲突后可删除旧样式。

### Step 4 — 注册运行时预设

在 `src/main.ts` 中（`app.mount` 之前）：

```typescript
import { installCommonPreset } from "@agile-team/wl-skills-ui/runtime/common-preset";
installCommonPreset();
```

这会把所有通用业务字段（riskLevel / permitStatus / trainStatus 等）
注册进 COLUMN_AUTO_MAP，之后使用 `defineColumns()` 包裹的列定义会自动渲染。

### Step 5 — 迁移 columnsDef

将所有 `defineColumns()` 调用从本地 `src/util/define-columns.ts` 改为 package：

```typescript
// ❌ 旧写法
import { defineColumns } from "@/util/define-columns";
import { renderOps } from "@/util/ag-cell-renders";

// ✅ 新写法
import { defineColumns, renderOps } from "@agile-team/wl-skills-ui/runtime";
```

然后运行扫描：

```bash
npx wl-ui all --project . --outFile migration-report.md
```

按报告逐步修复 R001~R018 违规项。

---

## 验收检查清单

```bash
npx wl-ui check --project .
```

所有 I001~I004 必须全部通过：

- ✅ I001：`index.html` 中存在 `tokens.css` link 标签
- ✅ I002：全局 SCSS 中引入 wl-skills-ui 样式
- ✅ I003：`runtime` 已被引用（ag-cell-renders 或 package import）
- ✅ I004：peer dependencies 版本满足要求

---

## 常见迁移问题

| 问题                          | 解决方案                                          |
| ----------------------------- | ------------------------------------------------- |
| 旧版 ag-cell-renders.ts 冲突  | 删除本地文件，全部改用 package import             |
| SCSS `@use` vs `@import` 冲突 | 统一改为 `@use`，避免重复引入                     |
| ElTagType 类型报错            | 确保 element-plus ≥ 2.2，不使用已废弃的 `""` type |
| defineColumns 自动映射未生效  | 确认 `installCommonPreset()` 在 `mount` 前调用      |
