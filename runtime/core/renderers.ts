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
    bg: "var(--wk-rating-lv1-bg, rgba(16,185,129,0.14))",
    color: "var(--wk-rating-lv1-color, #065F46)",
  },
  二: {
    bg: "var(--wk-rating-lv2-bg, rgba(59,130,246,0.14))",
    color: "var(--wk-rating-lv2-color, #1E40AF)",
  },
  三: {
    bg: "var(--wk-rating-lv3-bg, rgba(245,158,11,0.14))",
    color: "var(--wk-rating-lv3-color, #78350F)",
  },
  四: {
    bg: "var(--wk-rating-lv4-bg, rgba(249,115,22,0.14))",
    color: "var(--wk-rating-lv4-color, #9A3412)",
  },
  五: {
    bg: "var(--wk-rating-lv5-bg, rgba(239,68,68,0.14))",
    color: "var(--wk-rating-lv5-color, #991B1B)",
  },
  "1": {
    bg: "var(--wk-rating-lv1-bg, rgba(16,185,129,0.14))",
    color: "var(--wk-rating-lv1-color, #065F46)",
  },
  "2": {
    bg: "var(--wk-rating-lv2-bg, rgba(59,130,246,0.14))",
    color: "var(--wk-rating-lv2-color, #1E40AF)",
  },
  "3": {
    bg: "var(--wk-rating-lv3-bg, rgba(245,158,11,0.14))",
    color: "var(--wk-rating-lv3-color, #78350F)",
  },
  "4": {
    bg: "var(--wk-rating-lv4-bg, rgba(249,115,22,0.14))",
    color: "var(--wk-rating-lv4-color, #9A3412)",
  },
  "5": {
    bg: "var(--wk-rating-lv5-bg, rgba(239,68,68,0.14))",
    color: "var(--wk-rating-lv5-color, #991B1B)",
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
  // 非数字 value 用简单 hash 轮转
  let hash = 0;
  for (let i = 0; i < String(value).length; i++) {
    hash = ((hash << 5) - hash + String(value).charCodeAt(i)) | 0;
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
    bg: "var(--wk-rating-fallback-bg, rgba(107,114,128,0.12))",
    color: "var(--wk-rating-fallback-color, #374151)",
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

/** 渲染操作列按钮组（图标 + 胶囊 + 文字链接，自动 stopPropagation） */
export function renderOps(items: OpItem[]): VNode {
  const visible = items.filter(isOpVisible);
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
