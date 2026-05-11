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
| R016/R017 | style/template 块 hex 颜色替换为 CSS Token        |

## 命令

```bash
# 先预览（推荐！）
npx wl-ui fix --target src --dry-run

# 确认后执行
npx wl-ui fix --target src

# 只修复特定目录
npx wl-ui fix --target src/views/check
```

## 修复后必须验证

```bash
npx wl-ui scan --target src --outFile /tmp/after-fix.md
```

对比修复前后报告，确认 A 类问题归零，剩余仅为需人工处理的规则。

## 无法自动修复（B 类，需 AI 辅助人工处理）

| 规则      | 原因                                           |
| --------- | ---------------------------------------------- |
| R004/R013 | 操作列结构改造，需改写 defaultSlot + renderOps |
| R008      | labelWidth 需人工判断布局需求                  |
| R009/R010 | 状态字段语义需人工识别                         |
| R015      | 弹窗内操作按钮结构改造                         |

## 幂等性保证

修复脚本可重复运行，已符合标准的文件不会被修改。
