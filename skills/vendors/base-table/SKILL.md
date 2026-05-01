---
description: |
  BaseTable / <base-table> 系列封装组件的识别、诊断和修复规则。
  Base 前缀是团队约定的最高优先级封装组件，所有 Base* 表格的视觉一致性由本 skill 保障。
applyTo: "**/*.vue"
---

# Skill: vendors/base-table

> Layer L2 · Vendor priority **#1**（Base > jh > C_/c_ > custom）

## Detect（识别）

满足以下任一条件即视为 Base 系列封装表格组件：

| 维度 | 模式 |
|---|---|
| 标签名 | `<BaseTable>` / `<base-table>` / `<BaseDataTable>` / `<BaseList>` |
| Import | `from '@/components/Base*'` / `from '@/components/base-*'` |
| 类名 | `.base-table-wrapper` / `.base-table-container` / `[class^='base-table-']` |
| Props | 通常包含 `columns` / `data` / `hook` / `renderType` |

## Diagnose（判定）

底层基于 Element Plus `el-table`，所有 R001-R003、R014 规则同样生效，但需注意：

- ❌ 直接给 `<BaseTable>` 加内联 hex 颜色（应通过 token 或全局类名）
- ❌ 用 `<el-button type="primary">` 当操作按钮（应用 `is-text` 文字按钮，沿用 R004）
- ❌ 列头未居中（同 R001）
- ❌ 缺 `empty-text="暂无数据"`（同 R003）
- ❌ 在 `<BaseTable>` 外层包裹自定义 padding 容器，破坏整体节奏

## Repair（修复）

### A 类（自动修）
- 缺失 `empty-text` → 补 `empty-text="暂无数据"`
- 操作列按钮 `type="primary"` → 改为 `link` + `is-text`
- 内联 hex → CSS 变量

### B 类（建议人工确认）
- 替换为 `defineColumns(...)` 渲染（迁移到 L4 runtime，业务代码大幅精简）

## 全局样式来源

`styles/vendors/_base-table.scss` — 已注入容器圆角、表头颜色、操作按钮间距。
项目侧无需重复写样式，遵循 DOM 约定即可。

## 未来源码迁移

当 BaseTable 源码可用：
1. 把 `_base-table.scss` 内容平迁到 `BaseTable.vue` 的 `<style scoped>`
2. 在 `runtime/presets/` 新增 `base-table.ts` 提供原生 API
3. 业务代码升级为 `<BaseTable :columns="defineColumns(...)" />`
