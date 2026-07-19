---
description: |
  wl-ui fix 自动修复指南 — A 类问题（attr 缺失、hex 颜色）的批量自动修复，
  支持 dry-run 预览，幂等安全，不修改已符合标准的文件。
applyTo: "**"
---

# 自动修复指南

## 可自动修复的问题（A 类）

| 规则      | 修复内容                                          |
| --------- | ------------------------------------------------- |
| R006      | el-input / el-select 补充 `size="small"`          |
| R007      | el-date-picker 补充 `style="width:100%"`          |
| R002/R003 | el-table / BaseTable 补充 `empty-text="暂无数据"` |
| R001      | el-table-column 补充 `align="center"`             |
| R014      | selection 列补充 `header-align="center"`          |
| R021      | BaseTable 修正为 `render-type="agGrid"`           |
| R016/R017 | style/template 块 hex 颜色替换为 CSS Token        |

权威清单来自 `standards/rules.json#autoFixable`，发布检查会与 `scanner/fix.mjs` 的实际实现逐项比对，禁止文档声明与代码能力漂移。

## 命令

```bash
# 先预览（推荐！）
npx wl-ui fix --target src --dry-run

# 确认后执行
npx wl-ui fix --target src

# 只修复特定目录
npx wl-ui fix --target src/views/check
```

## 修复后验证

```bash
npx wl-ui scan --target src --outFile /tmp/after-fix.md
```

`fix` 命令本身会自动复检并打印剩余 issue/error 数；独立报告用于评审留痕。增加 `--fail-on-error` 可在复检仍有 error 时非零退出。

## 无法自动修复（B 类，需 AI 辅助人工处理）

| 规则      | 原因                                           |
| --------- | ---------------------------------------------- |
| R004/R005/R013 | 操作列和图标语义需人工确认                 |
| R008      | labelWidth 需人工判断布局需求                  |
| R009/R010 | 状态字段语义需人工识别                         |
| R015      | 弹窗内操作按钮结构改造                         |
| R018      | script/Canvas 配色需迁移到业务 CHART_COLORS    |
| R027/R028 | 选择器作用域与圆角语义需人工确认               |

## 幂等性保证

修复脚本可重复运行，已符合标准的文件不会被修改。正式写入前自动创建项目内快照；快照创建失败时零写入，写入中断会恢复本轮已改文件。可用 `wl-ui snapshot rollback` 回退。
