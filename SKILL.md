---
name: wl-skills-ui
description: |
  Only for PC Vue admin projects that adopted wl-skills-ui; excludes mobile and unadopted projects.
  Audit and align Vue 3 + Element Plus enterprise UI projects with deterministic
  scanning, profile-aware fixes, design tokens, vendor adapters, and runtime guards.
  Use for UI consistency, legacy skin migration, rule diagnostics, or safe UI fixes.
---

先确认目标项目自身的接入证据（本包安装清单、直接依赖或 `.wl-skills-scope.json` 显式启用），再判定任务。只在目标已接入且平台适用时读取规则；父目录安装、兄弟包、Vue 文件或触发词不能证明接入。未接入的开源项目不套用规则、不建议自动安装；UniApp/小程序/App/PDA/移动 H5 不适用。跨项目目标分别判定，沿最近项目边界停止，不能越过未接入子项目找父清单。工具返回 `scope` 作为静态范围证据，宿主加载仍需实际事件。


# wl-skills-ui

Use deterministic project facts before reading or editing business source. Rules,
severity, enabled profiles, and fixability come from machine-readable manifests;
do not reconstruct them from memory or duplicate their wording.

## Start here

Start every task with `npx wl-ui task "<task>" --target <path>`. Read the selected canonical Skill and required rules only after resolving ambiguous/gap/needs-context or missing own assets. A match is a plan, not evidence of execution. Use the returned `--run-id` (or `WL_TASK_RUN_ID`) for real CLI/MCP tools and finish with `npx wl-ui status --run-id <id>`. Reuse the same ID across installed applicable packages without installing unused sibling packages. Report execution and validation separately, including skipped checks and stale evidence; host discovery/reading remain unverified without host events.

```bash
# Small summary first; does not modify files
npx wl-ui scan --project . --target src --output summary --parser auto

# Fetch bounded issue detail only when needed
npx wl-ui scan --project . --target src --output compact-v2 --limit 50

# Inspect one authoritative rule
npx wl-ui rules describe R001

# Preview deterministic fixes
npx wl-ui fix --project . --target src --dry-run
```

When MCP is available, prefer `wl_ui_scan`, `wl_ui_describe_rule`, and
`wl_ui_fix_dry_run` over manually rereading the project.

## Profiles

Profiles compose capabilities and vendor adapters. Prefer an explicit project
`.wl-ui-profile.json`; otherwise let the scanner detect and report a profile.

| Profile | Use |
| --- | --- |
| `native-element` | Native Element Plus projects without legacy vendor adapters |
| `legacy-jh-element` | jh/Base legacy projects that do not use AG Grid |
| `legacy-jh-ag` | jh/Base legacy projects that intentionally use AG Grid |
| `native-jh-ag` | Platform sub-apps: native runtime on jh/Base vendors, AG Grid via npm or federation remote |

AG Grid is an optional adapter. Rules such as R021 and AG-specific runtime guards
must not run outside the AG profiles (`legacy-jh-ag`, `native-jh-ag`).

Strict profile checks only apply to explicitly declared profiles (`--profile`,
`.wl-ui-profile.json`, or the install manifest); dependency detection is a
suggestion and never turns a previously green project red.

## Decision boundary

Use scripts or gates for outcomes with one provably correct result:

- changed-file selection, SFC parsing, known attribute checks, rule metadata;
- exact static button-icon mappings and known design-token replacements;
- profile compatibility, package contents, generated-file sync, and visual geometry;
- dry-run plans, snapshots, rollback, idempotence, and post-fix verification.

Use AI plus human confirmation when several business-valid outcomes exist:

- operation-column restructuring and dynamic button intent;
- status/category semantics, dictionary choice, and business color meaning;
- unknown composite component ownership, exceptions, and layout trade-offs;
- switching table technology or adding an exemption/profile override.

## Safe workflow

1. Scan using `summary` or changed-only scope.
2. Read only the recommended Skill and affected rule definitions.
3. Report error/warning counts and proposed scope.
4. Preview fixes. Apply only the approved rule/file/profile plan.
5. Re-scan and record remaining manual or exempted items.

Never edit business files during scan/audit. Never apply AG Grid migration merely
because a `BaseTable` exists. A failed changed-file calculation must be reported;
AI/MCP callers must not silently expand it to a full-project response.

## Load details only when relevant

- New project: `skills/_flows/new-project-init.md`
- Legacy skin: `skills/_flows/legacy-skin-align.md`
- Full audit: `skills/_flows/full-audit.md`
- Progressive migration: `skills/_flows/progressive-migrate.md`
- Element table/form/dialog/tag: `skills/element/*/SKILL.md`
- Component families: `skills/element/component-family/SKILL.md`
- Vendor adapters: `skills/vendors/*/SKILL.md`
- Scanner/fixer/audit: `skills/ops/*/SKILL.md`
- Runtime and tokens: `skills/runtime/*/SKILL.md`

Authoritative machine-readable sources:

- `standards/rules.json`
- `standards/profiles.json`
- `standards/component-structures.json`
- `skills/_meta/_compat/vendors.json`

## Completion checks

For package changes, run `pnpm verify` and the relevant browser contract. For a
business-project fix, require the same dry-run plan, a recoverable snapshot, a
post-fix scan, and no new error-level findings in the selected profile.
