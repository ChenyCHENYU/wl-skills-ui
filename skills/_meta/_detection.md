# Detection Cheatsheet — 全 vendor 识别特征速查表

> 供 AI 快速判定一个组件标签属于哪个 layer / vendor

## L1 — Element Plus 原生

| 标签 | Skill |
|---|---|
| `<el-table>` `<el-table-column>` | element/el-table |
| `<el-form>` `<el-form-item>` | element/el-form |
| `<el-dialog>` | element/el-dialog |
| `<el-tag>` | element/el-tag |
| `<el-button>` | element/el-table（操作列） / element/el-button（独立） |
| `<el-input>` `<el-select>` `<el-date-picker>` | element/el-form |
| `<el-pagination>` | element/el-dialog（位置约束） |
| `<el-tree>` | element/el-tree |
| `<el-message-box>` `ElMessageBox.*` | element/el-dialog |

## L2 — Vendor 封装

| 前缀 / 标签 | 优先级 | Skill |
|---|---|---|
| `<BaseTable>` `<base-table>` `<BaseDataTable>` | #1 | vendors/base-table |
| `<BaseQuery>` `<BaseToolbar>` `<base-*>` 其它 | #1 | vendors/base-components（暂随 base-table）|
| `<jh-table>` `<jh-form>` `<jh-tree>` `<jh-pagination>` `<jh-drag-col>` | #2 | vendors/jh-components |
| `<C_*>` `<c-*>` | #3 | vendors/c-components |
| `src/components/PascalCase.vue` 无前缀 | #4 | vendors/custom-wrappers |
| `.ag-root-wrapper` / AG Grid API | — | vendors/ag-grid |
| Portal/Popper 弹层（teleport） | — | 使用 styles/vendors/_portal.scss |
| 不匹配以上任何一种 | — | vendors/unknown-wrapper（兜底）|

## L3 — Layout 骨架

| 类名 / 容器 | Skill |
|---|---|
| `.list-page` 或 搜索+表格+分页结构 | layouts/list-page |
| `.tree-list` 或 `.drag-col-container` | layouts/tree-list |
| `.form-dialog` 或 el-dialog 内 el-form | layouts/form-dialog |
| `.detail-page` 或 描述列表 + 卡片 | layouts/detail-page |
| 未匹配 | 输出"建议在 styles/layouts/ 新增" |

## L0 — Tokens

| 模式 | Rule |
|---|---|
| `<style>` 块内 hex 颜色 | R016 |
| `<template>` 内 hex 颜色 | R017 |
| `<script>` 内 hex 颜色 | R018 |

## 扩展机制

发现新模式时：
1. 在本表追加一行
2. 在 `styles/vendors/` 或 `styles/layouts/` 追加对应 SCSS
3. 在 `skills/vendors/` 或 `skills/layouts/` 追加 SKILL.md
4. 在 `scanner/rules/` 追加规则（带 layer + vendor 元数据）
