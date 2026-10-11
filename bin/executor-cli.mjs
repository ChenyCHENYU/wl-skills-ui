import path from "node:path";
import processCore from "./executor-process.cjs";

// 复用原 scanner CLI，避免 wl-ui 包装器的同步二次子进程。
// 规则与参数归本包维护；共享协议先验证计划、规则子集与目标范围。
export function invokeExecutor({ executor, parameters, projectRoot, runId, plan }) {
  if (executor.id !== "scan") throw new Error(`UI 未实现执行器：${executor.id}`);
  const rules = parameters.rules || plan.ruleRefs.map(rule => rule.legacyId).filter(id => /^R\d{3}$/.test(id));
  if (!rules.length) throw new Error("当前计划没有可执行的 UI R 规则，不能默认扩大扫描范围");
  const args = ["scan", "--project", projectRoot, `--target=${parameters.targets[0]}`, "--run-id", runId, "--output", "json", "--fail-on-error"];
  args.push("--only", rules.join(","));
  return processCore.invokeCli({ cli: path.resolve(import.meta.dirname, "../scanner/index.mjs"), args, projectRoot });
}
