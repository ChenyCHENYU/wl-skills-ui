#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const PKG = require("../package.json");

const TOOLS = [
  {
    name: "wks_ui_check",
    description:
      "检查当前项目是否已正确接入 @agile-team/wk-skills-ui 的 tokens/styles/runtime。",
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
    name: "wks_ui_scan",
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
        mode: { type: "string", description: "skin 或 native" },
        layer: { type: "string", description: "L0,L1,L2,L3,L4 逗号分隔" },
        vendor: { type: "string", description: "vendor 过滤，逗号分隔" },
        output: {
          type: "string",
          description: "markdown 或 json，默认 markdown",
        },
        exempt: { type: "string", description: "豁免配置文件路径" },
      },
      required: [],
    },
  },
  {
    name: "wks_ui_fix_dry_run",
    description: "预览 wk-skills-ui 自动修复会修改哪些文件，不实际写入。",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "扫描目录，默认 src" },
        project: {
          type: "string",
          description: "项目根目录，默认 WL_PROJECT_ROOT 或当前目录",
        },
      },
      required: [],
    },
  },
  {
    name: "wks_ui_skill_prompt",
    description:
      "输出 wk-skills-ui 推荐触发语和下一步操作，引导 AI 加载正确 Skill/Flow。",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "wks_ui_route_intent",
    description:
      "根据用户自然语言判断 UI 样式治理意图，并推荐 wk-skills-ui flow/tool/skill。",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "用户自然语言需求" },
      },
      required: ["text"],
    },
  },
  {
    name: "wks_ui_recommend_flow",
    description:
      "根据 wks_ui_scan --output json 的扫描结果推荐后续 flow、tool 和 wl-skills-kit 桥接动作。",
    inputSchema: {
      type: "object",
      properties: {
        scanJson: { type: "string", description: "扫描 JSON 字符串" },
      },
      required: ["scanJson"],
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
  return resolve(args.project || process.env.WL_PROJECT_ROOT || process.cwd());
}

function runScanner(command, args = {}) {
  const root = projectRoot(args);
  const scanner = join(PKG_ROOT, "scanner", "index.mjs");
  const cliArgs = [scanner, command];
  if (command === "check") {
    cliArgs.push("--project", root);
  } else {
    cliArgs.push("--project", root);
    cliArgs.push("--target", resolve(root, args.target || "src"));
    if (args.mode) cliArgs.push("--mode", String(args.mode));
    if (args.layer) cliArgs.push("--layer", String(args.layer));
    if (args.vendor) cliArgs.push("--vendor", String(args.vendor));
    if (args.output) cliArgs.push("--output", String(args.output));
    if (args.exempt) cliArgs.push("--exempt", String(args.exempt));
    if (command === "fix") cliArgs.push("--dry-run");
  }
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, cliArgs, { cwd: root, shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      const text = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      resolvePromise({ code, text: text || "(无输出)" });
    });
  });
}

function skillPrompt() {
  return "# wk-skills-ui Skill 触发提示\n\n核心原则：wk-skills-ui 优先保证样式绝对管控，覆盖纯 Element Plus、老项目封装、Base*/jh*/C_* 以及 wl-skills-kit 最佳写法。\n\n推荐触发语：\n\n- 新项目：用 wk-ui 的 new-project-init 流程接入统一 UI 风格\n- 老项目：用 wk-ui 的 legacy-skin-align 流程做老项目化妆对齐\n- 只审计：用 wk-ui 的 full-audit 流程扫描当前项目，不修改代码\n- 渐进迁移：用 wk-ui 的 progressive-migrate 流程从 skin 迁移到 runtime\n- 表格/弹窗/卡片/Tab/详情/树/抽屉/上传/步骤条/更多操作样式不统一：先调用 wks_ui_route_intent，再调用 wks_ui_scan\n- 单点修复：用 wk-ui 的 vendors/base-table、element/el-table 或 element 组件族 skill 检查当前文件\n\n执行约束：\n\n- 扫描只读，修复前必须先给用户摘要并等待确认\n- 老项目 skin 模式只处理 L0/L1/L2，不改业务布局和 runtime\n- 若扫描结果涉及页面结构、BaseTable render-type/cid 或 renderOps，视觉统一后再建议 wl-skills-kit validate-page / doctor-ui。";
}

function routeIntent(args = {}) {
  const text = String(args.text || "").toLowerCase();
  const matchedComponents = [];
  const recommendedSkills = [];
  const recommendedTools = ["wks_ui_scan"];
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
    [/卡片|card/, "el-card", "element/el-card"],
    [/tab|标签页|页签/, "el-tabs", "element/el-tabs"],
    [/详情|描述|descriptions/, "el-descriptions", "element/el-descriptions"],
    [/树|tree/, "el-tree", "element/el-tree"],
    [/抽屉|drawer/, "el-drawer", "element/el-drawer"],
    [/上传|附件|upload/, "el-upload", "element/el-upload"],
    [/步骤|流程|审批|steps/, "el-steps", "element/el-steps"],
    [
      /下拉|更多|popover|tooltip|dropdown|提示/,
      "el-overlay",
      "element/el-overlay",
    ],
    [
      /菜单|面包屑|导航|menu|breadcrumb/,
      "el-navigation",
      "element/el-navigation",
    ],
    [
      /空状态|异常|警告|角标|empty|result|alert|badge/,
      "el-feedback",
      "element/el-feedback",
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
    recommendedTools.push("wks_ui_fix_dry_run");
  } else if (/迁移|runtime|token|硬编码|颜色/.test(text)) {
    intent = "progressive-migrate";
    recommendedFlow = "progressive-migrate";
  } else if (/新项目|初始化|接入/.test(text)) {
    intent = "new-project-init";
    recommendedFlow = "new-project-init";
    recommendedTools.unshift("wks_ui_check");
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
      "先执行 wks_ui_scan 做只读扫描，确认 componentCoverage 与 issues",
      "如需修复，先执行 wks_ui_fix_dry_run 预览，不直接写入",
      shouldUseKit
        ? "若要规范化页面结构，再桥接 wl-skills-kit validate-page / doctor-ui"
        : "优先由 wk-skills-ui skin/native 样式层完成视觉统一",
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
      : "当前由 wk-skills-ui 负责样式绝对管控即可，不强制桥接 wl-skills-kit。",
    commands: needed
      ? ["wl-skills validate-page <page>", "wl-skills doctor-ui <project>"]
      : [],
  };
}

function recommendFromScan(args = {}) {
  const parsed = JSON.parse(String(args.scanJson || "{}"));
  const issues = parsed.issues || [];
  const coverage = parsed.componentCoverage || {};
  const rules = new Set(issues.map((issue) => issue.rule));
  const categories = new Set(issues.map((issue) => issue.category));
  const recommendedFlows = new Set(
    parsed.recommendations?.recommendedFlows || [],
  );
  const nextActions = new Set(parsed.recommendations?.nextActions || []);

  if (issues.length > 0) {
    recommendedFlows.add("legacy-skin-align");
    nextActions.add(
      "先用 skin/native 样式层完成视觉统一，再判断是否需要代码级修复",
    );
    nextActions.add("修复前调用 wks_ui_fix_dry_run 并向用户展示摘要");
  } else {
    recommendedFlows.add("full-audit");
    nextActions.add("当前扫描未发现规则问题，建议保留周期性 full-audit");
  }

  if (categories.has("color") || categories.has("token")) {
    recommendedFlows.add("progressive-migrate");
    nextActions.add(
      "硬编码色值应迁移为 wk-skills-ui tokens 或 Element Plus 变量",
    );
  }

  const shouldUseKit = hasKitBridgeNeed(rules, coverage);
  return {
    recommendedFlows: [...recommendedFlows].sort(),
    recommendedSkills:
      parsed.recommendedSkills || coverage.recommendedSkills || [],
    componentCoverage: coverage,
    recommendedTools:
      issues.length > 0
        ? ["wks_ui_scan", "wks_ui_fix_dry_run"]
        : ["wks_ui_scan"],
    kitBridge: buildKitBridge(shouldUseKit),
    nextActions: [...nextActions].sort(),
  };
}

async function dispatchTool(id, name, args) {
  try {
    if (name === "wks_ui_check") {
      const result = await runScanner("check", args);
      sendResult(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.code !== 0,
      });
      return;
    }
    if (name === "wks_ui_scan") {
      const result = await runScanner("scan", args);
      sendResult(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.code !== 0,
      });
      return;
    }
    if (name === "wks_ui_fix_dry_run") {
      const result = await runScanner("fix", args);
      sendResult(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.code !== 0,
      });
      return;
    }
    if (name === "wks_ui_skill_prompt") {
      sendResult(id, { content: [{ type: "text", text: skillPrompt() }] });
      return;
    }
    if (name === "wks_ui_route_intent") {
      sendResult(id, {
        content: [
          { type: "text", text: JSON.stringify(routeIntent(args), null, 2) },
        ],
      });
      return;
    }
    if (name === "wks_ui_recommend_flow") {
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
        serverInfo: { name: "wk-skills-ui", version: PKG.version },
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
