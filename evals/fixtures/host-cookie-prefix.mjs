// host-cookie-prefix.mjs — executable fixture for COD-host-cookie-001.
//
// Validates a Set-Cookie string against the `__Host-` cookie prefix
// rules the session-management skill documents: the prefix "binds the
// cookie to the host (no `Domain` attribute, `Path=/`, `Secure`
// required), so a subdomain cannot set or overwrite it." The test
// cookies are built from the skill's own example cookie,
// "Set-Cookie: session=$SESSION_ID; Path=/; HttpOnly; Secure;
// SameSite=Lax; Max-Age=86400", with the `__Host-` prefix applied.
//
// run(input) takes { cookie: <string> } (the Set-Cookie value) and
// returns { valid: <boolean>, violations: [<string>, ...] } with
// violations listed in a fixed order: name prefix, Secure, Path,
// Domain. Pure functions only: no I/O, no network, no timers.

export function run(input) {
  if (!input || typeof input.cookie !== 'string') {
    throw new Error('expected { cookie: <string> }');
  }
  const parts = input.cookie.split(';').map((p) => p.trim()).filter(Boolean);
  const [namePart, ...attrs] = parts;
  const name = namePart.split('=')[0].trim();
  const flags = new Set();
  const values = new Map();
  for (const attr of attrs) {
    const eq = attr.indexOf('=');
    if (eq === -1) flags.add(attr.toLowerCase());
    else values.set(attr.slice(0, eq).trim().toLowerCase(), attr.slice(eq + 1).trim());
  }
  const violations = [];
  if (!name.startsWith('__Host-')) violations.push('name lacks __Host- prefix');
  if (!flags.has('secure')) violations.push('missing Secure');
  if (values.get('path') !== '/') violations.push('Path is not /');
  if (values.has('domain')) violations.push('Domain attribute present');
  return { valid: violations.length === 0, violations };
}

export const tests = [
  // The skill's example cookie with the __Host- prefix: valid.
  {
    input: { cookie: '__Host-session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400' },
    expected: { valid: true, violations: [] },
  },
  // Secure is required by the prefix rules.
  {
    input: { cookie: '__Host-session=abc123; Path=/; HttpOnly; SameSite=Lax' },
    expected: { valid: false, violations: ['missing Secure'] },
  },
  // No Domain attribute is allowed with the prefix.
  {
    input: { cookie: '__Host-session=abc123; Path=/; HttpOnly; Secure; Domain=example.com' },
    expected: { valid: false, violations: ['Domain attribute present'] },
  },
  // Path must be exactly /.
  {
    input: { cookie: '__Host-session=abc123; Path=/app; HttpOnly; Secure' },
    expected: { valid: false, violations: ['Path is not /'] },
  },
  // Without the __Host- prefix the rules do not apply.
  {
    input: { cookie: 'session=abc123; Path=/; HttpOnly; Secure' },
    expected: { valid: false, violations: ['name lacks __Host- prefix'] },
  },
];
