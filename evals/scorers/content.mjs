// content.mjs — scores instruction-following, technical correctness,
// hallucination resistance, error handling, output quality, and
// tool-use cases by checking the grounded answer.
//
// Checks:
//   must-include — each required string appears in the answer
//                  (case-insensitive substring)
//   must-exclude — each forbidden string is absent from the answer
//   tools        — each required tool/step is mentioned in the plan
//   no-forbidden-tools — no forbidden tool appears in the plan
//
// The mock agent grounds its answer only in loaded skill text, so a
// must-include failure means the skill does not contain the guidance
// (or the wrong skill was selected — check the selection checks first).

// Whitespace-insensitive match: skill files wrap at ~80 columns, so a
// phrase in the skill may span a line break. Collapse all whitespace
// runs to single spaces on both sides before matching.
function includes(haystack, needle) {
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ');
  return norm(haystack).includes(norm(needle));
}

export function scoreContent(evalCase, observation) {
  const expected = evalCase.expected || {};
  const answer = observation.answer || '';
  const checks = [];

  for (const needle of expected.mustInclude || []) {
    checks.push({
      name: `must-include: ${needle}`,
      pass: includes(answer, needle),
      detail: includes(answer, needle)
        ? `answer contains "${needle}"`
        : `answer does not contain "${needle}"`,
    });
  }
  for (const needle of expected.mustExclude || []) {
    checks.push({
      name: `must-exclude: ${needle}`,
      pass: !includes(answer, needle),
      detail: !includes(answer, needle)
        ? `answer avoids "${needle}"`
        : `answer contains forbidden "${needle}"`,
    });
  }

  const plan = (observation.tools || []).join('\n');
  for (const tool of expected.tools || []) {
    checks.push({
      name: `tool: ${tool}`,
      pass: includes(plan, tool),
      detail: includes(plan, tool)
        ? `plan mentions "${tool}"`
        : `plan does not mention "${tool}"`,
    });
  }
  for (const tool of expected.forbiddenTools || []) {
    checks.push({
      name: `no-forbidden-tool: ${tool}`,
      pass: !includes(plan, tool),
      detail: !includes(plan, tool)
        ? `plan avoids "${tool}"`
        : `plan mentions forbidden "${tool}"`,
    });
  }

  return checks;
}
