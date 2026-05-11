/**
 * runtime/presets/common.ts — 通用业务预设（从 wl-safe 提取的常见映射，可作为起步包）
 *
 * 包含：
 *   - 通用状态：enableStatus / approvalStatus / verifyStatus
 *   - 业务示例：风险/隐患/检查/培训/证书/作业票/题库 等枚举映射（可裁剪/覆盖）
 *   - 对应快捷渲染函数
 *   - installCommonPreset() — 一键把这些字段注册进核心 COLUMN_AUTO_MAP
 *   - setDictResolver() — 解耦动态字典查询
 *
 * 使用：
 *   import { installCommonPreset } from '@agile-team/wl-skills-ui/runtime/common-preset';
 *   installCommonPreset();   // main.ts 调用一次即可
 *
 * 自定义：如需扩展自己业务的字段映射，运行 `npx wl-ui add-preset <name>` 脚手架一份。
 */
import type { VNode } from "vue";
import type { TagMapItem } from "../core/types";
import {
  renderTagNode,
  renderClassifyTag,
  renderBadge,
  renderRatingLevel,
} from "../core/renderers";
import { registerColumnAutoMaps } from "../core/registry";
export {
  setDictResolver,
  renderDictClassifyTag,
  registerDictColorMap,
  registerDictColorMaps,
} from "../core/renderers";

// ── 风险分级 ─────────────────────────────────────────────────────────────────
export const RISK_LEVEL_MAP: Record<string | number, TagMapItem> = {
  1: { label: "重大风险", type: "danger" },
  2: { label: "较大风险", type: "warning" },
  3: { label: "一般风险", type: "primary" },
  4: { label: "低风险", type: "success" },
};
export const renderRiskLevel = (v: string | number | null | undefined) =>
  renderTagNode(v, RISK_LEVEL_MAP);

// ── 排查/检查层级 ─────────────────────────────────────────────────────────────
export const CHECK_LEVEL_MAP: Record<string | number, TagMapItem> = {
  1: { label: "公司级", type: "primary" },
  2: { label: "厂级", type: "warning" },
  3: { label: "车间级", type: "info" },
  4: { label: "班组级", type: "info" },
};
export const renderCheckLevel = (
  v: string | number | null | undefined,
): VNode | null => renderClassifyTag(v, CHECK_LEVEL_MAP);

// ── 任务 / 计划 / 隐患 / 整改 / 作业票 / 培训 / 证书 / 题库 ──────────────────
export const TASK_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "待排查", type: "info" },
  "1": { label: "排查中", type: "warning" },
  "2": { label: "已完成", type: "success" },
  "3": { label: "漏查", type: "danger" },
};
export const PLAN_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "启用", type: "success" },
  "0": { label: "停用", type: "danger" },
};
export const FLAG_NORMAL_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "正常", type: "success" },
  "2": { label: "异常", type: "danger" },
};
export const RISK_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "暂存", type: "info" },
  "1": { label: "待整改", type: "warning" },
  "2": { label: "重新确认", type: "warning" },
  "3": { label: "整改中", type: "primary" },
  "4": { label: "待验收", type: "primary" },
  "5": { label: "已关闭", type: "success" },
};
export const CORRECT_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "待整改", type: "info" },
  "1": { label: "整改中", type: "warning" },
  "2": { label: "已整改", type: "success" },
};
export const PERMIT_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "草稿", type: "info" },
  "2": { label: "待审批", type: "warning" },
  "3": { label: "作业中", type: "primary" },
  "4": { label: "已完工", type: "success" },
  "5": { label: "已撤销", type: "danger" },
};
export const TRAIN_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "未完成", type: "warning" },
  "2": { label: "已完成", type: "success" },
};
export const CREDENTIAL_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "有效", type: "success" },
  "2": { label: "即将过期", type: "warning" },
  "3": { label: "已过期", type: "danger" },
};
export const QUESTION_STATUS_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "草稿", type: "info" },
  "2": { label: "已发布", type: "success" },
  "3": { label: "已停用", type: "danger" },
};

export const renderTaskStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, TASK_STATUS_MAP);
export const renderPlanStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, PLAN_STATUS_MAP);
export const renderFlagNormal = (v: string | number | null | undefined) =>
  renderTagNode(v, FLAG_NORMAL_MAP);
export const renderRiskStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, RISK_STATUS_MAP);
export const renderCorrectStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, CORRECT_STATUS_MAP);
export const renderPermitStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, PERMIT_STATUS_MAP);
export const renderTrainStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, TRAIN_STATUS_MAP);
export const renderCredentialStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, CREDENTIAL_STATUS_MAP);
export const renderQuestionStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, QUESTION_STATUS_MAP);

// ── 课件/培训级别/预案/演练分类 ───────────────────────────────────────────────
export const COURSEWARE_TYPE_MAP: Record<string | number, TagMapItem> = {
  "1": { label: "视频", type: "primary" },
  "2": { label: "文档", type: "info" },
};
export const renderCoursewareType = (v: string | number | null | undefined) =>
  renderClassifyTag(v, COURSEWARE_TYPE_MAP);

export const TRAIN_LEVEL_TYPE_MAP: Record<string, string> = {
  "1": "",
  "2": "warning",
  "3": "info",
  "4": "info",
};
export const PLAN_TYPE_COLOR_MAP: Record<string, string> = {
  "1": "",
  "2": "warning",
  "3": "info",
};
export const DRILL_TYPE_COLOR_MAP: Record<string, string> = {
  "1": "info",
  "2": "warning",
};

// ── 一键安装 ─────────────────────────────────────────────────────────────────
/** 把通用业务字段映射批量注册到核心 COLUMN_AUTO_MAP（main.ts 调用一次） */
export function installCommonPreset(): void {
  registerColumnAutoMaps({
    riskLevel: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderRiskLevel(row.riskLevel),
    },
    riskNo: { defaultSlot: ({ row }) => renderBadge(row.riskNo) },
    checkNo: { defaultSlot: ({ row }) => renderBadge(row.checkNo) },
    ratingLevel: {
      width: 80,
      defaultSlot: ({ row }) => renderRatingLevel(row.ratingLevel),
    },
    taskStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderTaskStatus(row.taskStatus),
    },
    planStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderPlanStatus(row.planStatus),
    },
    flagNormal: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderFlagNormal(row.flagNormal),
    },
    riskStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderRiskStatus(row.riskStatus),
    },
    correctStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderCorrectStatus(row.correctStatus),
    },
    permitStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderPermitStatus(row.permitStatus),
    },
    trainStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderTrainStatus(row.trainStatus),
    },
    credentialStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderCredentialStatus(row.credentialStatus),
    },
    unifyQuestionStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderQuestionStatus(row.unifyQuestionStatus),
    },
  });
}
