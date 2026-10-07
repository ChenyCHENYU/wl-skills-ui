# MCP 接入

`server.js` 是维护中的 stdio MCP 入口，npm 安装后直接启动：

```bash
wl-ui-mcp
```

```json
{
  "mcpServers": {
    "wl-skills-ui": {
      "command": "wl-ui-mcp",
      "env": { "WL_PROJECT_ROOT": "/absolute/path/to/project" }
    }
  }
}
```

## 18 个 Tool

`wl_ui_task` 保存本包计划；`wl_ui_route` / `wl_ui_explain` 只读判定；`wl_ui_status` 读取真实回执；`wl_ui_doctor_host` 只诊断静态入口。所有实际工具可传 `runId`，与 CLI `--run-id` / `WL_TASK_RUN_ID` 复用同一任务标识。工具返回的执行与验证状态各自独立；计划、匹配和模型陈述不会成为检查成功证据。详见[任务判定与真实检查回执](../docs/task-observability.md)。

| Tool | 作用 |
| --- | --- |
| `wl_ui_task` | 保存本包任务计划及检查要求 |
| `wl_ui_route` / `wl_ui_explain` | 只读任务判定、理由、必要规则与缺口 |
| `wl_ui_status` | 实际执行/验证回执与过期范围 |
| `wl_ui_doctor_host` | 静态宿主入口诊断，不证明实际加载 |
| `wl_ui_check` | 接入完整性检查 |
| `wl_ui_scan` | UI 规则扫描，默认 summary，支持 profile、changed-only、分页与 auto/fast/sfc parser |
| `wl_ui_fix_dry_run` | 只预览确定性修复 |
| `wl_ui_skill_prompt` | 输出 Skill 触发提示 |
| `wl_ui_route_intent` | 自然语言意图路由 |
| `wl_ui_detect_skin` | vendor 与 Element Plus 版本配对 |
| `wl_ui_list_rules` | 规则摘要查询 |
| `wl_ui_describe_rule` | 单条规则详情 |
| `wl_ui_drift` | 基线漂移比较 |
| `wl_ui_recommend_flow` | 根据扫描结果推荐后续流程 |
| `wl_ui_contract_extract` | Vue 页面转脱敏 UI 语义 JSON |
| `wl_ui_contract_validate` | 校验 schema、fingerprint 与脱敏边界 |
| `wl_ui_contract_match` | 匹配项目内领域契约库，只返回摘要与分数 |

`wl_ui_scan` 默认返回不含逐条问题的 `wl-ui-scan.summary.v1`，适合先判断是否需要继续。需要修复明细时传 `output: "compact-v2"`，它会去重规则目录并通过 `limit` / `cursor` 稳定分页；只有调试时才使用 `output: "json"`，人工审阅使用 `output: "markdown"`。`changedOnly: true` 无法解析 Git 范围时默认失败关闭，如明确接受全量扫描才设置 `changedFallback: "full"`。

MCP 只编排确定性 scanner、dry-run、规则事实源和契约工具，不让模型重新阅读全项目后猜测 UI 问题。三个 contract 工具均只读，path/library 必须位于项目根目录内；契约不会返回源码、真实接口、业务字段值或按钮原始文案。

真正修改业务文件仍通过 CLI `wl-ui fix`，修复前先运行 `wl_ui_fix_dry_run`，并由使用者确认范围。CLI 实际修复默认创建快照并自动复检。
