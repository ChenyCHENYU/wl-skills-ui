export const GATEWAY_PATH = ".agents/skills/wl-skills-ui/SKILL.md";

export function taskGateway() {
  return `---
name: wl-skills-ui
description: Vue and Element Plus UI consistency, design tokens, styles, component layout and visual rule checks. Decide the applicable UI workflow and verify actual source files using local package tools.
---

# wl-skills-ui task gateway
For one user task reuse the same \`--run-id\` or \`WL_TASK_RUN_ID\` across installed applicable packages. Do not install unused sibling packages or create unrelated IDs.

1. Start each task with \`node node_modules/@agile-team/wl-skills-ui/bin/wl-ui.js task "<task>" --target <path>\`. Retain the run ID and briefly explain the decision, applicable rules and unverified items. A routing decision does not execute checks.
2. Read \`node_modules/@agile-team/wl-skills-ui/SKILL.md\`, then only the selected canonical Skill under \`node_modules/@agile-team/wl-skills-ui/skills\`. Resolve references relative to that Skill. Honor the actual project Profile; do not infer a table migration from a Skill match.
3. Run the actual scan/check/fix tools with the same \`--run-id\`. For a code gate use \`wl-ui scan --target <path> --fail-on-error --run-id <id>\`. An ordinary Vue edit still receives UI baseline checks; tasks outside the domain are not applicable.
4. End with \`wl-ui status --run-id <id>\` and report execution separately from validation. Zero files, skipped checks, dependency-only checks and unresolved review items are not proof of all UI constraints passing.

Installation and model declarations do not prove host discovery or reading. \`wl-ui doctor-host\` diagnoses static entries only. Report a missing local package before attempting tools; do not silently install another package or claim success.
For ambiguous, gap, needs-context or \`ready: false\`, resolve the reported uncertainty/missing own assets before implementing the selected workflow. Routing has a published catalog and explicit unsupported-intent boundary, rather than complete natural-language coverage.
`;
}
