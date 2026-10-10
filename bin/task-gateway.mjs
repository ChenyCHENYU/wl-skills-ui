export const GATEWAY_PATH = ".agents/skills/wl-skills-ui/SKILL.md";

export function taskGateway() {
  return `---
name: wl-skills-ui
description: Only for adopted PC Vue/Web admin projects; excludes mobile and unadopted projects. Vue and Element Plus UI consistency, design tokens, styles, component layout and visual rule checks. Decide the applicable UI workflow and verify actual source files using local package tools.
---

# wl-skills-ui task gateway
For one user task reuse the same \`--run-id\` or \`WL_TASK_RUN_ID\` across installed applicable packages. Do not install unused sibling packages or create unrelated IDs.

先确认目标项目自身的接入证据（本包安装清单、直接依赖或 \`.wl-skills-scope.json\` 显式启用），再判定任务。只在目标已接入且平台适用时读取规则；父目录安装、兄弟包、Vue 文件或触发词不能证明接入。未接入的开源项目不套用规则、不建议自动安装；UniApp/小程序/App/PDA/移动 H5 不适用。跨项目目标分别判定，沿最近项目边界停止，不能越过未接入子项目找父清单。工具返回 \`scope\` 作为静态范围证据，宿主加载仍需实际事件。

动作边界：显示真实回执中的 \`action.mode\`、\`checksAllowed\` 和 \`ruleRefs\`。历史引用与明确禁止的动作不参与技能评分。只解释或只列计划时可以读取相关规范，不能因为命中了生成/修复技能就自动检查或改写业务文件。检查许可仅表示任务动作；业务写入仍遵循用户授权和本包原有流程。非适用项目不加载规范。

多项目工作区先沿目标路径向上找到本包安装清单与项目 AGENTS，切到该项目根再调用工具；不要以聚合工作区根代替 projectRoot，也不要在聚合根安装。不同项目分别保存项目身份，同一用户任务复用 runId。

1. Start each relevant task from its project root with \`node node_modules/@agile-team/wl-skills-ui/bin/wl-ui.js task "<task>" --target <path> --json\`. Before editing, visibly show the returned \`notice\`: actual package/version, decision, Skill or baseline, rule IDs/names, target, runId and unverified checks. Include baseline and gaps. Report missing/unsupported local commands and version drift explicitly. A routing decision does not execute checks.
2. Read \`node_modules/@agile-team/wl-skills-ui/SKILL.md\`, then only the selected canonical Skill under \`node_modules/@agile-team/wl-skills-ui/skills\`. Resolve references relative to that Skill. Honor the actual project Profile; do not infer a table migration from a Skill match.
3. Run the actual scan/check/fix tools with the same \`--run-id\`. For a code gate use \`wl-ui scan --target <path> --fail-on-error --run-id <id>\`. An ordinary Vue edit still receives UI baseline checks; tasks outside the domain are not applicable.
4. End with \`wl-ui status --run-id <id>\` and report execution separately from validation. Zero files, skipped checks, dependency-only checks and unresolved review items are not proof of all UI constraints passing.

Installation and model declarations do not prove host discovery or reading. \`wl-ui doctor-host\` diagnoses static entries only. Report a missing local package before attempting tools; do not silently install another package or claim success.
For ambiguous, gap, needs-context or \`ready: false\`, resolve the reported uncertainty/missing own assets before implementing the selected workflow. Routing has a published catalog and explicit unsupported-intent boundary, rather than complete natural-language coverage.
`;
}
