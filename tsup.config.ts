import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "runtime/index.ts",
    auto: "runtime/auto.ts",
    "common-preset": "runtime/presets/common.ts",
    "presets/security": "runtime/presets/security.ts",
    "profiles/native-element": "runtime/profile-entries/native-element.ts",
    "profiles/legacy-jh-element": "runtime/profile-entries/legacy-jh-element.ts",
    "profiles/legacy-jh-ag": "runtime/profile-entries/legacy-jh-ag.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true, // outDir 是 es/，与 dist/ 互不影响；v1.8.0 起每次构建清空 es/ 避免 hash 残留
  outDir: "es",
  external: ["vue", "element-plus", "@element-plus/icons-vue"],
  noExternal: ["@babel/runtime"],
  treeshake: true,
});
