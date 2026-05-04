/**
 * runtime/core/registry.ts — COLUMN_AUTO_MAP 注册中心 + defineColumns
 *
 * 提供：
 *   - registerColumnAutoMap / registerColumnAutoMaps / getColumnAutoMap / clearColumnAutoMap
 *   - defineColumns — 根据已注册映射自动补充列配置
 *
 * 内置通用映射（enableStatus / approvalStatus / verifyStatus）在此文件末尾完成注册。
 */
import type { ColumnLike } from "./types";
import {
  renderEnableStatus,
  renderAuditStatus,
  renderVerifyStatus,
  renderDictClassifyTag,
} from "./renderers";

const COLUMN_AUTO_MAP: Record<string, Partial<ColumnLike>> = {};

/** 注册单个字段名 → 列配置映射 */
export function registerColumnAutoMap(
  name: string,
  config: Partial<ColumnLike>,
): void {
  COLUMN_AUTO_MAP[name] = config;
}

/** 批量注册 */
export function registerColumnAutoMaps(
  maps: Record<string, Partial<ColumnLike>>,
): void {
  Object.assign(COLUMN_AUTO_MAP, maps);
}

/** 读取当前注册表（只读，供调试/扫描器使用） */
export function getColumnAutoMap(): Readonly<
  Record<string, Partial<ColumnLike>>
> {
  return COLUMN_AUTO_MAP;
}

/** 移除字段映射（测试场景） */
export function clearColumnAutoMap(name?: string): void {
  if (name) delete COLUMN_AUTO_MAP[name];
  else for (const k of Object.keys(COLUMN_AUTO_MAP)) delete COLUMN_AUTO_MAP[k];
}

/**
 * defineColumns — 根据 COLUMN_AUTO_MAP 自动补充列配置
 *
 * 规则：对每一列，若其 name 命中注册表且该列未显式指定 defaultNode/defaultSlot，
 * 则自动合并注册表中的配置（列自身配置优先级更高）。
 */
export function defineColumns<T extends ColumnLike>(columns: T[]): T[] {
  return columns.map((col) => {
    const fieldName = col.name ?? col.label ?? "";
    const preset = COLUMN_AUTO_MAP[fieldName];
    const hasRenderer =
      col.defaultNode !== undefined || col.defaultSlot !== undefined;
    if (hasRenderer) return col;
    if (!preset && isDictColumn(col)) {
      return {
        ...col,
        defaultSlot: ({ row }) =>
          renderDictClassifyTag(row?.[fieldName], String(col.logicValue)),
      };
    }
    if (!preset) return col;
    return { ...preset, ...col };
  });
}

function isDictColumn(col: ColumnLike): boolean {
  const logicType = String(col.logicType ?? "").toLowerCase();
  return Boolean(col.logicValue) && logicType.includes("dict");
}

// ── 内置注册：通用字段 ────────────────────────────────────────────────────────
registerColumnAutoMaps({
  enableStatus: {
    width: 80,
    fixed: "right",
    defaultNode: ({ row }) => renderEnableStatus(row.enableStatus),
  },
  approvalStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }) => renderAuditStatus(row.approvalStatus),
  },
  verifyStatus: {
    width: 90,
    fixed: "right",
    defaultNode: ({ row }) => renderVerifyStatus(row.verifyStatus),
  },
});
