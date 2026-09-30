/**
 * runtime/core/renderers.ts — 通用渲染器 + 通用状态映射
 *
 * 依赖：vue / element-plus / @element-plus/icons-vue
 * 无业务耦合，可独立使用。
 */
import { h, type VNode, type Component } from "vue";
import { ElTag } from "element-plus";
import {
  View,
  Edit,
  Delete,
  Document,
  Upload,
  CircleCheck,
} from "@element-plus/icons-vue";

import type {
  JhTagNode,
  TagMapItem,
  OpItem,
  OpPreset,
  OpChip,
  OpLink,
} from "./types";

// ── 通用状态映射 ─────────────────────────────────────────────────────────────

/** 启用/停用 */
export const ENABLE_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "停用", type: "danger" },
  1: { label: "启用", type: "success" },
};

/** 审批状态（0=待审批, 1=已通过, 2=已驳回） */
export const AUDIT_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "待审批", type: "info" },
  1: { label: "已通过", type: "success" },
  2: { label: "已驳回", type: "danger" },
};

/** 核实状态（0=未核实, 1=已核实） */
export const VERIFY_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "未核实", type: "warning" },
  1: { label: "已核实", type: "success" },
};

/** 评价级别色（一/二/三/四/五 ←→ 1-5） */
export const RATING_LEVEL_COLORS: Record<
  string,
  { bg: string; color: string }
> = {
  一: {
    bg: "var(--wl-rating-lv1-bg, rgba(16,185,129,0.14))",
    color: "var(--wl-rating-lv1-color, #065F46)",
  },
  二: {
    bg: "var(--wl-rating-lv2-bg, rgba(59,130,246,0.14))",
    color: "var(--wl-rating-lv2-color, #1E40AF)",
  },
  三: {
    bg: "var(--wl-rating-lv3-bg, rgba(245,158,11,0.14))",
    color: "var(--wl-rating-lv3-color, #78350F)",
  },
  四: {
    bg: "var(--wl-rating-lv4-bg, rgba(249,115,22,0.14))",
    color: "var(--wl-rating-lv4-color, #9A3412)",
  },
  五: {
    bg: "var(--wl-rating-lv5-bg, rgba(239,68,68,0.14))",
    color: "var(--wl-rating-lv5-color, #991B1B)",
  },
  "1": {
    bg: "var(--wl-rating-lv1-bg, rgba(16,185,129,0.14))",
    color: "var(--wl-rating-lv1-color, #065F46)",
  },
  "2": {
    bg: "var(--wl-rating-lv2-bg, rgba(59,130,246,0.14))",
    color: "var(--wl-rating-lv2-color, #1E40AF)",
  },
  "3": {
    bg: "var(--wl-rating-lv3-bg, rgba(245,158,11,0.14))",
    color: "var(--wl-rating-lv3-color, #78350F)",
  },
  "4": {
    bg: "var(--wl-rating-lv4-bg, rgba(249,115,22,0.14))",
    color: "var(--wl-rating-lv4-color, #9A3412)",
  },
  "5": {
    bg: "var(--wl-rating-lv5-bg, rgba(239,68,68,0.14))",
    color: "var(--wl-rating-lv5-color, #991B1B)",
  },
};

// ── 渲染函数 ─────────────────────────────────────────────────────────────────

/** 渲染状态标签（defaultNode 格式 — jh-tag） */
export function renderTagNode(
  value: string | number | null | undefined,
  map: Record<string | number, TagMapItem>,
): JhTagNode | null {
  if (value === null || value === undefined || value === "") return null;
  const item = map[value];
  if (!item) return null;
  return { tag: "jh-tag", item: [{ title: item.label, type: item.type }] };
}

/** 渲染状态标签（defaultSlot 格式 — VNode） */
export function renderTagSlot(
  value: string | number | null | undefined,
  map: Record<string | number, TagMapItem>,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  const item = map[value];
  if (!item) return null;
  const typeClass = item.type
    ? `jh-cell-tag--${item.type}`
    : "jh-cell-tag--default";
  return h("span", { class: ["jh-cell-tag", typeClass] }, item.label);
}

/** 渲染分类/层级 plain outline Tag */
export function renderClassifyTag(
  value: string | number | null | undefined,
  map: Record<string | number, TagMapItem>,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  const item = map[value];
  if (!item) return null;
  return h(
    ElTag,
    { type: item.type || "primary", size: "small", effect: "plain" },
    () => item.label,
  );
}

// ── 字典驱动 Tag ─────────────────────────────────────────────────────────────
//
// 配色规则（优先级从高到低）：
//   1. 调用方显式传入 typeColorMap  →  使用显式配色（状态/等级列需注册语义色）
//   2. DICT_COLOR_REGISTRY[dictKey]  →  使用该 dictKey 已注册的配色方案
//   3. 自动轮转                      →  按 value 序号轮转 AUTO_TAG_PALETTE
//
// 语义约定：
//   状态列（*Status）  → 必须语义配色：success=正向终态, danger=负向, warning=中间, info=初始
//   等级列（*Level/*Grade）→ 必须梯度配色：danger→warning→primary→success（由重到轻）
//   分类列（*Type/*Category）→ 自动轮转即可，颜色仅辅助视觉扫描
//   方式/来源列（*Mode/*Src）→ 自动轮转即可
//
const AUTO_TAG_PALETTE = ["", "success", "warning", "info"] as const;
// "" = primary（Element Plus 默认蓝），与 common-preset 中 TagMapItem.type="" 含义一致

type DictResolver = (
  dictKey: string,
  value: string | number,
) => string | undefined;

let dictResolver: DictResolver | null = null;

/** 注入字典查询函数（解耦 Store 依赖） */
export function setDictResolver(fn: DictResolver): void {
  dictResolver = fn;
}

// ── 字典配色注册表 ───────────────────────────────────────────────────────────────
const DICT_COLOR_REGISTRY: Record<string, Record<string, string>> = {};

/** 注册单个 dictKey 的配色方案 */
export function registerDictColorMap(
  dictKey: string,
  colorMap: Record<string, string>,
): void {
  DICT_COLOR_REGISTRY[dictKey] = colorMap;
}

/** 批量注册 dictKey 配色方案 */
export function registerDictColorMaps(
  maps: Record<string, Record<string, string>>,
): void {
  Object.assign(DICT_COLOR_REGISTRY, maps);
}

/** 自动轮转配色：按 value 数值序号从 AUTO_TAG_PALETTE 取色 */
function autoTagType(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isNaN(n) && n > 0) {
    return AUTO_TAG_PALETTE[(n - 1) % AUTO_TAG_PALETTE.length];
  }
  // 非数字 value 用简单 hash 轮转（字符串化只做一次，避免循环内重复分配）
  const text = String(value);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return AUTO_TAG_PALETTE[Math.abs(hash) % AUTO_TAG_PALETTE.length];
}

/** 渲染动态字典分类 Tag，适用于 logicType=dict 的类型/来源/方式/规则类型等列 */
export function renderDictClassifyTag(
  value: string | number | null | undefined,
  dictKey: string,
  typeColorMap?: Record<string, string>,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  let label = String(value);
  if (dictResolver) {
    const resolved = dictResolver(dictKey, value);
    if (resolved) label = resolved;
  }
  // 配色优先级：显式 typeColorMap > DICT_COLOR_REGISTRY > 自动轮转
  const colorMap = typeColorMap ?? DICT_COLOR_REGISTRY[dictKey];
  const tagType = (colorMap?.[String(value)] ?? autoTagType(value)) as any;
  return h(
    ElTag,
    { type: tagType, size: "small", effect: "plain" },
    () => label,
  );
}

// ── 文案语义自动判色（wl-ui-ep 存量改造验证） ──────────────────────────────────
//
// 解决的问题：存量项目几十个列表页、上百个字典列，逐字段配色表不现实；
// 按字典渲染出的「文案关键词」判语义色即可覆盖 90% 场景，且零配色表维护。
//
// 判定顺序：
//   1. 状态/流转类关键词 → 浅色实心 Tag（语义色）
//   2. 分类/级别/形态类关键词 → 镂空 Tag（视觉权重低于状态）
//   3. 中性文案（单位/职务/周期等）→ 原样纯文本（零视觉变化，安全兜底）

/** 状态类关键词 → 实心 Tag 颜色（顺序即优先级：负向未达 > 未X中间态 > 危险 > 成功 > 警示 > 中性）
 *
 *  匹配纪律（wl-ui-ep 实战复盘）：
 *  - 单字词必须锚定：`^待`（待处理/待审批…但不匹配「招待费」）、`^(?:无|否|未)$`
 *    （仅整词命中，不匹配「无票运输」「未税」）；
 *  - 「未X」词表先行拦截，防止 success 组的 完成/通过/启用/达标 子串
 *    误命中「未完成/未通过/未启用/未达标」反向语义；
 *  - 不使用后行断言（lookbehind）——旧版 Safari 解析期即报错，库代码不可引入。 */
export const AUTO_STATUS_RULES: Array<[RegExp, string]> = [
  [/未通过|未达标|未合格/, "danger"],
  [/未启用|未激活|未完成|未处理|未审批|未核实|未提交|未确认|未支付|未领用/, "info"],
  [/驳回|拒绝|停用|作废|报废|超标|异常|超期|逾期|不合格|失效|无效|惩罚|隐患/, "danger"],
  [/已完成|已结束|完成|正常|有效|启用|合格|达标|通过|已处置|已确认|已审批|在用|使用中|奖励/, "success"],
  [/^待|进行中|审批中|整改中|处置中|评估中|调查|预警|管控|注意/, "warning"],
  [/新建|未开始|草稿|暂存|历史|撤回|^(?:无|否|未)$/, "info"],
];

/** 分类/级别/形态类关键词 → 镂空 Tag 颜色 */
export const AUTO_CLASSIFY_RULES: Array<[RegExp, string]> = [
  [/危废|危险|惩罚|事故|气态/, "danger"],
  [/奖励|安全/, "success"],
  [/一般|普通|计划外/, "warning"],
  [/液态|固态|半固态/, "info"],
];

const CLASSIFY_HINT = /类型|类别|级别|维度|形态|相态|气态|液态|固态/;

function matchRules(
  label: string,
  rules: Array<[RegExp, string]>,
): string | null {
  for (const [re, type] of rules) {
    if (re.test(label)) return type;
  }
  return null;
}

/**
 * 按已解析文案判语义 Tag 类型；中性文案返回 null（调用方保持纯文本）。
 * 返回 { type, plain }：plain=true 表示分类/级别类（镂空 outline，低视觉权重）。
 */
export function autoTagTypeByLabel(
  label: string,
  fieldName?: string,
): { type: string; plain: boolean } | null {
  const statusType = matchRules(label, AUTO_STATUS_RULES);
  if (statusType !== null) return { type: statusType, plain: false };
  const isClassify =
    CLASSIFY_HINT.test(label) || /type|level|category|class/i.test(fieldName ?? "");
  if (isClassify) {
    return { type: matchRules(label, AUTO_CLASSIFY_RULES) ?? "", plain: true };
  }
  return null;
}

/**
 * 文案语义 Tag（label 版）：已拿到展示文案时直接调用。
 * 状态类 → 浅色实心 Tag；分类/级别/形态类 → 镂空 Tag；
 * 中性文案原样返回字符串（defaultSlot 直接可用，零视觉变化兜底）。
 */
export function renderAutoTagByLabel(
  label: string,
  fieldName?: string,
): VNode | string {
  const tag = autoTagTypeByLabel(label, fieldName);
  if (tag === null) return label;
  return h(
    ElTag,
    { type: tag.type as any, size: "small", effect: tag.plain ? "plain" : "light" },
    () => label,
  );
}

/**
 * 文案语义 Tag（字典版）：传字典 key，内部经 setDictResolver 解析文案后判色。
 * 未注入 resolver 时按 value 原文判色（多数字典 value 即文案的存量场景可用）。
 */
export function renderAutoTag(
  value: string | number | null | undefined,
  dictKey: string,
  fieldName?: string,
): VNode | string | null {
  if (value === null || value === undefined || value === "") return null;
  let label = String(value);
  if (dictResolver) {
    const resolved = dictResolver(dictKey, value);
    if (resolved) label = resolved;
  }
  return renderAutoTagByLabel(label, fieldName ?? dictKey);
}

/** 蓝色圆角徽标（编号类） */
export function renderBadge(
  value: string | number | null | undefined,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  return h("span", { class: "jh-riskno-badge" }, String(value));
}

/** 绿色圆角徽标（数值类） */
export function renderCountBadge(
  value: string | number | null | undefined,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  return h("span", { class: "jh-count-badge" }, String(value));
}

/** 红色警示文本 */
export function renderDangerText(
  value: string | number | null | undefined,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  return h(
    "span",
    { style: { color: "var(--el-color-danger)", fontWeight: 500 } },
    String(value),
  );
}

/** 评价级别圆形徽标 */
export function renderRatingLevel(
  value: string | null | undefined,
): VNode | null {
  if (!value) return null;
  const clr = RATING_LEVEL_COLORS[value] ?? {
    bg: "var(--wl-rating-fallback-bg, rgba(107,114,128,0.12))",
    color: "var(--wl-rating-fallback-color, #374151)",
  };
  return h(
    "span",
    {
      class: "jh-rating-lv",
      style: { "--lv-bg": clr.bg, "--lv-color": clr.color } as any,
    },
    value,
  );
}

// ── 快捷函数 ─────────────────────────────────────────────────────────────────
export const renderEnableStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, ENABLE_STATUS_MAP);
export const renderAuditStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, AUDIT_STATUS_MAP);
export const renderVerifyStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, VERIFY_STATUS_MAP);

// ── renderOps ────────────────────────────────────────────────────────────────

const ICON_PRESETS = {
  view: { icon: View, cls: "jh-op-view", title: "查看" },
  edit: { icon: Edit, cls: "jh-op-edit", title: "编辑" },
  del: { icon: Delete, cls: "jh-op-del", title: "删除" },
  danger: { icon: Delete, cls: "jh-op-del", title: "删除" },
  log: { icon: Document, cls: "jh-op-log", title: "记录" },
  ok: { icon: CircleCheck, cls: "jh-op-ok", title: "审核" },
  send: { icon: Upload, cls: "jh-op-send", title: "提交" },
} as const;

function isOpVisible(item: OpItem): boolean {
  if (typeof item.show === "function") return item.show();
  return item.show !== false;
}

// dev 模式下对未识别的 type 给出警告（生产环境无副作用）。
// strict:false 的下游项目 TS 不会捕获，运行时守门必要。
const KNOWN_OP_TYPES = new Set([
  "view",
  "edit",
  "del",
  "danger",
  "log",
  "ok",
  "send",
  "chip",
  "link",
]);
const __opWarned = new Set<string>();
// 开发态探测在进程生命周期内不变，模块顶层只做一次。
// 方括号访问避免被 Vite define 的 process.env 文本替换误伤。
const __isDevRuntime = (() => {
  try {
    return (
      (globalThis as any)["process"]?.["env"]?.["NODE_ENV"] !== "production"
    );
  } catch {
    return true;
  }
})();
function warnUnknownOpType(item: OpItem): void {
  if (!__isDevRuntime) return;
  const t = (item as any).type;
  if (t && KNOWN_OP_TYPES.has(t)) return;
  const key = String(t);
  if (__opWarned.has(key)) return;
  __opWarned.add(key);
  console.warn(
    "[@agile-team/wl-skills-ui renderOps] 检测到未知的 type=\"" +
      key +
      "\"，将按 link 兜底渲染为文字按钮。\n" +
      "  请改为：view | edit | del | danger | log | ok | send | chip | link\n" +
      "  详见 runtime/core/types.ts OpItem 定义。"
  );
}

/** 渲染操作列按钮组（图标 + 胶囊 + 文字链接，自动 stopPropagation） */
export function renderOps(items: OpItem[]): VNode {
  const visible = items.filter(isOpVisible);
  if (visible.length) visible.forEach(warnUnknownOpType);
  const iconItems = visible.filter((i) => i.type in ICON_PRESETS) as OpPreset[];
  const otherItems = visible.filter((i) => !(i.type in ICON_PRESETS)) as (
    | OpChip
    | OpLink
  )[];
  const nodes: VNode[] = [];

  for (const item of iconItems) {
    const preset = ICON_PRESETS[item.type as keyof typeof ICON_PRESETS];
    nodes.push(
      h(
        "button",
        {
          class: ["jh-op-btn", preset.cls],
          type: "button",
          title: item.title ?? item.label ?? preset.title,
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            item.onClick(e);
          },
        },
        h(preset.icon as Component),
      ),
    );
  }

  if (iconItems.length > 0 && otherItems.length > 0)
    nodes.push(h("span", { class: "jh-op-sep", "aria-hidden": "true" }));

  for (const item of otherItems) {
    if (item.type === "chip") {
      const children: any[] = [];
      if (item.icon) children.push(h(item.icon as Component));
      children.push(h("span", null, item.label));
      nodes.push(
        h(
          "button",
          {
            class: "jh-op-chip",
            type: "button",
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              item.onClick(e);
            },
          },
          children,
        ),
      );
    } else {
      nodes.push(
        h(
          "button",
          {
            class: "jh-op-link",
            type: "button",
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              item.onClick(e);
            },
          },
          item.label,
        ),
      );
    }
  }

  return h("div", { class: "jh-op-group" }, nodes);
}
