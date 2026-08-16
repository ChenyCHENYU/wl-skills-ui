import type { ColumnLike } from "./types";

export type ColumnAlignment = "left" | "center" | "right";

const HEADER_ALIGNMENT_CLASS: Record<ColumnAlignment, string> = {
  left: "wl-ui-table-header-align--left",
  center: "wl-ui-table-header-align--center",
  right: "wl-ui-table-header-align--right",
};

const CELL_ALIGNMENT_CLASS: Record<ColumnAlignment, string> = {
  left: "wl-ui-table-cell-align--left",
  center: "wl-ui-table-cell-align--center",
  right: "wl-ui-table-cell-align--right",
};

function isColumnAlignment(value: unknown): value is ColumnAlignment {
  return value === "left" || value === "center" || value === "right";
}

function mergeCellClass(
  current: ColumnLike["cellClass"],
  alignmentClass: string,
  params: any,
): string | string[] {
  const value = typeof current === "function" ? current(params) : current;
  if (value === undefined || value === null || value === "") {
    return alignmentClass;
  }
  return Array.isArray(value) ? [...value, alignmentClass] : [value, alignmentClass];
}

function mergeCellStyle(
  current: ColumnLike["cellStyle"],
  align: ColumnAlignment,
  params: any,
): Record<string, unknown> {
  const value = typeof current === "function" ? current(params) : current;
  return {
    textAlign: align,
    ...(value ?? {}),
  };
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
  const needsCellStyle = Boolean(align);
  // 自定义 cellStyle 可能自带动态对齐：只把 align 作为其默认值，
  // 不再叠加 !important 对齐 class，避免压过业务返回的 textAlign。
  const needsCellClass = Boolean(align) && column.cellStyle === undefined;
  const needsHeaderClass = Boolean(headerAlign) && column.headerClass === undefined;

  if (!needsChildren && !needsCellStyle && !needsCellClass && !needsHeaderClass)
    return column;

  return {
    ...column,
    ...(needsChildren ? { children: normalizedChildren } : {}),
    // common-core 3.x 的 AG 适配层只调用函数型 cellStyle/cellClass；函数形态同时
    // 也是 AG Grid 原生合法配置，避免对象型样式被兼容层静默丢弃。
    ...(needsCellStyle
      ? {
          cellStyle: (params: any) =>
            mergeCellStyle(column.cellStyle, align!, params),
        }
      : {}),
    ...(needsCellClass
      ? {
          cellClass: (params: any) =>
            mergeCellClass(
              column.cellClass,
              CELL_ALIGNMENT_CLASS[align!],
              params,
            ),
        }
      : {}),
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
 * - 递归处理分组列 children；声明式分组自身无叶子单元格，不补自身 align；
 * - 与 normalizeColumnAlignment 兼容：补齐产物仍可被桥接函数消费。
 */
export function ensureDefaultAlignment<T extends ColumnLike>(
  column: T,
  defaultAlign: ColumnAlignment,
): T {
  const normalizedChildren = Array.isArray(column.children)
    ? column.children.map((child) => ensureDefaultAlignment(child, defaultAlign))
    : column.children;
  // 分组列：只递归子列，自身不补（align 对分组行无语义）
  if (Array.isArray(column.children)) {
    return normalizedChildren === column.children
      ? column
      : ({ ...column, children: normalizedChildren } as T);
  }
  const hasExplicit =
    column.align !== undefined ||
    column.cellStyle !== undefined ||
    column.headerClass !== undefined;
  if (hasExplicit) {
    return column;
  }
  return {
    ...column,
    align: defaultAlign,
    headerAlign: defaultAlign,
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
