// cache-control-parse.mjs — executable fixture for COD-cache-control-001.
//
// Parses a Cache-Control header value into a directive object, per the
// caching skill's documented header forms. The skill's own example
// response header is "Cache-Control: public, max-age=60,
// stale-while-revalidate=30" — that exact value is asserted here,
// grounding the fixture in the skill's text. The skill also documents
// `private` for per-user data and `no-store` for sensitive data.
//
// run(input) takes { header: <string> } and returns an object mapping
// each directive to true (bare directive) or its value (numbers parsed
// as integers). Directive names are camelCased (max-age -> maxAge).
// Pure functions only: no I/O, no network, no timers.

function camelCase(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function run(input) {
  if (!input || typeof input.header !== 'string') {
    throw new Error('expected { header: <string> }');
  }
  const out = {};
  for (const part of input.header.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      out[camelCase(trimmed.toLowerCase())] = true;
    } else {
      const name = trimmed.slice(0, eq).trim().toLowerCase();
      const raw = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '');
      const num = Number(raw);
      out[camelCase(name)] = raw !== '' && Number.isInteger(num) ? num : raw;
    }
  }
  return out;
}

export const tests = [
  // The skill's own example header value.
  {
    input: { header: 'public, max-age=60, stale-while-revalidate=30' },
    expected: { public: true, maxAge: 60, staleWhileRevalidate: 30 },
  },
  // The skill's per-user form: `private` for per-user data.
  { input: { header: 'private' }, expected: { private: true } },
  // The skill's sensitive-data form: `no-store`.
  { input: { header: 'no-store' }, expected: { noStore: true } },
  // A longer TTL on the skill's shared-cache form.
  {
    input: { header: 'public, max-age=3600' },
    expected: { public: true, maxAge: 3600 },
  },
];
