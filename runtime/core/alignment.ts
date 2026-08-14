import type { ColumnLike } from "./types";

export type ColumnAlignment = "left" | "center" | "right";

const HEADER_ALIGNMENT_CLASS: Record<ColumnAlignment, string> = {
  left: "wl-ui-table-header-align--left",
  center: "wl-ui-table-header-align--center",
  right: "wl-ui-table-header-align--right",
};

function isColumnAlignment(value: unknown): value is ColumnAlignment {
  return value === "left" || value === "center" || value === "right";
}

/**
 * 将业务显式声明的 align/headerAlign 转换为 BaseTable/AG Grid 能稳定消费的配置。
 *
 * - 没有显式对齐声明时原样返回，不改变项目默认布局；
 * - 已有 cellStyle/headerClass 时尊重业务配置，不覆盖；
 * - 递归处理分组列 children；
 * - Element Table 仍直接消费原有 align/headerAlign。
 */
export function normalizeColumnAlignment<T extends ColumnLike>(column: T): T {
  const normalizedChildren = Array.isArray(column.children)
    ? normalizeColumnAlignments(column.children)
    : column.children;
  const align = isColumnAlignment(column.align) ? column.align : undefined;
  const headerAlign = isColumnAlignment(column.headerAlign)
    ? column.headerAlign
    : align;
  const needsChildren = normalizedChildren !== column.children;
  const needsCellStyle = Boolean(align) && column.cellStyle === undefined;
  const needsHeaderClass = Boolean(headerAlign) && column.headerClass === undefined;

  if (!needsChildren && !needsCellStyle && !needsHeaderClass) return column;

  return {
    ...column,
    ...(needsChildren ? { children: normalizedChildren } : {}),
    ...(needsCellStyle ? { cellStyle: { textAlign: align } } : {}),
    ...(needsHeaderClass
      ? { headerClass: HEADER_ALIGNMENT_CLASS[headerAlign!] }
      : {}),
  } as T;
}

/** 批量规范化列定义；只桥接显式对齐意图，不设置全局默认对齐。 */
export function normalizeColumnAlignments<T extends ColumnLike>(columns: T[]): T[] {
  return columns.map((column) => normalizeColumnAlignment(column));
}

// ── 默认对齐补齐（wl-ui-ep 存量改造验证） ────────────────────────────────────
//
// 业务约定：表头与内容默认居中，列显式声明 align 时以列为准（可退出）。
// 存量项目里共享 AG 适配层不消费 align/headerAlign 配置，只认 cellClass /
// headerClass，因此补齐时同步落为 class（EP ensureDefaultAlignment 同源逻辑）。

export interface DefaultAlignmentOptions {
  /**
   * 无显式 align 时补齐的默认对齐。
   * - "center"（推荐）表头/内容默认居中
   * - "left" / "right" 其他默认
   * - 不传或 null 不补齐，保持调用方现状（向后兼容）
   */
  defaultAlign?: ColumnAlignment | null;
}

/**
 * 为无显式对齐声明的列补齐默认对齐（含表头）。
 *
 * - 列已有 align / cellStyle / headerClass 时一律不动（业务意图优先）；
 * - 递归处理分组列 children；
 * - 与 normalizeColumnAlignment 兼容：补齐产物仍可被桥接函数消费。
 */
export function ensureDefaultAlignment<T extends ColumnLike>(
  column: T,
  defaultAlign: ColumnAlignment,
): T {
  const normalizedChildren = Array.isArray(column.children)
    ? column.children.map((child) => ensureDefaultAlignment(child, defaultAlign))
    : column.children;
  const hasExplicit =
    column.align !== undefined ||
    column.cellStyle !== undefined ||
    column.headerClass !== undefined;
  if (hasExplicit) {
    return normalizedChildren === column.children
      ? column
      : ({ ...column, children: normalizedChildren } as T);
  }
  return {
    ...column,
    align: defaultAlign,
    headerAlign: defaultAlign,
    children: normalizedChildren,
  } as T;
}

/** 桥接 + 可选默认对齐的统一入口（推荐列定义管线使用）。 */
export function normalizeColumnAlignmentsWith<T extends ColumnLike>(
  columns: T[],
  options: DefaultAlignmentOptions = {},
): T[] {
  const { defaultAlign = null } = options;
  return columns.map((column) => {
    const withDefault =
      defaultAlign == null ? column : ensureDefaultAlignment(column, defaultAlign);
    return normalizeColumnAlignment(withDefault);
  });
}
