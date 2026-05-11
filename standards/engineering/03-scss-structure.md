# 工程规范 03 — SCSS 文件结构

## 项目级样式目录

```
src/
  styles/
    index.scss          # 全局入口：@use 所有模块
    variables.scss      # 项目自定义变量（扩展 token）
    mixins.scss         # 项目公共 mixin
    components/         # 组件级样式（按需使用）
      _risk.scss
      _audit.scss
    pages/              # 页面级样式（scoped 内可重写）
```

## 全局入口 (src/styles/index.scss)

```scss
// 1. wl-skills-ui 设计 token（必须在 index.html <link> 加载 design/tokens/base.css）

// 2. wl-skills-ui 样式重置
@use "@agile-team/wl-skills-ui/styles" as *;

// 3. 项目自定义变量
@use "./variables" as *;

// 4. 项目公共 mixin
@use "./mixins" as *;
```

## 规则

1. **禁用 `@import`**（SCSS 已废弃）— 统一用 `@use` / `@forward`
2. **颜色**必须用 CSS 变量或 token（R016/R017/R018），不写硬编码 hex
3. **scoped 样式**中不写全局覆盖；全局覆盖统一在 `styles/components/` 中
4. **BEM 命名**：`.block__element--modifier`
5. 组件 `<style lang="scss" scoped>` 中只写该组件私有样式

## 示例

```scss
// ✅ 正确
.risk-card {
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-primary);

  &__header { ... }
  &__body   { ... }
  &--active { border-color: var(--el-color-primary); }
}

// ❌ 禁止
.risk-card {
  background: #fff;           // 硬编码颜色
  color: rgba(0, 0, 0, 0.85); // 硬编码
}
```
