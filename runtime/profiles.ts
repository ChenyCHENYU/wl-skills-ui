import {
  installUiRuntimeGuards,
  type UiRuntimeGuardOptions,
} from "./guards.ts";

export type UiRuntimeProfileId =
  | "native-element"
  | "legacy-jh-element"
  | "legacy-jh-ag";

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
});

export function installUiRuntimeProfile(profile: UiRuntimeProfileId): void {
  const options = UI_RUNTIME_PROFILES[profile];
  if (!options) throw new Error(`Unknown UI runtime profile: ${profile}`);
  installUiRuntimeGuards(options);
}
