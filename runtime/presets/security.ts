/**
 * runtime/presets/security.ts — 安防业务预设（wl-ui-security 项目常见状态映射）
 *
 * 包含：
 *   - 违章处理状态（violationStatus）
 *   - 车辆状态（carStatus）
 *   - 出入记录状态（accessStatus）
 *   - 布控状态（controlStatus）
 *   - 报警状态（alarmStatus）
 *   - 安防通用启用/停用已在 common preset 内
 *
 * 使用：
 *   import { installSecurityPreset } from '@agile-team/wl-skills-ui/runtime/presets/security';
 *   installSecurityPreset();   // main.ts 调用一次
 *
 * 主色约定：
 *   security 项目品牌主色 #002a8f，通过 CSS 变量 --el-color-primary 覆盖
 *   本预设不硬编码主色，所有颜色走 Element Plus 语义色（primary/success/warning/danger/info）
 */
import type { TagMapItem } from "../core/types";
import { renderTagNode, registerDictColorMaps } from "../core/renderers";
import { registerColumnAutoMaps } from "../core/registry";

// ── 违章处理状态 ─────────────────────────────────────────────────────────────
export const VIOLATION_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "待考试", type: "warning" },
  1: { label: "已完成", type: "success" },
  2: { label: "已撤销", type: "info" },
};
export const renderViolationStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, VIOLATION_STATUS_MAP);

// ── 车辆状态 ─────────────────────────────────────────────────────────────────
export const CAR_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "正常", type: "success" },
  1: { label: "异常", type: "danger" },
  2: { label: "报废", type: "info" },
};
export const renderCarStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, CAR_STATUS_MAP);

// ── 出入记录状态 ─────────────────────────────────────────────────────────────
export const ACCESS_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "入场", type: "primary" },
  1: { label: "出场", type: "success" },
  2: { label: "异常", type: "danger" },
};
export const renderAccessStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, ACCESS_STATUS_MAP);

// ── 布控状态 ─────────────────────────────────────────────────────────────────
export const CONTROL_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "未布控", type: "info" },
  1: { label: "布控中", type: "warning" },
  2: { label: "已撤控", type: "success" },
};
export const renderControlStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, CONTROL_STATUS_MAP);

// ── 报警状态 ─────────────────────────────────────────────────────────────────
export const ALARM_STATUS_MAP: Record<string | number, TagMapItem> = {
  0: { label: "未处理", type: "danger" },
  1: { label: "处理中", type: "warning" },
  2: { label: "已处理", type: "success" },
  3: { label: "已忽略", type: "info" },
};
export const renderAlarmStatus = (v: string | number | null | undefined) =>
  renderTagNode(v, ALARM_STATUS_MAP);

// ── 安防字典配色注册 ─────────────────────────────────────────────────────────
// 状态类 dictKey → 语义配色（success=正向终态, danger=负向, warning=中间, info=初始）
// 等级类 dictKey → 梯度配色（danger→warning→primary→success，由重到轻）
// 分类/方式/来源类 → 不注册，走 renderDictClassifyTag 自动轮转
const SECURITY_DICT_COLORS: Record<string, Record<string, string>> = {
  // ─ 状态类 ─
  warningEventStatus: {
    "0": "danger",
    "1": "warning",
    "2": "success",
    "3": "info",
  },
  spExitPermitStatus: {
    "0": "info",
    "1": "warning",
    "2": "success",
    "3": "danger",
  },
  spVisitorStatus: {
    "0": "info",
    "1": "warning",
    "2": "success",
    "3": "danger",
  },
  // ─ 等级/严重度类 ─
  alarmFristType: {
    "1": "danger",
    "2": "warning",
    "3": "primary",
    "4": "info",
  },
  alarmSecondType: {
    "1": "danger",
    "2": "warning",
    "3": "primary",
    "4": "info",
  },
  // ─ 二态类（启用/禁用） ─
  areaRuleType: { "1": "success", "2": "warning", "3": "info" },
};

// ── 一键安装 ─────────────────────────────────────────────────────────────────
export function installSecurityPreset(): void {
  registerDictColorMaps(SECURITY_DICT_COLORS);
  registerColumnAutoMaps({
    violationStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderViolationStatus(row.violationStatus),
    },
    carStatus: {
      width: 80,
      defaultNode: ({ row }) => renderCarStatus(row.carStatus),
    },
    accessStatus: {
      width: 80,
      defaultNode: ({ row }) => renderAccessStatus(row.accessStatus),
    },
    controlStatus: {
      width: 90,
      defaultNode: ({ row }) => renderControlStatus(row.controlStatus),
    },
    alarmStatus: {
      width: 90,
      fixed: "right",
      defaultNode: ({ row }) => renderAlarmStatus(row.alarmStatus),
    },
  });
}
