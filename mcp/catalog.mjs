/** MCP registrations: server tools/list, validation, recording and protocol inventory use this module. */
import { listProfiles } from "../standards/profiles-loader.mjs";

const PROFILE_ENUM = listProfiles().map((profile) => profile.id);
const PROFILE_ENUM_DESC = `${PROFILE_ENUM.join("、")}；默认读取配置或按依赖检测`;
const RECEIPT_ONLY = { write: "persist", readOnly: false, sideEffects: "只读业务输入；写 .wl-skills-ui/runs/ 本包执行回执", effects: { business: "none", records: true } };

export const MCP_TOOLS = [
  ...["task", "route", "explain", "status", "doctor-host"].map((action) => ({
    name: `wl_ui_${action.replace(/-/g, "_")}`,
    taskAction: action, write: action === "task" ? "persist" : "readonly", readOnly: action !== "task",
    sideEffects: action === "task" ? "适用任务写 .wl-skills-ui/runs/ 计划；不执行检查" : "无写入",
    effects: { business: "none", records: action === "task" },
    description: `UI ${action}: task decision, own execution status or static host diagnosis; host loading remains unverified.`,
    inputSchema: { type: "object", properties: { task: { type: "string" }, targets: { type: "array", items: { type: "string" } }, runId: { type: "string" }, project: { type: "string" }, profile: { type: "string", enum: PROFILE_ENUM }, host: { type: "string" }, skill: { type: "string" } } },
  })),
  {
    name: "wl_ui_check",
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
    sideEffects: "首次扫描写本包执行回执并保存内存快照；resultCursor 续取只读、不重扫或新增回执",
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
        limit: { type: "integer", minimum: 1, maximum: 500, description: "compact-v2 每页最多条数，默认 20；字节预算可能减少实际返回数" },
        cursor: { type: "string", pattern: "^[0-9]+$", description: "旧数字位置，每次仍独立扫描；原快照续取使用 resultCursor" },
        resultCursor: { type: "string", pattern: "^[a-f0-9]{32}:[0-9]+$", description: "读取同进程原扫描快照，不重扫；使用 response.nextResultCursor，summary 的游标指向明细第一页" },
        maxBytes: { type: "integer", minimum: 4096, maximum: 65536, description: "summary/compact-v2 payload 字节预算，默认 12000；不含 JSON-RPC/宿主元信息" },
      },
      required: [],
    },
  },
  {
    name: "wl_ui_fix_dry_run",
    ...RECEIPT_ONLY,
    sideEffects: "写本包执行回执；仅预演，不修改源文件或创建修复快照",
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
    ...RECEIPT_ONLY,
    description:
      "输出 wl-skills-ui 推荐触发语和下一步操作，引导 AI 加载正确 Skill/Flow。",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "wl_ui_route_intent",
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
    sideEffects: "写本包执行回执；MCP 契约提取不写契约文件",
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
    ...RECEIPT_ONLY,
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
    ...RECEIPT_ONLY,
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

for (const tool of MCP_TOOLS) tool.inputSchema.properties.runId ||= { type: "string", description: "Correlate this real tool call with a task run" };
for (const tool of MCP_TOOLS.filter((entry) => ["wl_ui_scan", "wl_ui_fix_dry_run"].includes(entry.name))) tool.inputSchema.additionalProperties = false;

export function publicMcpTools() {
  return MCP_TOOLS.map(({ name, description, inputSchema, readOnly }) => ({ name, description, inputSchema, annotations: { readOnlyHint: readOnly, destructiveHint: false } }));
}

export function publicMcpInventory() {
  return MCP_TOOLS.map(({ name, description, inputSchema, write, readOnly, sideEffects, effects }) => ({
    name, summary: description, write, readOnly, sideEffects, effects, inputSchema,
    execution: "programmatic", mapping: `wl-ui-mcp tools/call ${name}`,
  }));
}
