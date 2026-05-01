# 颜色设计规范

## 品牌色系

| Token                        | 值        | 用途                       |
| ---------------------------- | --------- | -------------------------- |
| `--el-color-primary`         | `#4368ff` | 主色调：按钮、链接、激活态 |
| `--el-color-primary-light-9` | `#f0f3ff` | 主色浅底：Tag 背景         |
| `--el-color-success`         | `#0cc859` | 成功/正常/启用状态         |
| `--el-color-warning`         | `#ffaf27` | 警告/待处理状态            |
| `--el-color-danger`          | `#FB2323` | 危险/失败/停用状态         |
| `--el-color-info`            | `#909399` | 中性/辅助信息              |

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
