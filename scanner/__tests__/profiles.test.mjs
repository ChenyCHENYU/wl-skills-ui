import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listProfiles,
  resolveProjectProfile,
} from "../../standards/profiles-loader.mjs";
import { getRules } from "../rules/index.mjs";
import { filterCoverageForProfile } from "../coverage.mjs";
import { scanProject } from "../engine.mjs";

const cleanup = [];

afterEach(() => {
  while (cleanup.length) rmSync(cleanup.pop(), { recursive: true, force: true });
});

function project(pkg = {}) {
  const root = mkdtempSync(join(tmpdir(), "wl-profile-"));
  cleanup.push(root);
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg), "utf8");
  return root;
}

describe("UI profiles", () => {
  it("按依赖识别 AG adapter，显式参数优先", () => {
    const root = project({ dependencies: { "ag-grid-community": "^34.0.0" } });
    assert.equal(resolveProjectProfile({ projectRoot: root }).profile.id, "legacy-jh-ag");
    assert.equal(
      resolveProjectProfile({ projectRoot: root, profile: "native-element" }).profile.id,
      "native-element",
    );
  });

  it("联邦插件依赖视为 AG 形态（AG Grid 经 agGridApp 远程提供）", () => {
    const root = project({
      dependencies: {
        "@originjs/vite-plugin-federation": "1.4.1-jh.3",
        "@jhlc/common-core": "3.1.0-prod.14",
      },
    });
    const resolution = resolveProjectProfile({ projectRoot: root });
    assert.equal(resolution.profile.id, "legacy-jh-ag");
    assert.equal(resolution.source, "dependencies");
  });

  it("native-jh-ag 覆盖平台混合形态（native 运行时 + jh 封装 + AG）", () => {
    const profile = listProfiles().find((item) => item.id === "native-jh-ag");
    assert.ok(profile, "native-jh-ag profile 必须存在");
    assert.equal(profile.mode, "native");
    for (const adapter of ["element-plus", "base", "jh", "c", "ag-grid"]) {
      assert.ok(profile.adapters.includes(adapter), `adapters 应含 ${adapter}`);
    }
    assert.equal(profile.stylePreset, "styles/presets/full");
    assert.equal(profile.runtimePreset, "runtime/profiles/native-jh-ag");
  });

  it("依赖自动识别不作为严格校验依据，显式声明才是", () => {
    const depsOnly = project({
      dependencies: { "@jhlc/common-core": "3.1.0-prod.14" },
    });
    assert.equal(resolveProjectProfile({ projectRoot: depsOnly }).explicit, false);

    const explicitArg = project({
      dependencies: { "@jhlc/common-core": "3.1.0-prod.14" },
    });
    assert.equal(
      resolveProjectProfile({
        projectRoot: explicitArg,
        profile: "native-jh-ag",
      }).explicit,
      true,
    );

    const withConfig = project({
      dependencies: { "@jhlc/common-core": "3.1.0-prod.14" },
    });
    writeFileSync(
      join(withConfig, ".wl-ui-profile.json"),
      JSON.stringify({ profile: "native-jh-ag" }),
      "utf8",
    );
    const configResolution = resolveProjectProfile({ projectRoot: withConfig });
    assert.equal(configResolution.source, "config");
    assert.equal(configResolution.explicit, true);

    const withManifest = project({
      dependencies: { "@jhlc/common-core": "3.1.0-prod.14" },
    });
    writeFileSync(
      join(withManifest, ".wl-skills-ui-manifest.json"),
      JSON.stringify({ profile: "native-jh-ag" }),
      "utf8",
    );
    const manifestResolution = resolveProjectProfile({
      projectRoot: withManifest,
    });
    assert.equal(manifestResolution.source, "manifest");
    assert.equal(manifestResolution.explicit, true);
  });

  it("每个 profile 的样式与 runtime 入口都显式声明", () => {
    for (const profile of listProfiles()) {
      assert.ok(profile.adapters.length > 0);
      assert.match(profile.stylePreset, /^styles\/presets\//);
      assert.match(profile.runtimePreset, /^runtime\/profiles\//);
    }
  });

  it("只有 AG 形态启用 R021，native-jh-ag 同时保留 Base 规则", () => {
    const nativeRules = new Set(getRules({ profile: "native-element" }).map((r) => r.id));
    const elementRules = new Set(
      getRules({ profile: "legacy-jh-element" }).map((r) => r.id),
    );
    const agRules = new Set(getRules({ profile: "legacy-jh-ag" }).map((r) => r.id));
    const hybridRules = new Set(getRules({ profile: "native-jh-ag" }).map((r) => r.id));
    assert.ok(!nativeRules.has("R003"));
    assert.ok(!nativeRules.has("R021"));
    assert.ok(elementRules.has("R003"));
    assert.ok(!elementRules.has("R021"));
    assert.ok(agRules.has("R021"));
    assert.ok(hybridRules.has("R003"), "native-jh-ag 应保留 Base 封装规则 R003");
    assert.ok(hybridRules.has("R021"), "native-jh-ag 应启用 AG 专属规则 R021");
  });

  it("推荐 Skill 不会越过 profile adapter 边界", () => {
    const profile = listProfiles().find((item) => item.id === "native-element");
    const filtered = filterCoverageForProfile(
      {
        vendors: ["Base*", "AG Grid"],
        recommendedSkills: ["element/el-table", "vendors/base-table", "vendors/ag-grid"],
        files: {
          "A.vue": {
            recommendedSkills: ["element/el-table", "vendors/ag-grid"],
          },
        },
      },
      profile,
    );
    assert.deepEqual(filtered.recommendedSkills, ["element/el-table"]);
    assert.deepEqual(filtered.unsupportedVendors, ["Base*", "AG Grid"]);
    assert.deepEqual(filtered.files["A.vue"].recommendedSkills, ["element/el-table"]);
  });

  it("单文件报告与豁免统一使用项目根相对路径", () => {
    const root = project();
    const sourceDir = join(root, "src", "views");
    const source = join(sourceDir, "Demo.vue");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(
      source,
      '<template><el-button>新增</el-button></template>\n',
      "utf8",
    );

    const first = scanProject({
      projectRoot: root,
      target: "src/views/Demo.vue",
      profile: "native-element",
    });
    assert.ok(first.issues.length > 0);
    assert.ok(first.issues.every((issue) => issue.file === "src/views/Demo.vue"));

    writeFileSync(
      join(root, ".wl-exempt.json"),
      JSON.stringify({ exemptPaths: ["src/views/**"] }),
      "utf8",
    );
    const exempted = scanProject({
      projectRoot: root,
      target: "src/views/Demo.vue",
      profile: "native-element",
    });
    assert.equal(exempted.issues.length, 0);
    assert.equal(exempted.exemptFileCount, 1);
  });

  it("changedFallback 未知值失败关闭", () => {
    const root = project();
    assert.throws(
      () =>
        scanProject({
          projectRoot: root,
          target: "package.json",
          profile: "native-element",
          changedFallback: "typo",
        }),
      /仅支持 error \/ full/,
    );
  });
});
