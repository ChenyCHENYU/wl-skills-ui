import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(
  readFileSync(join(root, "skills/_meta/_compat/vendors.json"), "utf8"),
);
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const errors = [];
const ids = new Set();

for (const profile of registry.compatProfiles || []) {
  if (ids.has(profile.id)) errors.push(`重复 compat profile：${profile.id}`);
  ids.add(profile.id);
  if (!profile.mode || !profile.peers || !profile.evidence?.length) {
    errors.push(`${profile.id}: mode / peers / evidence 不完整`);
    continue;
  }
  let evidenceText = "";
  for (const relativePath of profile.evidence) {
    const absolutePath = join(root, relativePath);
    if (!existsSync(absolutePath)) {
      errors.push(`${profile.id}: evidence 不存在：${relativePath}`);
      continue;
    }
    evidenceText += `\n${readFileSync(absolutePath, "utf8")}`;
  }
  const normalizedEvidence = evidenceText.replace(/\s+/g, " ");
  for (const contract of profile.requiredContracts || []) {
    if (!normalizedEvidence.includes(contract.replace(/\s+/g, " "))) {
      errors.push(`${profile.id}: required contract 缺少证据：${contract}`);
    }
  }
}

const jhProfile = registry.compatProfiles?.find(
  (profile) => profile.id === "jh-ui-element-plus-2.2",
);
const jhVendor = registry.vendors?.find((vendor) => vendor.id === "jh");
if (JSON.stringify(jhProfile?.peers) !== JSON.stringify(jhVendor?.compat?.peers)) {
  errors.push("jh compat profile 必须与 vendors[id=jh].compat.peers 保持一致");
}

const nativeProfile = registry.compatProfiles?.find(
  (profile) => profile.id === "native-element-plus-2.7",
);
const installedElementVersion = String(
  packageJson.devDependencies?.["element-plus"] || "",
).replace(/^[^0-9]*/, "");
if (installedElementVersion !== nativeProfile?.peers?.["element-plus"]) {
  errors.push("native compat profile 必须与开发验证用 element-plus 版本保持一致");
}
if (!String(packageJson.peerDependencies?.["element-plus"]).includes(">=2.2")) {
  errors.push("element-plus peerDependencies 必须保留 >=2.2 兼容下界");
}

if (errors.length > 0) {
  console.error(
    `compat matrix check failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `compat matrix check passed (${registry.compatProfiles.length} profiles, evidence complete)`,
);
