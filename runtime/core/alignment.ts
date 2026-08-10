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
