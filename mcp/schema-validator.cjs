"use strict";

// Local MCP input validation; independent of Kit and the integration protocol.
function matchesType(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isSafeInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function validateString(schema, value, label, errors) {
  if (typeof value !== "string") return;
  if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${label} 格式不符合要求`);
}

function validateObject(schema, value, label, errors) {
  if (!matchesType(value, "object")) return;
  for (const key of schema.required || []) {
    if (!Object.hasOwn(value, key)) errors.push(`${label}.${key} 为必填项`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (Object.hasOwn(schema.properties || {}, key)) validateNode(schema.properties[key], item, `${label}.${key}`, errors);
    else if (schema.additionalProperties === false) errors.push(`${label}.${key} 是未声明参数`);
  }
}

function validateNumber(schema, value, label, errors) {
  if (typeof value !== "number") return;
  if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${label} 不能小于 ${schema.minimum}`);
  if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${label} 不能大于 ${schema.maximum}`);
}

function validateNode(schema, value, label, errors) {
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${label} 类型应为 ${schema.type}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${label} 必须是 ${schema.enum.join(" / ")}`);
  validateObject(schema, value, label, errors);
  if (Array.isArray(value) && schema.items) value.forEach((item, index) => validateNode(schema.items, item, `${label}[${index}]`, errors));
  validateNumber(schema, value, label, errors);
  validateString(schema, value, label, errors);
}

function validateSchema(schema, value) {
  const errors = [];
  validateNode(schema, value, "$", errors);
  return { valid: errors.length === 0, errors };
}

module.exports = { validateSchema };
