import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: "runtime/core/index.ts",
    'common-preset': 'runtime/presets/common.ts',
  },
  format: ["esm"],
  dts: true,
  clean: false, // 不清空 dist/（scss 文件在里面）
  outDir: "es",
  external: ["vue", "element-plus", "@element-plus/icons-vue"],
  treeshake: true,
});
