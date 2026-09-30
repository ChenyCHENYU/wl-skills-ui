import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = join(__dirname, "profiles.json");
let cache = null;

/**
 * profile 解析的"显式来源"：只有用户明确声明的 profile 才允许驱动
 * 严格校验（check I002/I003 等）。依赖自动识别仅用于 skill 过滤与建议，
 * 不作为执法依据——避免升级后把本来绿灯的存量项目判红（1.13 兼容承诺）。
 */
const EXPLICIT_SOURCES = new Set(["argument", "config", "manifest"]);

export function loadProfiles() {
  cache ??= JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
  return cache;
}

export function listProfiles() {
  return loadProfiles().profiles;
}

export function getProfile(id) {
  return listProfiles().find((profile) => profile.id === id) || null;
}

function readJson(path) {
  try {
    // Windows 编辑器/PowerShell 写入的 JSON 常带 UTF-8 BOM，剥掉再解析。
    const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function resolveProjectProfile({ projectRoot = ".", profile, mode } = {}) {
  const root = resolve(projectRoot);
  if (profile) {
    const selected = getProfile(profile);
    if (!selected) throw new Error(`未知 UI profile：${profile}`);
    return { profile: selected, source: "argument", explicit: true };
  }

  const pkg = readJson(join(root, "package.json")) || {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasAg =
    [
      "ag-grid-community",
      "ag-grid-enterprise",
      "ag-grid-vue",
      "ag-grid-vue3",
    ].some((name) => Boolean(deps[name])) ||
    // 平台子应用的 AG Grid 经 Module Federation 远程（agGridApp）提供，
    // 不会出现在 package.json 里；联邦插件依赖即视为 AG 可用形态。
    Boolean(deps["@originjs/vite-plugin-federation"]);
  if (mode === "native") {
    return { profile: getProfile("native-element"), source: "mode", explicit: false };
  }
  if (mode === "skin") {
    return {
      profile: getProfile(hasAg ? "legacy-jh-ag" : "legacy-jh-element"),
      source: "mode",
      explicit: false,
    };
  }

  const configPath = join(root, ".wl-ui-profile.json");
  if (existsSync(configPath)) {
    const raw = readJson(configPath);
    const configured = raw?.profile;
    if (!raw || !configured) {
      throw new Error(
        `${configPath} 不是有效 JSON 或缺少 "profile" 字段，请修正或删除后重试`,
      );
    }
    const selected = getProfile(configured);
    if (!selected) throw new Error(`${configPath} 声明了未知 profile：${configured}`);
    return { profile: selected, source: "config", explicit: true };
  }

  // 安装清单里的 profile 由 wl-ui init 在用户显式 --profile 时写入，
  // 同样视为显式声明；自动识别的安装不写该字段。
  const manifestProfile = readJson(join(root, ".wl-skills-ui-manifest.json"))
    ?.profile;
  if (manifestProfile) {
    const selected = getProfile(manifestProfile);
    if (!selected) {
      throw new Error(
        `.wl-skills-ui-manifest.json 声明了未知 profile：${manifestProfile}`,
      );
    }
    return { profile: selected, source: "manifest", explicit: true };
  }

  if (hasAg) {
    return {
      profile: getProfile("legacy-jh-ag"),
      source: "dependencies",
      explicit: false,
    };
  }

  const hasLegacy =
    Boolean(deps["@jhlc/jh-ui"] || deps["common-core"] || deps["@jhlc/common-core"]);
  return {
    profile: getProfile(hasLegacy ? "legacy-jh-element" : "native-element"),
    source: hasLegacy ? "dependencies" : "default",
    explicit: false,
  };
}

export function ruleEnabledForProfile(rule, profileId) {
  return !Array.isArray(rule.profiles) || rule.profiles.includes(profileId);
}

export function isExplicitProfileSource(source) {
  return EXPLICIT_SOURCES.has(source);
}
