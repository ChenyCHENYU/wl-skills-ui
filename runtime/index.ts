/**
 * runtime/index.ts — 公共 API 入口（向后兼容 re-export）
 *
 * 实际实现位于：
 *   runtime/core/types.ts       — 类型定义
 *   runtime/core/renderers.ts   — 渲染函数 + 状态映射
 *   runtime/core/registry.ts    — COLUMN_AUTO_MAP + defineColumns
 *   runtime/presets/registry.ts — createPreset / installPreset
 *
 * 使用：
 *   import { defineColumns, renderOps, renderTagNode } from '@agile-team/wl-skills-ui/runtime';
 */
export * from "./core";
export * from "./presets/registry";
