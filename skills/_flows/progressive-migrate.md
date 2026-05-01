---
description: |
  渐进式迁移流程 — 把 vendor 封装组件逐步替换为 runtime API（拿到源码后的演进路径）。
applyTo: "**/*.{vue,ts}"
---

# Flow: progressive-migrate

> 从 L2 vendors 升级到 L4 runtime（业务代码大幅精简）

## 触发短语

- "用 wk-ui 把这个文件迁移到 runtime"
- "progressive-migrate 流程跑一下"

## 前置条件

- 已经接入 wk-skills-ui
- 已经拿到目标封装组件的源码控制权（或确认可改造）

## 执行步骤

### Phase 1 — 选定一个文件 / 一个组件
- 优先选页面文件（小范围）
- 列表页 / 表单 / 弹窗皆可

### Phase 2 — 列定义改造
- `<el-table-column prop="status" />` + 自定义 slot
  → `defineColumns([{ name: 'status', ... }])` + 自动 COLUMN_AUTO_MAP

### Phase 3 — 操作列改造
- `<el-button @click="...">查看</el-button>` 串
  → `renderOps([{ type: 'view', onClick: ... }, ...])`

### Phase 4 — 字段映射改造
- 业务自定义状态字段 → 注册到 `installCommonPreset` 之外的 `add-preset`
  ```bash
  npx wk-ui add-preset my-biz
  ```

### Phase 5 — 验证
- 业务功能不变
- DOM 类名继续匹配 vendors/* 全局样式
- scanner 报告无 L1/L2 违规

## 注意

- 一次只迁一个文件，提交一次，方便回退
- vendors/ 全局样式保留，确保未迁移的页面继续生效
