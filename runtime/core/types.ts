/**
 * runtime/core/types.ts — 基础类型与接口定义
 *
 * 无任何运行时依赖，可被 types-only import 引用。
 */

/** defaultNode 返回格式（对应 jh-tag 组件配置结构） */
export interface JhTagNode {
  tag: "jh-tag";
  item: Array<{ title: string; type?: string }>;
}

/** Element Plus ElTag type 属性合法值 */
export type ElTagType = "primary" | "success" | "warning" | "danger" | "info";

/** 状态映射表中每条记录 */
export interface TagMapItem {
  label: string;
  type: ElTagType;
}

/** 列定义最小契约（兼容 BaseTable / el-table-column / AG Grid 适配层） */
export interface ColumnLike {
  name?: string;
  label?: string;
  width?: number | string;
  fixed?: string | boolean;
  type?: string;
  defaultNode?: (ctx: { row: any }) => any;
  defaultSlot?: (ctx: { row: any }) => any;
  [key: string]: any;
}

/** renderOps：预设图标按钮 */
export interface OpPreset {
  type: "view" | "edit" | "del" | "danger" | "log" | "ok" | "send";
  label?: string;
  title?: string;
  show?: boolean | (() => boolean);
  onClick: (e: MouseEvent) => void;
}

/** renderOps：胶囊按钮（图标 + 文字） */
export interface OpChip {
  type: "chip";
  label: string;
  icon?: import("vue").Component;
  show?: boolean | (() => boolean);
  onClick: (e: MouseEvent) => void;
}

/** renderOps：纯文字链接按钮 */
export interface OpLink {
  type: "link";
  label: string;
  show?: boolean | (() => boolean);
  onClick: (e: MouseEvent) => void;
}

export type OpItem = OpPreset | OpChip | OpLink;
