/**
 * defineColumns — 全局列自动渲染器
 *
 * 原理：维护一张「字段名 → 渲染配置」的全局映射表（COLUMN_AUTO_MAP）。
 *      调用 defineColumns(colList) 时，对每一列检查 name 是否命中映射：
 *        - 命中 → 自动补充 width / fixed / defaultNode / defaultSlot
 *        - 未命中 → 原样返回
 *        - 用户在列定义里手写了对应属性 → 手写优先（不会被覆盖）
 *
 * 使用方式（替换原来的 return [...]）：
 *   import { defineColumns } from '@/util/define-columns';
 *
 *   columnsDef(): TableColumnDesc<any>[] {
 *     return defineColumns([
 *       { label: '启用状态', name: 'enableStatus' },   // 自动：width=80 fixed=right 彩色Tag
 *       { label: '风险分级', name: 'riskLevel' },       // 自动：width=90 fixed=right 彩色Tag
 *       { label: '风险编号', name: 'riskNo' },          // 自动：蓝色圆角徽标
 *       { label: '评价级别', name: 'ratingLevel' },     // 自动：彩色圆形徽标
 *       { label: '审批状态', name: 'approvalStatus' },  // 自动：彩色Tag
 *     ]);
 *   }
 *
 * 如需某列不走自动逻辑，手写 defaultNode/defaultSlot 即可覆盖自动配置：
 *   { label: '风险分级', name: 'riskLevel', defaultNode: ({ row }: { row: any }) => myCustomRender(row) }
 *
 * 新增全局字段映射 → 只改本文件的 COLUMN_AUTO_MAP，全项目所有页面立即生效。
 */
import type { TableColumnDesc } from "@jhlc/common-core/src/components/table/base-table/type";
import {
  renderEnableStatus,
  renderAuditStatus,
  renderVerifyStatus,
  renderRiskLevel,
  renderBadge,
  renderRatingLevel,
  renderTaskStatus,
  renderPlanStatus,
  renderFlagNormal,
  renderRiskStatus,
  renderCorrectStatus,
  renderPermitStatus,
  renderTrainStatus,
  renderCredentialStatus,
  renderQuestionStatus
} from "./ag-cell-renders";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 全局字段渲染映射表
// key   = 字段名（与 columnsDef 中的 name 完全匹配）
// value = 要自动补充的列配置（不含 label，label 由页面自定义）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const COLUMN_AUTO_MAP: Record<string, Partial<TableColumnDesc<any>>> = {
  // ── 启用/停用 ────────────────────────────────────────────────────────────
  enableStatus: {
    width: 80,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) =>
      renderEnableStatus(row.enableStatus),
  },

  // ── 审批状态 ─────────────────────────────────────────────────────────────
  approvalStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) =>
      renderAuditStatus(row.approvalStatus),
  },

  // ── 核实状态 ─────────────────────────────────────────────────────────────
  verifyStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) =>
      renderVerifyStatus(row.verifyStatus),
  },

  // ── 风险分级（aq_risk_level 字典：1重大/2较大/3一般/4低）──────────────────
  riskLevel: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) => renderRiskLevel(row.riskLevel),
  },

  // ── 风险编号：蓝色圆角徽标 ───────────────────────────────────────────────
  riskNo: {
    defaultSlot: ({ row }: { row: any }) => renderBadge(row.riskNo),
  },

  // ── 检查表编号：蓝色圆角徽标 ─────────────────────────────────────────────
  checkNo: {
    defaultSlot: ({ row }: { row: any }) => renderBadge(row.checkNo),
  },

  // ── 评价级别（LEC/MES 等）：彩色圆形徽标 ────────────────────────────────
  ratingLevel: {
    width: 80,
    defaultSlot: ({ row }: { row: any }) => renderRatingLevel(row.ratingLevel),
  },

  // ── 排查/检查任务状态（aq_task_check_status / aq_check_info_status）────────
  taskStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) => renderTaskStatus(row.taskStatus),
  },

  // ── 计划状态（aq_plan_status: 1=启用, 0=停用）────────────────────────────
  planStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) => renderPlanStatus(row.planStatus),
  },

  // ── 排查/检查结果（aq_handle_result: 1=正常, 2=异常）────────────────────
  flagNormal: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) => renderFlagNormal(row.flagNormal),
  },

  // ── 隐患状态（aq_risk_status）────────────────────────────────────────────
  riskStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) => renderRiskStatus(row.riskStatus),
  },

  // ── 整改状态（aq_correct_status）──────────────────────────────────────────
  correctStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) =>
      renderCorrectStatus(row.correctStatus),
  },

  // ── 危险作业票状态（permitStatus: 1=草稿, 2=待审批, 3=作业中, 4=已完工, 5=已撤销）──
  permitStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) =>
      renderPermitStatus(row.permitStatus),
  },

  // ── 培训状态（trainStatus: 1=未完成, 2=已完成）────────────────────────────
  trainStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) => renderTrainStatus(row.trainStatus),
  },

  // ── 证书状态（credentialStatus: 1=有效, 2=即将过期, 3=已过期）──────────────
  credentialStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) =>
      renderCredentialStatus(row.credentialStatus),
  },

  // ── 题库状态（unifyQuestionStatus: 1=草稿, 2=已发布, 3=已停用）──────────────
  unifyQuestionStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }: { row: any }) =>
      renderQuestionStatus(row.unifyQuestionStatus),
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 主函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function defineColumns<T = any>(
  columns: TableColumnDesc<T>[]
): TableColumnDesc<T>[] {
  return columns.map((col) => {
    // 多选列：统一宽度 55px（页面已手写 width 时不覆盖）
    if ((col as any).type === "selection" && !(col as any).width) {
      return { width: 55, ...(col as any) } as unknown as TableColumnDesc<T>;
    }
    if (!col.name) return col;
    const auto = COLUMN_AUTO_MAP[col.name as string];
    if (!auto) return col;
    // 自动配置 < 手写配置（手写的属性不被覆盖）
    return { ...auto, ...col } as TableColumnDesc<T>;
  });
}
