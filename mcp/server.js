#!/usr/bin/env node
import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";
import { lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { scanProject, expandRuleRange } from "../scanner/engine.mjs";
import { generateReport } from "../scanner/report.mjs";
import { checkIntegration } from "../scanner/integration.mjs";
import { runFix } from "../scanner/fix.mjs";
import { resolveProjectProfile } from "../standards/profiles-loader.mjs";
import { runTaskAction, beginUiCheck, finishUiCheck, scanFacts, integrationFacts } from "../bin/task-integration.mjs";

import { MCP_TOOLS as TOOLS, publicMcpTools } from "./catalog.mjs";

const require = createRequire(import.meta.url);
const PKG = require("../package.json");
const { createResultPages, checkedInteger, fitPage } = require("./result-pages.cjs");
const { validateSchema } = require("./schema-validator.cjs");
const { validateRequest } = require("../bin/json-rpc-request.cjs");
const scanPages = createResultPages();

const executionContext = new AsyncLocalStorage();

function toolEvidence(result) {
  const active = executionContext.getStore();
  if (!active) return undefined;
  if (!active.evidence) active.evidence = finishUiCheck(active.execution, { exitCode: result.isError ? 1 : 0, validationStatus: "unverified", checks: [], summary: { reason: "Tool completed; this tool has no source-rule verification result" } });
  return active.evidence;
}

function scannerEvidence(facts) {
  const active = executionContext.getStore();
  active.evidence = finishUiCheck(active.execution, facts);
  return active.evidence;
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function sendResult(id, result) {
  const evidence = toolEvidence(result);
  send({ jsonrpc: "2.0", id, result: evidence ? { ...result, _meta: { wlExecution: evidence } } : result });
}

function sendError(id, code, message) {
  toolEvidence({ isError: true });
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function projectRoot(args = {}) {
  const boundary = realpathSync(resolve(process.env.WL_PROJECT_ROOT || process.cwd()));
  const requested = projectPath(boundary, args.project || ".", "project");
  return realpathSync(requested);
}

function projectPath(root, input, label) {
  const absolute = resolve(root, input);
  if (!isWithinRoot(root, physicalPath(absolute))) {
    throw new Error(`${label} 必须位于项目根目录内`);
  }
  return absolute;
}

function isWithinRoot(root, path) {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\") && !isAbsolute(rel);
}

function physicalPath(path) {
  let ancestor = path;
  for (;;) {
    try { lstatSync(ancestor); break; } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
  return resolve(realpathSync(ancestor), relative(ancestor, path));
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
  if (command === "scan" && args.resultCursor !== undefined) {
    if (Object.keys(args).some((key) => !["project", "resultCursor", "output", "limit", "maxBytes", "runId"].includes(key))) throw new Error("游标续取不能重设扫描条件，请仅传 resultCursor 与读取预算");
    const snapshot = scanPages.get(root, args.resultCursor);
    if (args.runId !== undefined && args.runId !== snapshot.value.summary.runId) throw new Error("游标与原扫描 runId 不匹配");
    return renderScanSnapshot(snapshot, args, args.output || "compact-v2");
  }
  if (command === "scan") {
    checkedInteger(args.limit, 20, 1, 500, "limit");
    checkedInteger(args.maxBytes, 12000, 4096, 65536, "maxBytes");
  }
  if (command === "check") {
    const resolution = resolveProjectProfile({
      projectRoot: root,
      profile: args.profile,
      mode: args.mode,
    });
    const checks = checkIntegration(root, resolution.profile);
    const evidence = scannerEvidence(integrationFacts(checks));
    return {
      code: 0,
      text: JSON.stringify({
        schema: "wl-ui-check.v1",
        project: root,
        profile: { id: resolution.profile.id, source: resolution.source },
        checks,
        ...evidence,
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
    const evidence = scannerEvidence({ exitCode: 0, validationStatus: "unverified", checks: [{ id: "fix-plan", status: "passed", reason: "Actual dry-run plan; no code applied or verified" }], summary: { dryRun: true } });
    return { code: 0, text: JSON.stringify({ ...result, ...evidence }) };
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
  const extras = {
      execution: scannerEvidence(scanFacts(result)),
      exemptFileCount: result.exemptFileCount,
      exemptedIssueCount: result.exemptedIssues.length,
      coverage: result.coverage,
      parsing: result.parsing,
      recommendations: result.recommendations,
      profile: { id: result.profile.id, source: result.profileSource },
      changed: result.changed,
      limit: args.limit,
      cursor: args.cursor,
  };
  const output = String(args.output || "summary");
  if (["summary", "compact-v2"].includes(output)) {
    const value = { issues: result.issues, summary: JSON.parse(generateReport(result.issues, result.fileCount, "summary", extras)), snapshotAt: new Date().toISOString() };
    const snapshot = { ...scanPages.put(root, value), offset: checkedInteger(args.cursor, 0, 0, result.issues.length, "cursor"), value };
    return renderScanSnapshot(snapshot, args, output);
  }
  const text = generateReport(result.issues, result.fileCount, output, extras);
  return { code: 0, text };
}

function renderScanSnapshot(snapshot, args, output) {
  if (!["summary", "compact-v2"].includes(output)) throw new Error("快照续取仅支持 summary/compact-v2；完整证据使用 CLI 工件");
  const { issues, summary, snapshotAt } = snapshot.value;
  if (snapshot.offset > issues.length) throw new Error("结果游标位置越界");
  const limit = checkedInteger(args.limit, 20, 1, 500, "limit");
  const maxBytes = checkedInteger(args.maxBytes, 12000, 4096, 65536, "maxBytes");
  const count = output === "summary" ? 0 : Math.min(limit, issues.length - snapshot.offset);
  const view = fitPage((returned) => {
    let parsed = { ...summary };
    let detailsTruncated = false;
    if (output === "compact-v2") {
      const ruleCatalog = {};
      const issuesByFile = {};
      const shorten = (text) => {
        const chars = Array.from(String(text || ""));
        if (chars.length <= 300) return text || "";
        detailsTruncated = true;
        return `${chars.slice(0, 300).join("")}…[truncated]`;
      };
      for (const issue of issues.slice(snapshot.offset, snapshot.offset + returned)) {
        ruleCatalog[issue.rule] ||= [issue.severity, shorten(issue.suggestion), issue.category || ""];
        (issuesByFile[issue.file] ||= []).push([issue.line, issue.rule, shorten(issue.description)]);
      }
      const nextOffset = snapshot.offset + returned;
      parsed = { ...parsed, schema: "wl-ui-scan.compact.v2",
        summary: { files: summary.summary.files, total: summary.summary.total, ...summary.summary.bySeverity },
        page: { cursor: snapshot.offset, limit, returned, nextCursor: nextOffset < issues.length ? String(nextOffset) : null },
        ruleCatalog, issuesByFile, next: summary.next.actions };
    }
    const next = output === "summary" ? snapshot.offset : snapshot.offset + returned;
    parsed.displayOnly = true;
    parsed.response = { snapshotAt, expiresAt: snapshot.expiresAt || null, maxBytes, detailsTruncated,
      nextResultCursor: snapshot.id && next < issues.length ? `${snapshot.id}:${next}` : null };
    return { text: JSON.stringify(parsed), page: { returned } };
  }, count, maxBytes);
  return { code: 0, text: view.text };
}

function skillPrompt() {
  return `# wl-skills-ui 路由

1. 调用 wl_ui_scan，默认 summary；需要明细时用 compact-v2 + resultCursor（response.nextResultCursor），直接读取原扫描快照。
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
    const root = projectRoot(args);
    const { contracts: candidates, ...library } = contractTools.readUiContractLibrary(
      projectPath(root, args.library, "library"), { projectRoot: root },
    );
    const result = {
      schema: "wl-ui-contract-match.v1",
      query: query.id,
      candidates: candidates.length,
      library,
      matches: library.complete ? contractTools.matchUiContracts(query, candidates, {
        limit: args.limit || 5,
      }) : [],
    };
    sendResult(id, {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !library.complete,
    });
    return true;
  }
  return false;
}

async function dispatchTool(id, name, args) {
  if (typeof name !== "string" || !name.trim()) return sendError(id, -32602, "工具 name 必须是非空 string");
  const tool = TOOLS.find((entry) => entry.name === name);
  if (!tool) return sendError(id, -32601, `未知工具: ${name}`);
  const input = validateSchema(tool.inputSchema, args);
  if (!input.valid) return sendError(id, -32602, `参数校验失败: ${input.errors.join("；")}`);
  if (name === "wl_ui_scan" || name === "wl_ui_fix_dry_run") {
    try {
      for (const key of ["only", "skip"]) if (args[key] !== undefined) expandRuleRange(args[key]);
      if (name === "wl_ui_scan") checkedInteger(args.cursor, 0, 0, Number.MAX_SAFE_INTEGER, "cursor");
    } catch (error) { return sendError(id, -32602, `参数校验失败: ${error.message}`); }
  }
  try {
    const root = projectRoot(args);
    if (tool.taskAction) return sendResult(id, { content: [{ type: "text", text: JSON.stringify(runTaskAction(tool.taskAction, { ...args, projectRoot: root })) }] });
    if (name === "wl_ui_scan" && args.resultCursor !== undefined) return dispatchToolBody(id, name, args);
    const target = args.target || args.path;
    const targets = target ? [relative(root, projectPath(root, target, "target")) || "."] : name === "wl_ui_check" ? ["."] : [];
    for (const key of ["exempt", "library"]) if (args[key]) projectPath(root, args[key], key);
    if (!tool.effects.records) return dispatchToolBody(id, name, args);
    const execution = beginUiCheck(root, targets, name, args.runId);
    return executionContext.run({ execution }, () => dispatchToolBody(id, name, { ...args, runId: execution.handle.metadata.runId }));
  } catch (error) {
    return sendResult(id, { content: [{ type: "text", text: `❌ 工具执行异常: ${error.message}` }], isError: true });
  }
}

async function dispatchToolBody(id, name, args) {
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
    const checked = validateRequest(msg);
    if (checked.error) { send(checked.error); continue; }
    if (checked.notification) continue;
    const { id, method, params = {} } = checked.request;
    if (method === "initialize") {
      sendResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "wl-skills-ui", version: PKG.version },
      });
    } else if (method === "tools/list") {
      sendResult(id, { tools: publicMcpTools() });
    } else if (method === "tools/call") {
      dispatchTool(id, params.name, params.arguments === undefined ? {} : params.arguments);
    } else if (method === "ping") {
      sendResult(id, {});
    } else {
      sendError(id, -32601, `Method not found: ${method}`);
    }
  }
});
