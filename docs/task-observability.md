# 任务判定与真实检查回执

安装、宿主发现、AI 读取、路由选择、工具执行和检查成功是不同阶段。文件存在只证明静态就绪；模型声明不证明读取或执行。`doctor-host --host codex` 只诊断本包入口，宿主实际发现和读取保持 `unverified`。

```bash
wl-ui route "修改页面文字" --target src --json
wl-ui task "修改页面文字" --target src --json
# 把上一步返回的 runId 用于实际工具
wl-ui scan --target src --output summary --fail-on-error --run-id <runId>
wl-ui status --run-id <runId> --json
```

`route/explain` 只读；`task` 保存计划，尚未执行任何检查。同一用户任务在已安装且适用的包间复用 `--run-id` 或 `WL_TASK_RUN_ID`，各包只读写自己的 `.wl-skills-ui/runs`，不要求安装未使用的兄弟包。请为每次新任务使用新 ID；每个工具结束和任务结束时简短报告 runId、执行状态、验证状态、真实检查范围及未验证项。

判定包括 `matched`、`baseline`、`ambiguous`、`gap`、`not-applicable`、`needs-context`。普通相关修改使用基础规范；缺本包 canonical Skill/规则资产返回 `gap`、`ready:false`、`missingInputs`，保留 `routingStatus` 与选定技能。`--skill <未发布ID>` 和显式未支持专项请求报告能力缺口，而不是用基础规范掩盖。确定性路由覆盖已发布目录和明确列出的未支持意图，不能保证理解所有自然语言；遇到歧义/缺上下文须补充目标与意图，缺口只形成审阅建议，不自动增改技能。

每条真实 CLI/MCP 回执分开记录 `executionStatus` 与 `validationStatus`：退出零只代表工具完成；没有检查则 `unverified`，错误为 `failed`，相关检查跳过/人工复核/范围缺口为 `partial` 或 `unverified`。明确不适用单独标识。实际执行器的 `checkedFiles` 才证明处理过的文件；输入目录快照不当作全目录覆盖。未报告检查文件的工具保留范围未知，不把工具运行当作业务规范通过。

状态核对源码、规则、配置、任务所需资产及包版本快照，编辑后旧证据标记 stale，须复检。重复同工具+同目标按开始时间选最新回执；未解决的计划缺口和未覆盖目标不能报 overall passed。

安装会生成本包独有 `.agents/skills/wl-skills-ui/SKILL.md` 薄适配器，先判定，再按需读 selected canonical Skill 与标准。现有 editor 入口也提示同样流程，安装/更新/清理继续遵守各自 manifest 所有权；没有归属证据不会接管用户内容。宿主是否重新索引新入口须由真实宿主确认，CLI 不伪造宿主事件。

UI scan 记录规则真实回调次数及 SFC_PARSE 错误；解析错误不受规则过滤隐藏。fast/fallback 仅提取区块，未验证 SFC 语法；compiler SFC 解析也不替代脚本 TypeScript 类型编译、浏览器视觉和业务语义复核。UI Vite 插件只检查依赖组合，明确列出源码 scan 尚未执行。运行时 guard 的存在不证明静态规范已通过。

当前 CLI 检查回执覆盖 scan / audit / check / fix / all 与 Vite 依赖检查，本包 MCP 记录实际调用；其他 CLI snapshot / drift / exempt / contract / 脚手架保留既有产物与日志，不自动等同于 UI 源码检查。未由执行器报告实际文件的操作，其检查范围明确未知；不能用输入目录快照或成功退出补造文件覆盖。

规则选择器来自实际注册表；未知 ID、格式错误和无界范围在扫描前拒绝。CLI 的未知参数、重复值选项、空值与额外位置参数同样不会启动检查或写入回执；JSON/summary/compact-v2 输出返回 `invalid-input` 与 `not-executed`。MCP 的错误调用返回 `isError=true` 与真实失败记录，保留同 runId，`checkedFiles` 与源码检查为空。已注册的规则选择和语法错误检查继续按原有契约执行。

## 稳定协议执行

编排层先调用 `protocol request` 的 `task`，再发送 `operation: "execute"`、当前项目绝对 `projectRoot`、同一 `runId`、`executorId: "scan"` 与 `parameters.targets`。UI 的 `rules` 只接受本次计划内的规则子集；省略时执行当前计划的 R 规则，不扩大到全量规则。SFC 解析检查独立执行且不能被隐藏。请求的执行器必须在当前状态的 `integration.allowedExecutors` 内；目标不能扩大，参数按目录 Schema 校验。解释、规划、禁止检查、未接入/移动项目、缺口、计划过期与已知版本漂移不会启动执行器。

执行接线只保留本包参数映射，复用原 scan CLI，不复制规则或检查器。业务文件只读，原执行器仍写本包真实回执；返回 `result.execution` 和重新回查的 `result.integration`。调用 `ok=true` 不等于检查通过，非零退出、取消信号、实际文件和未验证项须如实展示。稳定接口使本包新版本不要求适配器或兄弟包同步修改；宿主/模型的实际读取和展示仍需独立证据。

`--only/--skip` 在扫描前选择实际规则回调，CLI 与 MCP 使用同一选择器；回执的 ruleExecutions 只记录实际选中的规则。它们不只是过滤问题展示；SFC_PARSE 仍独立验证，不能被规则选择隐藏。

原 scanner 与修复器在读取 Vue 文件前核验实际路径属于本项目；目录目标中的外部符号链接叶子也明确拒绝，不能静默跳过后称检查通过。本项目内合法文件链接继续可读；公开 execute 在启动原 CLI 前另做目标边界预检。
