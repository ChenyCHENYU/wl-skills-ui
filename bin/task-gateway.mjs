import { readFileSync } from "node:fs";
const PACKAGE_VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

export const GATEWAY_PATH = ".agents/skills/wl-skills-ui/SKILL.md";

export function taskGateway() {
  return `---
name: wl-skills-ui
description: PC Vue 管理端样式美化、布局与交互一致性、主题与设计令牌、表格表单弹窗的视觉检查和修复。用于目标自身已接入本包的项目；不继承父目录安装，不适用 UniApp、小程序、App/PDA、移动 H5 或未接入项目。
---

# WL 界面样式与交互一致性任务入口

显式调用示例：\`$wl-skills-ui 请在 <项目绝对路径> 中 <完整任务>，先展示 task 回执，再执行授权范围内的工作，结束展示同 runId 的 status。\` 支持原生技能的宿主可按名称调用；其他宿主先读取本文件再执行下方本地命令。模型名称或安装成功不能证明宿主已经加载技能。

首条进度用 \`notice.summary\`（旧版用 \`notice\`）说明匹配了哪个技能、执行工具是否已运行、还有什么待检查。实际调用 MCP 后再报真实工具名和结果；结束用同一 runId 核对。包版本放在详情，失败说清原因，不能把路由命中说成技能已加载。

For one user task reuse the same \`--run-id\` or \`WL_TASK_RUN_ID\` across installed applicable packages. Do not install unused sibling packages or create unrelated IDs.

先确认目标项目自身的接入证据（本包安装清单、直接依赖或 \`.wl-skills-scope.json\` 显式启用），再判定任务。只在目标已接入且平台适用时读取规则；父目录安装、兄弟包、Vue 文件或触发词不能证明接入。未接入的开源项目不套用规则、不建议自动安装；UniApp/小程序/App/PDA/移动 H5 不适用。跨项目目标分别判定，沿最近项目边界停止，不能越过未接入子项目找父清单。工具返回 \`scope\` 作为静态范围证据，宿主加载仍需实际事件。

动作边界：显示真实回执中的 \`action.mode\`、\`checksAllowed\` 和 \`ruleRefs\`。历史引用与明确禁止的动作不参与技能评分。只解释或只列计划时可以读取相关规范，不能因为命中了生成/修复技能就自动检查或改写业务文件。检查许可仅表示任务动作；业务写入仍遵循用户授权和本包原有流程。非适用项目不加载规范。 只解释或核对适用规则时，使用 CLI \`route\`/\`explain\`，或 MCP \`wl_ui_route\`/\`wl_ui_explain\`。有实际后续工作才建立 \`task\` 记录。

多项目工作区先沿目标路径向上找到本包安装清单与项目 AGENTS，切到该项目根再调用工具；不要以聚合工作区根代替 projectRoot，也不要在聚合根安装。不同项目分别保存项目身份，同一用户任务复用 runId。

1. 从目标项目根优先执行版本一致的本地命令 \`node node_modules/@agile-team/wl-skills-ui/bin/wl-ui.js task "<完整任务>" --target <path> --json\`。本地命令不可用时，只使用已连接、同项目同版本的 MCP \`wl_ui_task\`（\`task\`、\`project\`、\`targets\`），结束用 \`wl_ui_status\` 和同一 \`runId\`。两条路径都不可用时，明确报告“缺少可用执行器，任务尚未执行”。临时 npx init 不安装运行依赖或样式，授权后可在项目安装固定版本 \`pnpm add @agile-team/wl-skills-ui@${PACKAGE_VERSION}\`。
2. Read \`node_modules/@agile-team/wl-skills-ui/SKILL.md\`, then only the selected canonical Skill under \`node_modules/@agile-team/wl-skills-ui/skills\`. Resolve references relative to that Skill. Honor the actual project Profile; do not infer a table migration from a Skill match.
3. Run the actual scan/check/fix tools with the same \`--run-id\`. For a code gate use \`wl-ui scan --target <path> --fail-on-error --run-id <id>\`. An ordinary Vue edit still receives UI baseline checks; tasks outside the domain are not applicable.
4. End with \`wl-ui status --run-id <id>\` and report execution separately from validation. Zero files, skipped checks, dependency-only checks and unresolved review items are not proof of all UI constraints passing.

Installation and model declarations do not prove host discovery or reading. Diagnose static entries with \`node node_modules/@agile-team/wl-skills-ui/bin/wl-ui.js doctor-host --host <当前实际宿主ID> --json\`: ZCode 使用 \`zcode\`，Codex 使用 \`codex\`；其他宿主使用其真实 ID，不用模型名、VS Code 或安装默认值代替当前宿主。Report a missing local package before attempting tools; do not silently install another package or claim success.
For ambiguous results, use the existing request to distinguish an explicit combination from an unclear choice; explicitly requested stages can be routed separately with the same runId. Ask only when a material choice remains unresolved. For gap, needs-context or \`ready: false\`, resolve the reported uncertainty/missing own assets before implementing the selected workflow. Routing has a published catalog and explicit unsupported-intent boundary, rather than complete natural-language coverage.
`;
}
