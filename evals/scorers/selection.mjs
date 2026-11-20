// selection.mjs — scores skill discovery / selection / trigger cases.
//
// Checks:
//   recall    — every expected skill was selected
//   precision — at least half of the selected skills were expected
//               (skipped when the case lists no expected skills, or
//               when the case uses topN ranking instead)
//   top-n     — every expected skill ranks within the first N selected
//               (used by generated discovery cases, where precision
//               against a single expected skill would be misleading)
//   no-forbidden — no forbidden (distractor) skill was selected
//
// A selection failure is a statement about the registry descriptions
// (the mock retriever matches name+description text), so the fix is
// usually a better description — never tuning the mock to the case.

export function scoreSelection(evalCase, observation) {
  const expected = evalCase.expected || {};
  const want = expected.skills || [];
  const forbidden = expected.notSkills || [];
  const selected = observation.selectedSkills || [];
  const checks = [];

  if (want.length > 0) {
    const missing = want.filter((s) => !selected.includes(s));
    checks.push({
      name: 'recall',
      pass: missing.length === 0,
      detail: missing.length === 0
        ? `all ${want.length} expected skill(s) selected`
        : `missing expected skill(s): ${missing.join(', ')} (selected: ${selected.join(', ') || 'none'})`,
    });
    if (typeof expected.topN === 'number') {
      const top = selected.slice(0, expected.topN);
      const outside = want.filter((s) => !top.includes(s));
      checks.push({
        name: `top-${expected.topN}`,
        pass: outside.length === 0,
        detail: outside.length === 0
          ? `all expected skill(s) rank in the top ${expected.topN}`
          : `expected skill(s) outside top ${expected.topN}: ${outside.join(', ')} (top ${expected.topN}: ${top.join(', ') || 'none'})`,
      });
    } else {
      const hits = selected.filter((s) => want.includes(s)).length;
      const precision = selected.length > 0 ? hits / selected.length : 0;
      checks.push({
        name: 'precision',
        pass: precision >= 0.5,
        detail: `precision ${hits}/${selected.length} = ${precision.toFixed(2)} (need >= 0.50)`,
      });
    }
  }

  if (forbidden.length > 0) {
    const bad = selected.filter((s) => forbidden.includes(s));
    checks.push({
      name: 'no-forbidden',
      pass: bad.length === 0,
      detail: bad.length === 0
        ? 'no forbidden skill selected'
        : `forbidden skill(s) selected: ${bad.join(', ')}`,
    });
  }

  return checks;
}
