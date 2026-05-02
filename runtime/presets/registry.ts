/**
 * runtime/presets/registry.ts — 预设注册系统
 *
 * 允许各业务模块通过 installPreset() 向 COLUMN_AUTO_MAP 注入字段映射，
 * 实现"按需安装、互不干扰"的插件化架构。
 *
 * 使用方式：
 *   import { createPreset } from '@agile-team/wk-skills-ui/runtime';
 *   const myPreset = createPreset('my-biz', () => {
 *     registerColumnAutoMaps({ myField: { ... } });
 *   });
 *   myPreset.install();
 */
import type { ColumnLike } from "../core/types";
import { registerColumnAutoMaps } from "../core/registry";

export interface PresetConfig {
  /** 预设名称（唯一标识） */
  name: string;
  /** 列字段映射 */
  columns: Record<string, Partial<ColumnLike>>;
  /** 安装钩子（可选，注册后执行一次） */
  onInstall?: () => void;
}

const _installedPresets = new Set<string>();

/**
 * 安装一个预设：把 columns 批量注册进 COLUMN_AUTO_MAP
 * 重复安装同名预设时自动跳过（幂等）
 */
export function installPreset(config: PresetConfig): void {
  if (_installedPresets.has(config.name)) return;
  registerColumnAutoMaps(config.columns);
  config.onInstall?.();
  _installedPresets.add(config.name);
}

/**
 * 工厂：创建一个可延迟安装的预设对象
 *
 * @example
 * const safePreset = createPreset({ name: 'safe', columns: { riskLevel: { ... } } });
 * safePreset.install();   // 按需调用
 */
export function createPreset(config: PresetConfig) {
  return {
    name: config.name,
    install: () => installPreset(config),
    isInstalled: () => _installedPresets.has(config.name),
  };
}

/** 获取已安装预设名称列表（调试用） */
export function getInstalledPresets(): ReadonlySet<string> {
  return _installedPresets;
}
