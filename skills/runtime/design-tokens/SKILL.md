---
description: |
  设计 Token 使用规范 Skill — 确保颜色、间距、字体全部通过 CSS 变量引用，
  不使用任何硬编码 hex 值。包含 Token 速查表、扫描规则 R016/R017/R018 详细说明。
applyTo: "**/*.{vue,scss,css}"
---

# 设计 Token 使用规范

## 核心原则

**任何 hex 颜色值在业务代码中都是禁止的**，必须使用 `--el-color-*` CSS 变量。

---

## Token 速查表

### 品牌色

```css
--el-color-primary        /* #4368ff — 主色：按钮/链接/激活 */
--el-color-primary-light-9 /* #f0f3ff — 主色浅底：Tag背景 */
--el-color-success        /* #0cc859 — 成功/正常/启用 */
--el-color-warning        /* #ffaf27 — 警告/待处理 */
--el-color-danger         /* #FB2323 — 危险/失败/停用 */
--el-color-info           /* #909399 — 中性/辅助 */
```

### 文本色

```css
--el-text-color-primary    /* rgba(0,0,0,0.85) — 主要文本 */
--el-text-color-regular    /* rgba(0,0,0,0.65) — 次要文本 */
--el-text-color-secondary  /* rgba(0,0,0,0.45) — 辅助文本 */
```

### 边框/填充

```css
--el-border-color          /* #d9d9d9 */
--el-fill-color-lighter    /* 表格 header 背景 */
```

---

## 常见违规与修正

```diff
/* R016: style 块 */
- color: #4368ff;
+ color: var(--el-color-primary);

- background: #fb2323;
+ background: var(--el-color-danger);

- border-color: #0cc859;
+ border-color: var(--el-color-success);

/* R017: template 内联 style */
- <span :style="{ color: '#ffaf27' }">
+ <span :style="{ color: 'var(--el-color-warning)' }">

/* R018: script 中 ECharts 等配置 */
- color: '#4368ff'
+ color: 'var(--el-color-primary)'  /* 或使用 CHART_COLORS.primary */
```

---

## 扫描与自动修复

```bash
# 检测 hex 颜色违规
npx wl-ui scan --target src --outFile color-report.md

# 自动修复（仅修已知 Token 的 hex，不修 ECharts 等特殊场景）
npx wl-ui fix --target src
```

## 已覆盖的 hex 映射

| hex                           | → CSS Token                       |
| ----------------------------- | --------------------------------- |
| `#409eff` `#3a7afe` `#4368ff` | `var(--el-color-primary)`         |
| `#fb2323` `#f56c6c`           | `var(--el-color-danger)`          |
| `#0cc859` `#67c23a`           | `var(--el-color-success)`         |
| `#ffaf27` `#e6a23c`           | `var(--el-color-warning)`         |
| `#ecf5ff`                     | `var(--el-color-primary-light-9)` |
