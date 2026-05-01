---
description: |
  野路子自封装组件（src/components/XxxxXxxx 这类无规律前缀）的探测和兜底修复策略。
  Layer L2，优先级 #4（兜底）。
applyTo: "**/*.vue"
---

# Skill: vendors/custom-wrappers

> Layer L2 · Vendor priority **#4**（兜底）

## Detect

无统一前缀，但满足以下任一即视为自封装：

- 路径：`src/components/*.vue`（PascalCase 单文件）
- Import：`from '@/components/XxxXxx'`
- DOM 内部一定包含 `el-*` 元素（否则不属于本 skill）

## 探测策略（AI 必读）

由于没有命名规律，AI 应：
1. 跟随 `<script setup>` 中的 `import` 找到组件源码
2. 如能读到源码 → 按 **element-plus 规则**直接修复源码
3. 如不能读到源码 → 走"化妆模式"：在 `styles/vendors/_custom-wrappers.scss` 追加包装类
4. 输出"建议封装迁移到 C_/c_ 前缀"作为优化建议

## Diagnose（典型问题）

- 内部 `el-input` 没 `size="small"` → 但封装可能转发了 size prop，先确认源码
- 内部 hex 颜色 → 应改 token
- 内部布局魔法数 padding/margin → 建议改用 layouts/ 层 class

## Repair

### A 类（仅当能读到源码）
- 同 element/* skill 的 A 类规则

### B 类
- 输出"建议把该组件改名为 C_*/c_* 前缀，纳入团队规范" 的修复建议
- 在 `_custom-wrappers.scss` 注入 .{业务类名} 包装层覆盖

## 与 C_/c_ 的迁移路径

custom → 改名为 C_*/c_* → 进入 vendors/c-components 流程 → 拿到源码后从 L2 迁移到 L4 runtime
