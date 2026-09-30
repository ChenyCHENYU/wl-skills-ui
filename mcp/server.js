#!/usr/bin/env node
import { createRequire } from "node:module";
import { isAbsolute, join, relative, resolve } from "node:path";
import { scanProject, expandRuleRange } from "../scanner/engine.mjs";
import { generateReport } from "../scanner/report.mjs";
import { checkIntegration } from "../scanner/integration.mjs";
import { runFix } from "../scanner/fix.mjs";
import { listProfiles, resolveProjectProfile } from "../standards/profiles-loader.mjs";

// profile 枚举由 profiles.json 事实源动态生成，新增 profile 无需改这里。
const PROFILE_ENUM = listProfiles().map((profile) => profile.id);
const PROFILE_ENUM_DESC = `${PROFILE_ENUM.join("、")}；默认读取配置或按依赖检测`;

const require = createRequire(import.meta.url);
const PKG = require("../package.json");

const TOOLS = [
  {
    name: "wl_ui_check",
    description:
      "检查当前项目是否已正确接入 @agile-team/wl-skills-ui 的 tokens/styles/runtime。",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "项目根目录，默认 WL_PROJECT_ROOT 或当前目录",
        },
        profile: {
          type: "string",
          enum: PROFILE_ENUM,
          description: `显式 UI Profile；${PROFILE_ENUM_DESC}`,
        },
      },
      required: [],
    },
  },
  {
    name: "wl_ui_scan",
    description:
      "扫描 Vue 项目的 UI 风格偏差，支持 skin/native、layer、vendor、exempt 过滤。",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "扫描目录，默认 src" },
        project: {
          type: "string",
          description: "项目根目录，默认 WL_PROJECT_ROOT 或当前目录",
        },
        mode: {
          type: "string",
          enum: ["skin", "native"],
          description: "skin 或 native",
        },
        profile: {
          type: "string",
          enum: PROFILE_ENUM,
          description: `显式 UI Profile；${PROFILE_ENUM_DESC}`,
        },
        layer: { type: "string", description: "L0,L1,L2,L3,L4 逗号分隔" },
        vendor: { type: "string", description: "vendor 过滤，逗号分隔" },
        output: {
          type: "string",
          enum: ["summary", "compact-v2", "compact", "json", "markdown"],
          description: "summary、compact-v2、compact、json 或 markdown；默认 summary",
        },
        exempt: { type: "string", description: "豁免配置文件路径" },
        changedOnly: {
          type: "boolean",
          description: "仅扫描 Git 变更 Vue 文件；默认解析失败即报错，避免意外全量输出",
        },
        base: {
          type: "string",
          description: "增量对比基线，例如 origin/main；默认 HEAD",
        },
        parser: {
          type: "string",
          enum: ["auto", "fast", "sfc"],
          description: "auto（默认）、fast 或 sfc；auto 优先项目本地 compiler-sfc",
        },
        changedFallback: {
          type: "string",
          enum: ["error", "full"],
          description: "error（默认）或 full",
        },
        only: { type: "string", description: "仅扫描指定规则，支持 R031-R037" },
        skip: { type: "string", description: "跳过指定规则" },
        limit: { type: "number", description: "compact-v2 每页条数，默认 100" },
        cursor: { type: "string", description: "compact-v2 分页游标" },
      },
      required: [],
    },
  },
  {
    name: "wl_ui_fix_dry_run",
    description: "预览 wl-skills-ui 自动修复会修改哪些文件，不实际写入。",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "扫描目录，默认 src" },
        project: {
          type: "string",
          description: "项目根目录，默认 WL_PROJECT_ROOT 或当前目录",
        },
        profile: {
          type: "string",
          enum: PROFILE_ENUM,
          description: `显式 UI Profile；${PROFILE_ENUM_DESC}`,
        },
        only: { type: "string", description: "仅预览指定可修复规则" },
        skip: { type: "string", description: "跳过指定可修复规则" },
      },
      required: [],
    },
  },
  {
    name: "wl_ui_skill_prompt",
    description:
      "输出 wl-skills-ui 推荐触发语和下一步操作，引导 AI 加载正确 Skill/Flow。",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "wl_ui_route_intent",
    description:
      "根据用户自然语言判断 UI 样式治理意图，并推荐 wl-skills-ui flow/tool/skill。",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "用户自然语言需求" },
      },
      required: ["text"],
    },
  },
  {
    name: "wl_ui_detect_skin",
    description:
      "读取目标项目 package.json，识别 @jhlc/jh-ui 与 element-plus 版本配对，返回适配矩阵建议。",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "项目根目录，默认 WL_PROJECT_ROOT 或当前目录",
        },
      },
      required: [],
    },
  },
  {
    name: "wl_ui_list_rules",
    description:
      "列出 wl-skills-ui R-rule 全集（事实源：standards/rules.json）。可按 category / severity / autoFixable 过滤。",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "可选：table / button / form / dialog / tag / style / base / family / layout",
        },
        severity: {
          type: "string",
          description: "可选：error / warning / info / suggestion / review",
        },
        autoFixable: {
          type: "boolean",
          description: "可选：仅返回可自动修复的规则",
        },
      },
      required: [],
    },
  },
  {
    name: "wl_ui_describe_rule",
    description: "返回单条 R-rule 的完整定义（事实源：standards/rules.json）。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "规则 ID，例如 R001、R019" },
      },
      required: ["id"],
    },
  },
  {
    name: "wl_ui_drift",
    description:
      "对比基线与当前扫描 JSON，输出漂移报告（gained / fixed / regressed）。用于 PR 级增量门槛。",
    inputSchema: {
      type: "object",
      properties: {
        baselineJson: {
          type: "string",
          description: "基线扫描 JSON 字符串（.wl-baseline.json 的内容）",
        },
        currentJson: {
          type: "string",
          description: "当前扫描 JSON 字符串",
        },
      },
      required: ["baselineJson", "currentJson"],
    },
  },
  {
    name: "wl_ui_recommend_flow",
    description:
      "根据 wl_ui_scan 的 compact（默认）或 json 扫描结果推荐后续 flow、tool 和 wl-skills-kit 桥接动作。",
    inputSchema: {
      type: "object",
      properties: {
        scanJson: { type: "string", description: "扫描 JSON 字符串" },
      },
      required: ["scanJson"],
    },
  },
  {
    name: "wl_ui_contract_extract",
    description:
      "从单个 Vue 页面提取脱敏 ui-contract JSON；不返回源码、真实接口、业务字段或按钮原始文案。",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "目标项目内的 Vue 文件路径" },
        domain: { type: "string", description: "领域标识，例如 produce" },
        scenario: { type: "string", description: "可选场景，例如 query-table" },
        mode: {
          type: "string",
          enum: ["native", "skin"],
          description: "native（默认）或 skin",
        },
        parser: {
          type: "string",
          enum: ["auto", "fast", "sfc"],
          description: "auto（默认）、fast 或 sfc",
        },
        project: { type: "string", description: "项目根目录" },
      },
      required: ["path", "domain"],
    },
  },
  {
    name: "wl_ui_contract_validate",
    description:
      "校验 ui-contract schema、fingerprint 和脱敏边界，只读且不写文件。",
    inputSchema: {
      type: "object",
      properties: {
        contractJson: { type: "string", description: "ui-contract JSON 字符串" },
      },
      required: ["contractJson"],
    },
  },
  {
    name: "wl_ui_contract_match",
    description:
      "按领域、场景、模式、布局和组件族匹配本地 ui-contract 库，只返回摘要与相似度。",
    inputSchema: {
      type: "object",
      properties: {
        contractJson: { type: "string", description: "查询 ui-contract JSON 字符串" },
        library: { type: "string", description: "项目内契约库目录" },
        limit: { type: "number", description: "最大返回数，默认 5" },
        project: { type: "string", description: "项目根目录" },
      },
      required: ["contractJson", "library"],
    },
  },
];

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function projectRoot(args = {}) {
  const boundary = resolve(process.env.WL_PROJECT_ROOT || process.cwd());
  const requested = resolve(boundary, args.project || ".");
  const rel = relative(boundary, requested);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("project 必须位于 MCP 配置的 WL_PROJECT_ROOT 内");
  }
  return requested;
}

function projectPath(root, input, label) {
  const absolute = resolve(root, input);
  const rel = relative(root, absolute);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`${label} 必须位于项目根目录内`);
  }
  return absolute;
}

async function detectSkin(args = {}) {
  const root = projectRoot(args);
  const pkgPath = join(root, "package.json");
  const fs = require("node:fs");
  if (!fs.existsSync(pkgPath)) {
    return { ok: false, reason: `未找到 ${pkgPath}` };
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const loader = await import("../skills/_meta/_compat/loader.mjs");
  const vendors = loader.listCompatVendors();
  const evaluations = vendors.map((c) => ({
    compat: c,
    evaluation: loader.evaluateVendor(c, deps),
  }));
  const applicable = evaluations.filter(
    (e) => e.evaluation.verdict !== "not-applicable",
  );
  const overrides = loader.buildOverridesSnippet(
    applicable.map((e) => e.evaluation),
  );
  return {
    ok: true,
    project: pkg.name,
    vendors: evaluations.map(({ compat, evaluation }) => ({
      vendorId: compat.vendorId,
      vendorLabel: compat.vendorLabel,
      gatingPeer: compat.gatingPeer,
      verdict: evaluation.verdict,
      peers: evaluation.peers,
      conflictsWith: compat.conflictsWith,
      domAssumptions: compat.domAssumptions,
      note: compat.note,
    })),
    summary:
      applicable.length === 0
        ? "no-applicable-vendor"
        : applicable.every((e) => e.evaluation.verdict === "match")
          ? "all-match"
          : "has-mismatch",
    fixSnippet: overrides,
    recommendedScss: applicable.some(
      ({ compat }) => compat.vendorId === "jh" && deps["@jhlc/jh-ui"],
    )
      ? [
          "styles/vendors/_jh-ui.scss",
          "styles/vendors/_jh-tree.scss",
          "styles/vendors/_jh-pagination.scss",
          "styles/vendors/_jh-drag-col.scss",
        ]
      : ["styles/vendors/_base-components.scss"],
  };
}

function runScanner(command, args = {}) {
  const root = projectRoot(args);
  if (command === "check") {
    const resolution = resolveProjectProfile({
      projectRoot: root,
      profile: args.profile,
      mode: args.mode,
    });
    const checks = checkIntegration(root, resolution.profile);
    return {
      code: 0,
      text: JSON.stringify({
        schema: "wl-ui-check.v1",
        project: root,
        profile: { id: resolution.profile.id, source: resolution.source },
        checks,
      }),
    };
  }
  if (command === "fix") {
    const resolution = resolveProjectProfile({
      projectRoot: root,
      profile: args.profile,
      mode: args.mode,
    });
    const result = runFix({
      target: projectPath(root, args.target || "src", "target"),
      projectRoot: root,
      dryRun: true,
      profile: resolution.profile.id,
      only: args.only ? expandRuleRange(args.only) : undefined,
      skip: args.skip ? expandRuleRange(args.skip) : undefined,
    });
    return { code: 0, text: JSON.stringify(result) };
  }
  const result = scanProject({
    projectRoot: root,
    target: projectPath(root, args.target || "src", "target"),
    mode: args.mode,
    profile: args.profile,
    layer: args.layer,
    vendor: args.vendor,
    exempt: args.exempt ? projectPath(root, args.exempt, "exempt") : undefined,
    changedOnly: args.changedOnly,
    changedFallback: args.changedFallback || "error",
    base: args.base,
    parser: args.parser || "auto",
    only: args.only,
    skip: args.skip,
  });
  const text = generateReport(
    result.issues,
    result.fileCount,
    String(args.output || "summary"),
    {
      exemptFileCount: result.exemptFileCount,
      exemptedIssueCount: result.exemptedIssues.length,
      coverage: result.coverage,
      parsing: result.parsing,
      recommendations: result.recommendations,
      profile: { id: result.profile.id, source: result.profileSource },
      changed: result.changed,
      limit: args.limit,
      cursor: args.cursor,
    },
  );
  return { code: 0, text };
}

function skillPrompt() {
  return `# wl-skills-ui 路由

1. 调用 wl_ui_scan，默认 summary；需要明细时用 compact-v2 + limit/cursor。
2. 使用返回的 profile 与 recommendedSkills，只打开命中的局部 Skill。
3. 单条规则用 wl_ui_describe_rule 查询事实源。
4. 修复先调用 wl_ui_fix_dry_run；CLI 应使用同一 profile/only/skip 与 planHash 应用。

Profile：native-element（无 legacy/AG）、legacy-jh-element（legacy 无 AG）、legacy-jh-ag（显式 AG）。不要因 BaseTable 存在而推断或迁移 AG Grid。changed-only 失败默认终止，不静默扩大上下文。动态按钮、权限、状态字典、业务颜色、未知复合控件和表格技术迁移保留给 AI/人工确认。`;
}

function routeIntent(args = {}) {
  const text = String(args.text || "").toLowerCase();
  const matchedComponents = [];
  const recommendedSkills = [];
  const recommendedTools = ["wl_ui_scan"];
  let intent = "full-audit";
  let recommendedFlow = "full-audit";

  const componentRules = [
    [/表格|table|basetable|aggrid|ag-grid/, "el-table", "element/el-table"],
    [
      /表单|输入|查询|筛选|form|input|select|date/,
      "el-form",
      "element/el-form",
    ],
    [/弹窗|dialog|modal/, "el-dialog", "element/el-dialog"],
    [/卡片|card/, "el-card", "element/component-family"],
    [/tab|标签页|页签/, "el-tabs", "element/component-family"],
    [/详情|描述|descriptions/, "el-descriptions", "element/component-family"],
    [/树|tree/, "el-tree", "element/component-family"],
    [/抽屉|drawer/, "el-drawer", "element/component-family"],
    [/上传|附件|upload/, "el-upload", "element/component-family"],
    [/步骤|流程|审批|steps/, "el-steps", "element/component-family"],
    [
      /下拉|更多|popover|tooltip|dropdown|提示/,
      "el-overlay",
      "element/component-family",
    ],
    [
      /菜单|面包屑|导航|menu|breadcrumb/,
      "el-navigation",
      "element/component-family",
    ],
    [
      /空状态|异常|警告|角标|empty|result|alert|badge/,
      "el-feedback",
      "element/component-family",
    ],
  ];

  for (const [pattern, component, skill] of componentRules) {
    if (pattern.test(text)) {
      matchedComponents.push(component);
      recommendedSkills.push(skill);
    }
  }

  if (/老项目|旧项目|样式乱|不统一|化妆|统一视觉|skin/.test(text)) {
    intent = "legacy-skin-align";
    recommendedFlow = "legacy-skin-align";
    recommendedTools.push("wl_ui_fix_dry_run");
  } else if (/迁移|runtime|token|硬编码|颜色/.test(text)) {
    intent = "progressive-migrate";
    recommendedFlow = "progressive-migrate";
  } else if (/新项目|初始化|接入/.test(text)) {
    intent = "new-project-init";
    recommendedFlow = "new-project-init";
    recommendedTools.unshift("wl_ui_check");
  }

  const shouldUseKit =
    /生成|重构|规范化|菜单|权限|字典|validate|doctor|kit|basetable|renderops/.test(
      text,
    );
  return {
    intent,
    matchedComponents: [...new Set(matchedComponents)],
    recommendedFlow,
    recommendedSkills: [...new Set(recommendedSkills)],
    recommendedTools: [...new Set(recommendedTools)],
    shouldUseKit,
    nextActions: [
      "先执行 wl_ui_scan（默认 summary）确认 profile、规则分布与 recommendedSkills",
      "如需明细，用 compact-v2 + limit/cursor；如需修复，先执行 wl_ui_fix_dry_run",
      shouldUseKit
        ? "若要规范化页面结构，再桥接 wl-skills-kit validate-page / doctor-ui"
        : "优先由 wl-skills-ui 当前 Profile 完成视觉统一",
    ],
  };
}

function hasKitBridgeNeed(rules, coverage) {
  return (
    rules.has("R013") ||
    rules.has("R021") ||
    rules.has("R022") ||
    (coverage.layouts || []).length > 0 ||
    (coverage.businessScenarios || []).some((item) =>
      ["query-table", "tree-table", "dialog-form"].includes(item),
    )
  );
}

function buildKitBridge(needed) {
  return {
    needed,
    reason: needed
      ? "扫描结果涉及页面结构、BaseTable 或操作列规范，建议视觉统一后桥接 wl-skills-kit。"
      : "当前由 wl-skills-ui 负责样式绝对管控即可，不强制桥接 wl-skills-kit。",
    commands: needed
      ? ["wl-skills validate-page <page>", "wl-skills doctor-ui <project>"]
      : [],
  };
}

function issuesFromScan(parsed) {
  if (Array.isArray(parsed.issues)) return parsed.issues;
  const compactV2 = parsed.schema === "wl-ui-scan.compact.v2";
  return Object.entries(parsed.issuesByFile || {}).flatMap(([file, items]) =>
    items.map((item) => {
      if (compactV2) {
        const [line, rule, description] = item;
        const [severity, suggestion, category] = parsed.ruleCatalog?.[rule] || [];
        return { file, line, rule, severity, description, suggestion, category };
      }
      const [line, rule, severity, description, suggestion] = item;
      return { file, line, rule, severity, description, suggestion };
    }),
  );
}

function coverageFromScan(parsed) {
  if (parsed.componentCoverage) return parsed.componentCoverage;
  if (!parsed.coverage) return {};
  return {
    ...parsed.coverage,
    businessScenarios: parsed.coverage.scenarios || [],
    recommendedSkills: parsed.skills || [],
  };
}

function addIssueRecommendations(issues, total, recommendedFlows, nextActions) {
  if (total === 0) {
    recommendedFlows.add("full-audit");
    nextActions.add("当前扫描未发现规则问题，建议保留周期性 full-audit");
    return;
  }
  recommendedFlows.add("legacy-skin-align");
  nextActions.add(
    "先用 skin/native 样式层完成视觉统一，再判断是否需要代码级修复",
  );
  nextActions.add("修复前调用 wl_ui_fix_dry_run 并向用户展示摘要");
}

function addCategoryRecommendations(categories, recommendedFlows, nextActions) {
  if (!categories.has("color") && !categories.has("token")) return;
  recommendedFlows.add("progressive-migrate");
  nextActions.add(
    "硬编码色值应迁移为 wl-skills-ui tokens 或 Element Plus 变量",
  );
}

function recommendFromScan(args = {}) {
  const parsed = JSON.parse(String(args.scanJson || "{}"));
  const issues = issuesFromScan(parsed);
  const coverage = coverageFromScan(parsed);
  const rules = new Set([
    ...issues.map((issue) => issue.rule),
    ...Object.keys(parsed.summary?.byRule || {}),
  ]);
  const categories = new Set([
    ...issues.map((issue) => issue.category),
    ...Object.keys(parsed.summary?.byCategory || {}),
  ]);
  const recommendedFlows = new Set(
    parsed.recommendations?.recommendedFlows || parsed.next?.flows || [],
  );
  const nextActions = new Set(
    parsed.recommendations?.nextActions ||
      parsed.next?.actions ||
      (Array.isArray(parsed.next) ? parsed.next : []),
  );

  addIssueRecommendations(
    issues,
    Number(parsed.summary?.total ?? issues.length),
    recommendedFlows,
    nextActions,
  );
  addCategoryRecommendations(categories, recommendedFlows, nextActions);

  const shouldUseKit = hasKitBridgeNeed(rules, coverage);
  return {
    recommendedFlows: [...recommendedFlows].sort(),
    recommendedSkills:
      parsed.recommendedSkills || parsed.skills || coverage.recommendedSkills || [],
    componentCoverage: coverage,
    recommendedTools:
      Number(parsed.summary?.total ?? issues.length) > 0
        ? ["wl_ui_scan", "wl_ui_fix_dry_run"]
        : ["wl_ui_scan"],
    kitBridge: buildKitBridge(shouldUseKit),
    nextActions: [...nextActions].sort(),
  };
}

async function dispatchContractTool(id, name, args) {
  if (!name.startsWith("wl_ui_contract_")) return false;
  const contractTools = await import("../scanner/ui-contract.mjs");
  if (name === "wl_ui_contract_extract") {
    const root = projectRoot(args);
    const contract = contractTools.extractUiContractFromFile(
      projectPath(root, args.path, "path"),
      {
        domain: args.domain,
        mode: args.mode || "native",
        parser: args.parser || "auto",
        projectRoot: root,
        scenario: args.scenario || undefined,
      },
    );
    sendResult(id, {
      content: [{ type: "text", text: JSON.stringify(contract, null, 2) }],
    });
    return true;
  }
  if (name === "wl_ui_contract_validate") {
    const validation = contractTools.validateUiContract(args.contractJson);
    sendResult(id, {
      content: [
        { type: "text", text: JSON.stringify(validation, null, 2) },
      ],
      isError: !validation.ok,
    });
    return true;
  }
  if (name === "wl_ui_contract_match") {
    const query = JSON.parse(args.contractJson);
    const validation = contractTools.validateUiContract(query);
    if (!validation.ok) {
      sendResult(id, {
        content: [
          { type: "text", text: JSON.stringify(validation, null, 2) },
        ],
        isError: true,
      });
      return true;
    }
    const candidates = contractTools.loadUiContractLibrary(
      projectPath(projectRoot(args), args.library, "library"),
    );
    const result = {
      schema: "wl-ui-contract-match.v1",
      query: query.id,
      candidates: candidates.length,
      matches: contractTools.matchUiContracts(query, candidates, {
        limit: args.limit || 5,
      }),
    };
    sendResult(id, {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    });
    return true;
  }
  return false;
}

async function dispatchTool(id, name, args) {
  try {
    if (name === "wl_ui_check") {
      const result = await runScanner("check", args);
      sendResult(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.code !== 0,
      });
      return;
    }
    if (name === "wl_ui_scan") {
      const result = await runScanner("scan", args);
      sendResult(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.code !== 0,
      });
      return;
    }
    if (name === "wl_ui_fix_dry_run") {
      const result = await runScanner("fix", args);
      sendResult(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.code !== 0,
      });
      return;
    }
    if (name === "wl_ui_skill_prompt") {
      sendResult(id, { content: [{ type: "text", text: skillPrompt() }] });
      return;
    }
    if (name === "wl_ui_route_intent") {
      sendResult(id, {
        content: [
          { type: "text", text: JSON.stringify(routeIntent(args), null, 2) },
        ],
      });
      return;
    }
    if (name === "wl_ui_detect_skin") {
      const result = await detectSkin(args);
      sendResult(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
      return;
    }
    if (name === "wl_ui_list_rules") {
      const loader = await import("../standards/rules-loader.mjs");
      const rules = loader.listRules({
        category: args.category,
        severity: args.severity,
        autoFixable: args.autoFixable,
      });
      const summary = rules.map((r) => ({
        id: r.id,
        severity: r.severity,
        category: r.category,
        title: r.title,
        autoFixable: !!r.autoFixable,
      }));
      sendResult(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { total: summary.length, rules: summary },
              null,
              2,
            ),
          },
        ],
      });
      return;
    }
    if (name === "wl_ui_describe_rule") {
      const loader = await import("../standards/rules-loader.mjs");
      const rule = loader.getRule(args.id);
      if (!rule) {
        sendResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { ok: false, reason: `规则 ${args.id} 未注册` },
                null,
                2,
              ),
            },
          ],
        });
        return;
      }
      sendResult(id, {
        content: [{ type: "text", text: JSON.stringify(rule, null, 2) }],
      });
      return;
    }
    if (name === "wl_ui_drift") {
      const { drift, formatDriftJson } = await import("../scanner/drift.mjs");
      try {
        const baseline = JSON.parse(args.baselineJson);
        const current = JSON.parse(args.currentJson);
        const result = drift(baseline, current);
        sendResult(id, {
          content: [{ type: "text", text: formatDriftJson(result) }],
        });
      } catch (e) {
        sendResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { ok: false, reason: String(e.message) },
                null,
                2,
              ),
            },
          ],
        });
      }
      return;
    }
    if (name === "wl_ui_recommend_flow") {
      sendResult(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(recommendFromScan(args), null, 2),
          },
        ],
      });
      return;
    }
    if (await dispatchContractTool(id, name, args)) return;
    sendError(id, -32601, `未知工具: ${name}`);
  } catch (e) {
    sendResult(id, {
      content: [{ type: "text", text: `❌ 工具执行异常: ${e.message}` }],
      isError: true,
    });
  }
}

process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      });
      continue;
    }
    const { id, method, params = {} } = msg;
    if (id === undefined || id === null) continue;
    if (method === "initialize") {
      sendResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "wl-skills-ui", version: PKG.version },
      });
    } else if (method === "tools/list") {
      sendResult(id, { tools: TOOLS });
    } else if (method === "tools/call") {
      dispatchTool(id, params.name, params.arguments || {});
    } else if (method === "ping") {
      sendResult(id, {});
    } else {
      sendError(id, -32601, `Method not found: ${method}`);
    }
  }
});
