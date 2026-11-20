// cursor-pagination.mjs — executable fixture for COD-pagination-001.
//
// Implements the cursor format the api-design skill documents:
// a base64url-encoded JSON object. The skill's own example cursor
// "eyJpZCI6Im9yZF8wMSJ9" decodes to {"id":"ord_01"} — that value is
// asserted here, grounding the fixture in the skill's text.
//
// run(input) supports { encode: <object> } and { decode: <string> }.
// Pure functions only: no I/O, no network, no timers.

export function run(input) {
  if (input && typeof input === 'object' && 'encode' in input) {
    return Buffer.from(JSON.stringify(input.encode), 'utf8').toString('base64url');
  }
  if (input && typeof input === 'object' && 'decode' in input) {
    return JSON.parse(Buffer.from(input.decode, 'base64url').toString('utf8'));
  }
  throw new Error('expected { encode: <object> } or { decode: <string> }');
}

export const tests = [
  // The skill's own example cursor.
  { input: { decode: 'eyJpZCI6Im9yZF8wMSJ9' }, expected: { id: 'ord_01' } },
  // Round-trip: encode then decode returns the object.
  { input: { encode: { id: 'ord_99', created_at: '2026-11-20' } }, expected: 'eyJpZCI6Im9yZF85OSIsImNyZWF0ZWRfYXQiOiIyMDI2LTExLTIwIn0' },
  { input: { decode: 'eyJpZCI6Im9yZF85OSIsImNyZWF0ZWRfYXQiOiIyMDI2LTExLTIwIn0' }, expected: { id: 'ord_99', created_at: '2026-11-20' } },
];
