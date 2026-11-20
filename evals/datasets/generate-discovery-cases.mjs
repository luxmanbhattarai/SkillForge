#!/usr/bin/env node
// generate-discovery-cases.mjs — generates one skill-discovery case
// per registry skill, from the skill's own description.
//
// The generated task is the skill's description rephrased as a help
// request; the case passes when the mock retriever ranks the skill in
// its top 3. This is a discoverability smoke test, not a deep eval: it
// catches descriptions whose keywords collide with other skills or
// fail to match the terms a user would actually use. It is
// deliberately circular in one direction (the task comes from the
// description), which is why generated cases are reported separately
// from hand-written cases and never counted as behavioral proof.
//
// Regenerate after registry changes:
//   node evals/datasets/generate-discovery-cases.mjs
// Output: evals/datasets/discovery-generated.json (committed, so the
// generated cases are reviewable like any other case file).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const registry = JSON.parse(await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8'));

const cases = registry.skills
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((s) => ({
    id: `GEN-disc-${s.name}`,
    category: 'skill-discovery',
    skill: s.name,
    type: 'positive',
    input: `I need help with this: ${s.description}`,
    expected: { skills: [s.name], topN: 3 },
    notes: `Generated from the registry description of ${s.name}. Pass = the skill ranks in the top 3 selected.`,
  }));

await writeFile(
  path.join(ROOT, 'evals', 'datasets', 'discovery-generated.json'),
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: cases.length, cases }, null, 2) + '\n',
  'utf8',
);
console.log(`Generated ${cases.length} discovery cases -> evals/datasets/discovery-generated.json`);
