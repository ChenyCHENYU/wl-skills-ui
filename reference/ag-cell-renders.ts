/**
 * AG Grid / BaseTable 全局 Cell Renderer 工具
 *
 * 用途：统一全项目 defaultSlot / defaultNode 配置，避免页面内重复定义映射表和渲染逻辑
 *
 * 使用示例：
 *   import { renderEnableStatus, renderRiskLevel, renderBadge, renderRatingLevel, renderOps } from '@/util/ag-cell-renders';
 *
 *   columnsDef(): TableColumnDesc<any>[] {
 *     return [
 *       { label: '状态', name: 'enableStatus', width: 80, fixed: 'right',
 *         defaultNode: ({ row }) => renderEnableStatus(row.enableStatus) },
 *       { label: '风险分级', name: 'riskLevel', width: 90, fixed: 'right',
 *         defaultNode: ({ row }) => renderRiskLevel(row.riskLevel) },
 *       { label: '风险编号', name: 'riskNo',
 *         defaultSlot: ({ row }) => renderBadge(row.riskNo) },
 *       { label: '评价级别', name: 'ratingLevel', width: 80,
 *         defaultSlot: ({ row }) => renderRatingLevel(row.ratingLevel) },
 *       // 操作列三层渲染：
 *       { label: '操作', width: 110, fixed: 'right',
 *         defaultSlot: ({ row }) => renderOps([
 *           { type: 'view', onClick: () => modal.open(row.id, 'view') },
 *           { type: 'edit', onClick: () => modal.open(row.id, 'edit') },
 *           { type: 'del',  onClick: () => handleDel(row.id) },
 *           { type: 'chip', label: '流程', onClick: () => showLog(row) },
 *           { type: 'link', label: '维护排查标准', onClick: () => openStd(row) },
 *         ])
 *       },
 *     ]
 *   }
 */
import { h, VNode, Component } from "vue";
import { ElTag } from "element-plus";
import {
  View,
  Edit,
  Delete,
  Document,
  Checked,
  Upload,
  CircleCheck,
} from "@element-plus/icons-vue";
import useBusinessLogicDataStore from "@jhlc/common-core/src/store/business-logic-data";
import { BusLogicKey, BusLogicDataType } from "@jhlc/types/src/logical-data";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 类型定义
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** defaultNode 返回格式（对应 jh-tag 组件的配置结构）*/
export interface JhTagNode {
  tag: "jh-tag";
  item: Array<{ title: string; type?: string }>;
}

/** 状态映射表中每条记录的格式 */
export interface TagMapItem {
  label: string;
  /** Element Plus tag type: '' | 'success' | 'warning' | 'danger' | 'info' */
  type: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 内置状态映射字典
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 启用/停用状态（enableStatus: 0=停用, 1=启用）*/
export const ENABLE_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "停用", type: "danger" },
  1: { label: "启用", type: "success" },
};

/** 审批状态（approvalStatus: 0=待审批, 1=已通过, 2=已驳回）*/
export const AUDIT_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "待审批", type: "info" },
  1: { label: "已通过", type: "success" },
  2: { label: "已驳回", type: "danger" },
};

/** 核实状态（verifyStatus: 0=未核实, 1=已核实）*/
export const VERIFY_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "未核实", type: "warning" },
  1: { label: "已核实", type: "success" },
};

/** 风险分级（riskLevel: 1=重大, 2=较大, 3=一般, 4=低风险；对应 aq_risk_level 字典）*/
export const RISK_LEVEL_MAP: Record<string | number, TagMapItem> = {
  1: { label: "重大风险", type: "danger" },
  2: { label: "较大风险", type: "warning" },
  3: { label: "一般风险", type: "" },
  4: { label: "低风险", type: "success" },
};

/** 评价级别颜色（LEC/MES 等评价级别：一→五 对应 绿→红）*/
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
  // 阿拉伯数字也支持
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 通用渲染工具
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 渲染状态标签（defaultNode 格式，使用 jh-tag 组件）
 * @param value   字段值
 * @param map     状态映射表
 * @returns       JhTagNode | null
 */
export function renderTagNode(
  value: string | number | null | undefined,
  map: Record<string | number, TagMapItem>,
): JhTagNode | null {
  if (value === null || value === undefined || value === "") return null;
  const item = map[value];
  if (!item) return null;
  return { tag: "jh-tag", item: [{ title: item.label, type: item.type }] };
}

/**
 * 渲染状态标签（defaultSlot 格式，返回 VNode）
 * 使用 .jh-cell-tag CSS 类，颜色通过 BEM modifier 控制
 * @param value   字段值
 * @param map     状态映射表
 * @returns       VNode | null
 */
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

/**
 * 渲染分类/层级标签（plain outline 样式，defaultSlot 格式）
 * 适用于组织层级、归档属性等非动态分类字段，视觉权重低于实心状态标签。
 * 列定义写法：defaultSlot: ({ row }) => renderClassifyTag(row.xxx, SOME_MAP)
 */
export function renderClassifyTag(
  value: string | number | null | undefined,
  map: Record<string | number, TagMapItem>,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  const item = map[value];
  if (!item) return null;
  return h(
    ElTag,
    { type: (item.type || "") as any, size: "small", effect: "plain" },
    () => item.label,
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 快捷函数（直接传字段值即可）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 渲染启用/停用状态（defaultNode 格式）
 * 列定义写法：defaultNode: ({ row }) => renderEnableStatus(row.enableStatus)
 */
export const renderEnableStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, ENABLE_STATUS_MAP);

/**
 * 渲染审批状态（defaultNode 格式）
 * 列定义写法：defaultNode: ({ row }) => renderAuditStatus(row.approvalStatus)
 */
export const renderAuditStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, AUDIT_STATUS_MAP);

/**
 * 渲染核实状态（defaultNode 格式）
 * 列定义写法：defaultNode: ({ row }) => renderVerifyStatus(row.verifyStatus)
 */
export const renderVerifyStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, VERIFY_STATUS_MAP);

/**
 * 渲染风险分级（defaultNode 格式）
 * 列定义写法：defaultNode: ({ row }) => renderRiskLevel(row.riskLevel)
 */
export const renderRiskLevel = (value: string | number | null | undefined) =>
  renderTagNode(value, RISK_LEVEL_MAP);

/** 排查层级（aq_check_level 字典：1=公司级, 2=厂级, 3=车间级, 4=班组级）*/
export const CHECK_LEVEL_MAP: Record<string | number, TagMapItem> = {
  1: { label: "公司级", type: "" },
  2: { label: "厂级", type: "warning" },
  3: { label: "车间级", type: "info" },
  4: { label: "班组级", type: "info" },
};

/**
 * 渲染排查/检查层级（plain outline 样式，defaultSlot 格式）
 * 层级是分类/归档属性，用 plain outline 降低视觉权重，与动态状态区分。
 * 列定义写法：defaultSlot: ({ row }) => renderCheckLevel(row.checkLevel)
 */
export const renderCheckLevel = (
  value: string | number | null | undefined,
): VNode | null => renderClassifyTag(value, CHECK_LEVEL_MAP);

/** 排查/检查任务状态（aq_task_check_status / aq_check_info_status）*/
export const TASK_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "待排查", type: "info" },
  "1": { label: "排查中", type: "warning" },
  "2": { label: "已完成", type: "success" },
  "3": { label: "漏查", type: "danger" },
};

/** 计划状态（aq_plan_status: 1=启用, 0=停用）*/
export const PLAN_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "启用", type: "success" },
  "0": { label: "停用", type: "danger" },
};

/** 排查结果 / 检查结果（aq_handle_result: 1=正常, 2=异常）*/
export const FLAG_NORMAL_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "正常", type: "success" },
  "2": { label: "异常", type: "danger" },
};

/** 隐患状态（aq_risk_status: 0=暂存, 1=待整改, 2=重新确认, 3=整改中, 4=待验收, 5=已关闭）*/
export const RISK_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "暂存", type: "info" },
  "1": { label: "待整改", type: "warning" },
  "2": { label: "重新确认", type: "warning" },
  "3": { label: "整改中", type: "" },
  "4": { label: "待验收", type: "" },
  "5": { label: "已关闭", type: "success" },
};

/** 整改状态（aq_correct_status: 0=待整改, 1=整改中, 2=已整改）*/
export const CORRECT_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "待整改", type: "info" },
  "1": { label: "整改中", type: "warning" },
  "2": { label: "已整改", type: "success" },
};

export const renderTaskStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, TASK_STATUS_MAP);

export const renderPlanStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, PLAN_STATUS_MAP);

export const renderFlagNormal = (value: string | number | null | undefined) =>
  renderTagNode(value, FLAG_NORMAL_MAP);

export const renderRiskStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, RISK_STATUS_MAP);

export const renderCorrectStatus = (
  value: string | number | null | undefined,
) => renderTagNode(value, CORRECT_STATUS_MAP);

// ── 危险作业票状态（permitStatus: 1=草稿, 2=待审批, 3=作业中, 4=已完工, 5=已撤销）──────
export const PERMIT_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "草稿", type: "info" },
  "2": { label: "待审批", type: "warning" },
  "3": { label: "作业中", type: "" },
  "4": { label: "已完工", type: "success" },
  "5": { label: "已撤销", type: "danger" },
};

export const renderPermitStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, PERMIT_STATUS_MAP);

// ── 培训状态（trainStatus: 1=未完成, 2=已完成）──────────────────────────────────
export const TRAIN_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "未完成", type: "warning" },
  "2": { label: "已完成", type: "success" },
};

export const renderTrainStatus = (value: string | number | null | undefined) =>
  renderTagNode(value, TRAIN_STATUS_MAP);

// ── 证书状态（credentialStatus: 1=有效, 2=即将过期, 3=已过期）──────────────────
export const CREDENTIAL_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "有效", type: "success" },
  "2": { label: "即将过期", type: "warning" },
  "3": { label: "已过期", type: "danger" },
};

export const renderCredentialStatus = (
  value: string | number | null | undefined,
) => renderTagNode(value, CREDENTIAL_STATUS_MAP);

// ── 题库状态（unifyQuestionStatus: 1=草稿, 2=已发布, 3=已停用）──────────────────
export const QUESTION_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "草稿", type: "info" },
  "2": { label: "已发布", type: "success" },
  "3": { label: "已停用", type: "danger" },
};

export const renderQuestionStatus = (
  value: string | number | null | undefined,
) => renderTagNode(value, QUESTION_STATUS_MAP);

/**
 * 渲染风险编号徽标（defaultSlot 格式，蓝色圆角徽标 .jh-riskno-badge）
 * 列定义写法：defaultSlot: ({ row }) => renderBadge(row.riskNo)
 */
export function renderBadge(
  value: string | number | null | undefined,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  return h("span", { class: "jh-riskno-badge" }, String(value));
}

/**
 * 渲染评价级别圆形徽标（defaultSlot 格式，彩色圆形 .jh-rating-lv）
 * 列定义写法：defaultSlot: ({ row }) => renderRatingLevel(row.ratingLevel)
 */
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
      style: { "--lv-bg": clr.bg, "--lv-color": clr.color },
    },
    value,
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// renderOps — 操作列三层渲染系统
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 内置图标预设（type: 'view' | 'edit' | 'del'）
 * 渲染为 26×26px 纯图标按钮，默认灰色，hover 变语义色
 */
const ICON_PRESETS = {
  view: { icon: View, cls: "jh-op-view", title: "查看" },
  edit: { icon: Edit, cls: "jh-op-edit", title: "编辑" },
  del: { icon: Delete, cls: "jh-op-del", title: "删除" },
  log: { icon: Document, cls: "jh-op-log", title: "记录" },
  ok: { icon: CircleCheck, cls: "jh-op-ok", title: "审核" },
  send: { icon: Upload, cls: "jh-op-send", title: "提交" },
} as const;

type PresetType = keyof typeof ICON_PRESETS;

/** 图标按钮（纯图标，type 为内置预设 key）*/
export interface OpPreset {
  type: PresetType;
  /** 覆盖默认 tooltip */
  title?: string;
  /** false 时隐藏该按钮 */
  show?: boolean;
  onClick: (e: MouseEvent) => void;
}

/** 胶囊按钮（图标可选 + 短文字，适合流程记录/审核/提交等半通用操作）*/
export interface OpChip {
  type: "chip";
  label: string;
  /** 可选左侧图标，传入 Element Plus 图标组件 */
  icon?: Component;
  show?: boolean;
  onClick: (e: MouseEvent) => void;
}

/** 文字按钮（纯文字，适合业务专属长名称操作）*/
export interface OpLink {
  type: "link";
  label: string;
  show?: boolean;
  onClick: (e: MouseEvent) => void;
}

export type OpItem = OpPreset | OpChip | OpLink;

/**
 * 渲染操作列按钮组（三层系统）
 *
 * 第一层 — 纯图标按钮（type: 'view'|'edit'|'del'|'log'|'ok'|'send'）
 *   26×26px，默认灰色，hover 变语义色，tooltip 兜底
 *
 * 第二层 — 胶囊按钮（type: 'chip'）
 *   圆角胶囊，图标+文字，hover 淡蓝背景 + 主色文字
 *
 * 第三层 — 文字按钮（type: 'link'）
 *   微边框小按钮，hover 主色边框+背景，有质感，不是普通 <a>
 *
 * 图标组与非图标组之间自动插入竖分隔线
 * 所有按钮自动调用 e.stopPropagation()，页面 onClick 无需手动阻止
 *
 * @example
 *   defaultSlot: ({ row }) => renderOps([
 *     { type: 'view', onClick: () => modal.open(row.id, 'view') },
 *     { type: 'edit', onClick: () => modal.open(row.id, 'edit') },
 *     { type: 'del',  onClick: () => handleDel(row.id) },
 *     { type: 'chip', label: '流程', onClick: () => showLog(row) },
 *     { type: 'link', label: '维护排查标准', onClick: () => openStd(row) },
 *   ])
 */
export function renderOps(items: OpItem[]): VNode {
  // 图标类按钮：show=false 时保留不可见占位，确保同列同类按钮上下对齐
  const allIconItems = items.filter(
    (i) => i.type in ICON_PRESETS,
  ) as OpPreset[];
  // chip/link 类按钮：有无 show 都直接过滤，无固定位置要求
  const otherItems = items.filter(
    (i) => !(i.type in ICON_PRESETS) && i.show !== false,
  ) as (OpChip | OpLink)[];

  const nodes: VNode[] = [];

  // ── 第一层：纯图标按钮（含不可见占位以保持列对齐）──────────────────────
  for (const item of allIconItems) {
    const preset = ICON_PRESETS[item.type as PresetType];
    const isVisible = item.show !== false;
    nodes.push(
      h(
        "button",
        {
          class: ["jh-op-btn", preset.cls],
          type: "button",
          title: isVisible ? (item.title ?? preset.title) : undefined,
          style: isVisible
            ? undefined
            : { visibility: "hidden", pointerEvents: "none" },
          onClick: isVisible
            ? (e: MouseEvent) => {
                e.stopPropagation();
                item.onClick(e);
              }
            : undefined,
        },
        h(preset.icon as Component),
      ),
    );
  }

  // ── 分隔线（图标组与文字组之间）──────────────────────────────────────────
  if (allIconItems.length > 0 && otherItems.length > 0) {
    nodes.push(h("span", { class: "jh-op-sep", "aria-hidden": "true" }));
  }

  // ── 第二/三层：胶囊 & 文字按钮 ───────────────────────────────────────────
  for (const item of otherItems) {
    if (item.type === "chip") {
      const chipChildren: (VNode | string)[] = [];
      if (item.icon) chipChildren.push(h(item.icon as Component));
      chipChildren.push(h("span", null, item.label));
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
          chipChildren,
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 通用分类/枚举 Tag — 字典驱动
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 渲染动态字典分类Tag（plain outline 样式）
 *
 * 从 Pinia business-logic-data store 动态获取字典 label，无需 hardcode 编码→文字映射。
 * 适用于所有 logicType=dict 的分类字段（trainLevel、planType、coursewareType 等）。
 *
 * 可选传入 typeColorMap 为特定 code 值指定 El-Tag type 颜色：
 *   { '1': 'success', '2': 'warning', '3': 'danger', '4': 'info' }
 * 未命中 typeColorMap 时统一展示 '' (蓝/灰 plain)
 *
 * 列定义写法：
 *   defaultSlot: ({ row }) => renderDictClassifyTag(row.trainLevel, 'trainLevel')
 *   defaultSlot: ({ row }) => renderDictClassifyTag(row.planType, 'planType', { '1': '', '2': 'warning', '3': 'info' })
 */
export function renderDictClassifyTag(
  value: string | number | null | undefined,
  dictKey: string,
  typeColorMap?: Record<string, string>,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  let label = String(value);
  try {
    const store = useBusinessLogicDataStore();
    const key = new BusLogicKey({
      logicType: BusLogicDataType.dict,
      logicValue: dictKey,
    });
    const options = store.get(key) || [];
    const option = options.find((o: any) => String(o.value) === String(value));
    if (option) label = option.label;
  } catch (_) {
    // Pinia 未初始化时降级为原始值
  }
  const tagType = (typeColorMap?.[String(value)] ?? "") as any;
  return h(
    ElTag,
    { type: tagType, size: "small", effect: "plain" },
    () => label,
  );
}

// ── 课件类型（coursewareType: 1=视频, 2=文档）────────────────────────────────
export const COURSEWARE_TYPE_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "视频", type: "" },
  "2": { label: "文档", type: "info" },
};
export const renderCoursewareType = (
  value: string | number | null | undefined,
): VNode | null => renderClassifyTag(value, COURSEWARE_TYPE_MAP);

// ── 培训级别颜色方案（配合 renderDictClassifyTag 使用）───────────────────────
export const TRAIN_LEVEL_TYPE_MAP: Record<string, string> = {
  "1": "", // 公司级 — 主色蓝
  "2": "warning", // 部门/厂级 — 橙
  "3": "info", // 班组/车间级 — 灰
  "4": "info", // 岗位级 — 灰
};

// ── 预案分类颜色方案（配合 renderDictClassifyTag 使用）──────────────────────
export const PLAN_TYPE_COLOR_MAP: Record<string, string> = {
  "1": "", // 综合应急预案 — 蓝
  "2": "warning", // 专项应急预案 — 橙
  "3": "info", // 现场处置方案 — 灰
};

// ── 演练方式颜色方案（配合 renderDictClassifyTag 使用）──────────────────────
export const DRILL_TYPE_COLOR_MAP: Record<string, string> = {
  "1": "info", // 桌面演练 — 灰
  "2": "warning", // 实战演练 — 橙
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 数值型徽标 — 考核基数/评分等数量值
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 渲染数值徽标（绿色系 .jh-count-badge，区别于蓝色编号徽标 .jh-riskno-badge）
 * 适用于考核基数、权重分、评分等数量型字段
 * 列定义写法：defaultSlot: ({ row }) => renderCountBadge(row.baseCount)
 */
export function renderCountBadge(
  value: string | number | null | undefined,
): VNode | null {
  if (value === null || value === undefined || value === "") return null;
  return h("span", { class: "jh-count-badge" }, String(value));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 危险/警示文本 — 考评标准/扣分依据等需要醒目红色的文字列
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 渲染红色警示文本（语义：考评标准、扣分依据、违规项等）
 * 列定义写法：defaultSlot: ({ row }) => renderDangerText(row.evaluateStandard)
 */
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
