# MCP 接入

`server.js` 是维护中的 stdio MCP 入口，npm 安装后直接启动：

```bash
wl-ui-mcp
```

推荐在已安装本包的目标项目执行 `wl-ui init --hosts codex,zcode,kilo --mcp`，由安装器按所选宿主生成原生项目配置；不要把下面的通用 `mcpServers` 示例直接套给所有宿主。生成配置使用本地脚本绝对路径和 `WL_PROJECT_ROOT`。`wl-ui doctor` 检查配置内容与本地运行依赖，宿主加载和连接仍需实测；没有已验证项目配置契约的宿主会显示手动接入诊断。

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
| `wl_ui_skill_prompt` | 只读输出“先路由、按动作决定检查”的入口说明 |
| `wl_ui_route_intent` | 兼容旧名，复用 `wl_ui_route` 的技能、范围与动作判定 |
| `wl_ui_detect_skin` | vendor 与 Element Plus 版本配对 |
| `wl_ui_list_rules` | 规则摘要查询 |
| `wl_ui_describe_rule` | 单条规则详情 |
| `wl_ui_drift` | 基线漂移比较 |
| `wl_ui_recommend_flow` | 根据扫描结果推荐后续流程 |
| `wl_ui_contract_extract` | Vue 页面转脱敏 UI 语义 JSON |
| `wl_ui_contract_validate` | 校验 schema、fingerprint 与脱敏边界 |
| `wl_ui_contract_match` | 匹配项目内领域契约库，只返回摘要与分数 |

`wl_ui_scan` 默认返回不含逐条问题的 `wl-ui-scan.summary.v1`，适合先判断是否需要继续。需要修复明细时传 `output: "compact-v2"`，它会去重规则目录并通过 `limit` / `cursor` 稳定分页；只有调试时才使用 `output: "json"`，人工审阅使用 `output: "markdown"`。`changedOnly: true` 无法解析 Git 范围时默认失败关闭，如明确接受全量扫描才设置 `changedFallback: "full"`。

先使用 `wl_ui_route` 判定任务；需要建立执行记录时使用 `wl_ui_task`。旧 `wl_ui_route_intent` 保留原工具名和推荐字段，但不再维护另一套关键词评分，也不再无条件建议扫描：只解释、仅计划、明确禁止的动作、未接入项目和前置条件缺失均遵循统一路由结果。以 `action.checksAllowed`、`ready`、`scope` 和 `notice` 为依据。`wl_ui_route_intent` / `wl_ui_skill_prompt` 不创建执行回执；单纯读取说明或路由不属于扫描执行。Kit 桥接需求由实际扫描的 `wl_ui_recommend_flow` 给出，不从原始任务里出现“菜单”等词推断。

MCP 只编排确定性 scanner、dry-run、规则事实源和契约工具，不让模型重新阅读全项目后猜测 UI 问题。三个 contract 工具均只读，path/library 及递归库输入须位于实际项目根目录内；契约不会返回源码、真实接口、业务字段值或按钮原始文案。库匹配返回 `library.complete/status/skipped/gaps`；外部链接、循环、缺失/不可读或损坏契约使调用失败且 `matches=[]`，普通非契约文件列为跳过，空库标记 `empty`。保留根内目录/文件链接并按实际输入去重；匹配仍不等于页面规则验证，也不提供操作系统级文件沙箱。

真正修改业务文件仍通过 CLI `wl-ui fix`，修复前先运行 `wl_ui_fix_dry_run`，并由使用者确认范围。CLI 实际修复默认创建快照并自动复检。
