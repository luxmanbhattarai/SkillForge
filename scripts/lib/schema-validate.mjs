// schema-validate.mjs — a zero-dependency JSON Schema subset validator
// for the registry schema files in scripts/schemas/.
//
// Supported keywords (and only these): type (string or array of
// strings, including "integer" and "null"), required, properties,
// items, enum, additionalProperties (false, or a schema applied to
// every extra property), minItems. Keywords starting with "$"
// ($schema, $id) are metadata and ignored.
//
// Any other keyword fails loudly: a schema must never silently
// outgrow this validator. If full JSON Schema support is ever
// needed, adopt a real validator (ajv) and revisit the
// zero-dependency policy — do not extend this file into one.
//
// API: validateAgainstSchema(data, schema) -> string[] of errors,
// each "path: message" (empty array = valid). Paths use $.a.b[0]
// notation.

const SUPPORTED = new Set([
  'type',
  'required',
  'properties',
  'items',
  'enum',
  'additionalProperties',
  'minItems',
]);

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function checkType(value, expected, path, errors) {
  const actual = typeOf(value);
  const allowed = Array.isArray(expected) ? expected : [expected];
  // "number" accepts integers too (JSON Schema semantics).
  const ok = allowed.some((t) => t === actual || (t === 'number' && actual === 'integer'));
  if (!ok) {
    errors.push(`${path}: expected type ${allowed.join(' or ')}, got ${actual}`);
    return false;
  }
  return true;
}

function validate(data, schema, path, errors) {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    errors.push(`${path}: schema is not an object`);
    return;
  }
  for (const key of Object.keys(schema)) {
    if (key.startsWith('$')) continue;
    if (!SUPPORTED.has(key)) {
      errors.push(`${path}: unsupported schema keyword '${key}' (validator subset: ${[...SUPPORTED].sort().join(', ')})`);
    }
  }

  if (schema.enum !== undefined) {
    const found = schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(data));
    if (!found) errors.push(`${path}: value ${JSON.stringify(data)} is not one of ${JSON.stringify(schema.enum)}`);
  }

  if (schema.type !== undefined) {
    if (!checkType(data, schema.type, path, errors)) return;
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: array has ${data.length} items, minimum is ${schema.minItems}`);
    }
    if (schema.items !== undefined) {
      data.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`, errors));
    }
    return;
  }

  if (data !== null && typeof data === 'object') {
    for (const key of schema.required || []) {
      if (!(key in data)) errors.push(`${path}: missing required property '${key}'`);
    }
    const props = schema.properties || {};
    for (const [key, sub] of Object.entries(props)) {
      if (key in data) validate(data[key], sub, `${path}.${key}`, errors);
    }
    const extra = Object.keys(data).filter((k) => !(k in props));
    if (schema.additionalProperties === false) {
      for (const key of extra) errors.push(`${path}: additional property '${key}' is not allowed`);
    } else if (schema.additionalProperties !== undefined) {
      for (const key of extra) validate(data[key], schema.additionalProperties, `${path}.${key}`, errors);
    }
  }
}

export function validateAgainstSchema(data, schema) {
  const errors = [];
  validate(data, schema, '$', errors);
  return errors;
}
