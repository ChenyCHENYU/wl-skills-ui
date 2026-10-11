import { parseArgs } from "node:util";
import { expandRuleSelector } from "./rule-selector.mjs";

const ACTIONS = { snapshot: ["list", "rollback", "diff", "clean"], exempt: ["init"] };
const MACHINE_OUTPUTS = new Set(["json", "summary", "compact-v2"]);

function validatePositionals(command, positionals) {
  const actions = ACTIONS[command];
  if ((!actions && positionals.length) || positionals.length > 1 || actions && positionals.length && !actions.includes(positionals[0])) {
    throw new Error(`${command} 不接受位置参数 ${positionals.join(" ")}；请使用该命令声明的选项或操作`);
  }
}

function validateValues(values, tokens, options) {
  const seen = new Set();
  for (const token of tokens.filter(item => item.kind === "option")) {
    if (options[token.name]?.type !== "string") continue;
    if (seen.has(token.name)) throw new Error(`--${token.name} 只接受一个值，不静默覆盖前一个参数`);
    seen.add(token.name);
    if (!token.value.trim()) throw new Error(`--${token.name} 缺少有效值`);
  }
  for (const name of ["project", "target"]) {
    if (values[name]?.startsWith("-")) throw new Error(`--${name} 缺少有效路径`);
  }
}

function requestedOutput(args) {
  const equals = args.find(argument => argument.startsWith("--output="));
  const index = args.indexOf("--output");
  return equals ? equals.slice("--output=".length) : index >= 0 ? args[index + 1] : undefined;
}

export function parseScannerInput(command, args, options, registered) {
  try {
    const parsed = parseArgs({ args, options, strict: true, allowPositionals: true, tokens: true });
    validatePositionals(command, parsed.positionals);
    validateValues(parsed.values, parsed.tokens, options);
    for (const name of ["only", "skip"]) if (parsed.values[name]) expandRuleSelector(parsed.values[name], registered);
    return parsed;
  } catch (error) {
    const message = error.message || String(error);
    console.error(`[wl-scan] 无效参数：${message}`);
    if (MACHINE_OUTPUTS.has(requestedOutput(args))) console.log(JSON.stringify({ ok: false, error: { code: "invalid-input", message }, executionStatus: "not-executed", validationStatus: "unverified", checkedFiles: [] }));
    process.exit(1);
  }
}
