# 颜色设计规范

## 品牌色系

> 单一依据：《烟台华新数智化信息化改造项目 UI 规范 v1》“颜色-主色/功能色”页。

| Token                         | 值              | 用途                         |
| ----------------------------- | --------------- | ---------------------------- |
| `--el-color-primary`          | `#002a8f`       | 主按钮常规、链接、选中态     |
| `--el-color-primary-rgb`      | `0, 42, 143`    | 主色透明背景、阴影和选中底色 |
| `--el-color-primary-light-1`  | `#1a3f9a`       | 主按钮悬停                   |
| `--el-color-primary-light-2`  | `#3355a5`       | 柔和主题蓝                   |
| `--el-color-primary-light-3`  | `#4d6ab1`       | 辅助高亮                     |
| `--el-color-primary-light-4`  | `#667fbc`       | 辅助高亮                     |
| `--el-color-primary-light-5`  | `#8094c7`       | 主色边框                     |
| `--el-color-primary-light-6`  | `#99aad2`       | 浅色辅助                     |
| `--el-color-primary-light-7`  | `#b2bfdd`       | 主按钮禁用                   |
| `--el-color-primary-light-8`  | `#ccd4e9`       | 浅色辅助                     |
| `--el-color-primary-light-9`  | `#e5eaf4`       | 浅色/白底悬浮                |
| `--el-color-primary-dark-1`   | `#002681`       | 主按钮点击                   |
| `--el-color-primary-dark-2`   | `#002272`       | 深色辅助                     |
| `--el-color-primary-dark-3`   | `#001d64`       | 深色辅助                     |
| `--el-color-primary-dark-4`   | `#001956`       | 最深品牌蓝                   |
| `--el-color-success`          | `#2bb268`       | 成功/正常/启用状态           |
| `--el-color-warning`          | `#ea9a13`       | 警告/待处理状态              |
| `--el-color-danger`           | `#bb2d3f`       | 危险/失败/停用状态           |
| `--el-color-info`             | `#909399`       | 中性/辅助信息                |

品牌色及成功、警告、危险色阶属于客户固定主题契约。样式层以 `!important` 抵御平台普通内联主题，调用 `installCommonPreset()`、`installSecurityPreset()` 或 `installBrandThemeLock()` 后，运行时还会监测并恢复 `html/body` 上的动态改写。

## 文本色系

| Token                         | 值                 | 用途     |
| ----------------------------- | ------------------ | -------- |
| `--el-text-color-primary`     | `rgba(0,0,0,0.85)` | 主要文本 |
| `--el-text-color-regular`     | `rgba(0,0,0,0.65)` | 次要文本 |
| `--el-text-color-secondary`   | `rgba(0,0,0,0.45)` | 辅助文本 |
| `--el-text-color-placeholder` | `rgba(0,0,0,0.25)` | 占位文本 |

## 边框色系

| Token                     | 值        | 用途             |
| ------------------------- | --------- | ---------------- |
| `--el-border-color`       | `#d9d9d9` | 默认边框         |
| `--el-border-color-light` | `#f0f0f0` | 浅边框（分隔线） |

## 填充色系

| Token                     | 用途             |
| ------------------------- | ---------------- |
| `--el-fill-color-lighter` | 表格 header 背景 |
| `--el-fill-color-blank`   | 白色背景         |

## 硬编码颜色禁止使用

❌ 禁止在业务代码中直接写 hex 值，必须使用上方 Token 变量。

扫描器规则 R016/R017/R018 会自动检测并报告。
