/** Expand bounded, registered selectors before scans, records or writes begin. */
export function expandRuleSelector(input, registered) {
  if (typeof input !== "string") throw new Error("规则选择器必须是字符串");
  const selected = new Set();
  const known = new Set([...registered, "SFC_PARSE"]);
  for (const part of input.split(",").map(value => value.trim().toUpperCase())) {
    const range = part.match(/^R(\d{3})-(?:R)?(\d{3})$/u);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let index = Math.min(start, end); index <= Math.max(start, end); index++) selected.add(`R${String(index).padStart(3, "0")}`);
    } else selected.add(part);
  }
  const missing = [...selected].filter(id => !known.has(id));
  if (missing.length) throw new Error(`不存在或格式无效的规则：${missing.join("、") || "空规则"}；请用 wl-ui rules list 核对规则 ID`);
  return selected;
}
