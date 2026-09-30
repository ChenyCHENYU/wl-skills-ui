import {
  installUiRuntimeGuards,
  type UiRuntimeGuardOptions,
} from "./guards.ts";

export type UiRuntimeProfileId =
  | "native-element"
  | "legacy-jh-element"
  | "legacy-jh-ag"
  | "native-jh-ag";

export const UI_RUNTIME_PROFILES: Readonly<
  Record<UiRuntimeProfileId, Readonly<UiRuntimeGuardOptions>>
> = Object.freeze({
  "native-element": Object.freeze({
    themeLock: true,
    overflowTooltip: true,
    splitGridResize: false,
    agGridEmptyState: false,
  }),
  "legacy-jh-element": Object.freeze({
    themeLock: true,
    overflowTooltip: true,
    splitGridResize: false,
    agGridEmptyState: false,
  }),
  "legacy-jh-ag": Object.freeze({
    themeLock: true,
    overflowTooltip: true,
    splitGridResize: true,
    agGridEmptyState: true,
  }),
  // 平台子应用终态形态：native 运行时（defineColumns/renderOps + common
  // preset）叠在 jh/Base/C 封装组件之上，AG Grid 经联邦或 npm 提供。
  // guard 需求与 legacy-jh-ag 同集（分屏 resize + AG 空态）。
  "native-jh-ag": Object.freeze({
    themeLock: true,
    overflowTooltip: true,
    splitGridResize: true,
    agGridEmptyState: true,
  }),
});

export function installUiRuntimeProfile(profile: UiRuntimeProfileId): void {
  const options = UI_RUNTIME_PROFILES[profile];
  if (!options) throw new Error(`Unknown UI runtime profile: ${profile}`);
  installUiRuntimeGuards(options);
}
