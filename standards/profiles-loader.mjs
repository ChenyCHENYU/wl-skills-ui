import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = join(__dirname, "profiles.json");
let cache = null;

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
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function resolveProjectProfile({ projectRoot = ".", profile, mode } = {}) {
  const root = resolve(projectRoot);
  if (profile) {
    const selected = getProfile(profile);
    if (!selected) throw new Error(`未知 UI profile：${profile}`);
    return { profile: selected, source: "argument" };
  }

  const pkg = readJson(join(root, "package.json")) || {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasAg = [
    "ag-grid-community",
    "ag-grid-enterprise",
    "ag-grid-vue",
    "ag-grid-vue3",
  ].some((name) => Boolean(deps[name]));
  if (mode === "native") {
    return { profile: getProfile("native-element"), source: "mode" };
  }
  if (mode === "skin") {
    return {
      profile: getProfile(hasAg ? "legacy-jh-ag" : "legacy-jh-element"),
      source: "mode",
    };
  }

  const configPath = join(root, ".wl-ui-profile.json");
  if (existsSync(configPath)) {
    const configured = readJson(configPath)?.profile;
    const selected = getProfile(configured);
    if (!selected) throw new Error(`${configPath} 声明了未知 profile：${configured}`);
    return { profile: selected, source: "config" };
  }

  if (hasAg) return { profile: getProfile("legacy-jh-ag"), source: "dependencies" };

  const hasLegacy =
    Boolean(deps["@jhlc/jh-ui"] || deps["common-core"] || deps["@jhlc/common-core"]);
  return {
    profile: getProfile(hasLegacy ? "legacy-jh-element" : "native-element"),
    source: hasLegacy ? "dependencies" : "default",
  };
}

export function ruleEnabledForProfile(rule, profileId) {
  return !Array.isArray(rule.profiles) || rule.profiles.includes(profileId);
}
