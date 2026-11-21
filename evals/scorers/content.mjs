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
//   grounded-in — the case's primary skill was among the selected
//                 skills, so the answer's content came via the skill
//                 under evaluation rather than incidentally from
//                 another selected skill's text (A-34, partial).
//
// The mock agent grounds its answer only in loaded skill text, so a
// must-include failure means the skill does not contain the guidance
// (or the wrong skill was selected — check the selection checks first).
//
// Honest limit (A-34, remainder): grounded-in proves the evaluated
// skill was selected; it does not prove the must-include phrase was
// surfaced by the task. The primary skill's full body is in the
// grounded answer by design (mock-agent.mjs `answer()`), so a phrase
// can still pass from anywhere in the file. That half is disclosed in
// evals/README.md and the report limitations, not fixed here —
// restricting the answer to task-matched lines would drop guidance
// that sits on low-keyword lines and invalidate the baseline.

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

  // The answer must be grounded in the skill under evaluation: if the
  // agent never selected that skill, a must-include pass would only
  // prove the phrase appears in some other selected skill's text.
  // Skipped for cases with no primary skill (cross-cutting cases).
  if (evalCase.skill) {
    const selected = observation.selectedSkills || [];
    checks.push({
      name: `grounded-in: ${evalCase.skill}`,
      pass: selected.includes(evalCase.skill),
      detail: selected.includes(evalCase.skill)
        ? `evaluated skill "${evalCase.skill}" was selected`
        : `evaluated skill "${evalCase.skill}" was not selected (selected: ${selected.join(', ') || 'none'})`,
    });
  }

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
