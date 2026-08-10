# 字体排版规范

## 字体族

受管业务组件统一使用：

```css
var(--wk-font-family-sans)
/* "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC",
   "Hiragino Sans GB", Arial, sans-serif */
```

Windows 优先选择可同时覆盖中文、英文和数字的微软雅黑 UI 字体，避免 Edge 的增强文本
对比度把逐字符 fallback 的差异放大为同一行粗细、字面高度不一致。该 Token 只映射到
Element Plus、BaseTable 和 AG Grid 等受管组件根，不直接覆盖 `body` 或 `*`；登录页、大屏、
代码编辑器、图表、图标字体及显式豁免区继续保留自己的字体设计。

## 字号

| Token                        | 值     | 用途                |
| ---------------------------- | ------ | ------------------- |
| `--el-font-size-extra-large` | `32px` | 大标题              |
| `--el-font-size-large`       | `24px` | 页面标题            |
| `--el-font-size-medium`      | `16px` | 次级标题            |
| `--el-font-size-base`        | `14px` | 正文（默认）        |
| `--el-font-size-small`       | `12px` | 辅助信息、Tag、分页 |
| `--el-font-size-extra-small` | `10px` | 角标                |

## 字重

| Token                      | 值    | 用途                   |
| -------------------------- | ----- | ---------------------- |
| `--el-font-weight-primary` | `500` | 中等加粗（按钮、表头） |
| `--el-font-weight-semi`    | `600` | 较粗（弹窗标题）       |
| `--el-font-weight-regular` | `400` | 正文                   |
| `--el-font-weight-light`   | `300` | 轻量文本               |

## 使用原则

1. 正文统一 `14px / font-weight: 400`
2. 操作按钮 `14px / font-weight: 500`
3. 表格表头 `14px / font-weight: 500`
4. 弹窗标题 `16px / font-weight: 600`
5. Tag/角标 `12px`
6. 紧凑 AG Grid 表头/正文统一使用整数 `13px`，避免小字号半像素在浏览器间放大差异
