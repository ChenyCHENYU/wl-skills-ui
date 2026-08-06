# 浏览器视觉回归

## 覆盖目标

`tests/visual` 使用真实 Vue、Element Plus、Skin SCSS 和 `runtime/auto`，在 Chromium 中
验证最终计算样式与关键区域截图。它补充现有 Node DOM/SCSS 契约测试，专门发现
“选择器存在但浏览器层叠后没生效”以及“修一处却破坏另一处”的问题。

当前覆盖：

- 客户主色被平台 JS 改写后由主题锁恢复。
- 主按钮、禁用态、功能色和统一圆角。
- textarea focus 品牌边框与轻焦点环。
- 数字输入只有一个边框所有者。
- common-core 复合多标签外壳自然增高、内层无双描边。
- Element Table 长文本真实溢出、省略号与按需完整提示。
- 表格选中行柔和状态色、BaseToolbar 分裂按钮与定制区域豁免。

## 使用

```bash
# Windows 默认复用已安装的 Edge Chromium；非 Windows 首次安装一次
pnpm exec playwright install chromium

# 对比现有基准
pnpm test:visual

# 调试
pnpm test:visual:ui

# 设计变更经评审确认后才更新基准
pnpm test:visual:update

# 发版完整门禁
pnpm release:check
```

截图基准按 Playwright 的浏览器/平台规则保存，不随 npm 包发布。Windows 默认使用企业
环境已有的 Edge Chromium，也可通过 `WL_UI_BROWSER_CHANNEL` 显式指定 Playwright 通道。
视觉像素受操作系统、浏览器版本和字体渲染影响，生成与比较必须使用相同环境；当前
基准为 Windows Edge Chromium。
升级 Playwright、Chromium 或字体后，应单独提交基准变化并人工审图，不能把更新截图当成
消除失败的常规手段。

## 增加场景

优先向现有固定尺寸区域加入最小状态，不复制整套业务页面。每个缺陷至少提供一个
计算样式断言；只有颜色、边框、布局关系需要肉眼整体判断时再补截图。动态时间、随机数、
动画和远程资源不得进入基准页。
