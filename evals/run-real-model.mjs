#!/usr/bin/env node
// run-real-model.mjs — dedicated real-model evaluation runner.
//
// Runs the representative real-model subset (default:
// evals/datasets/real-model-subset-v2.json, 89 cases) against a live
// model provider and produces a reproducible run record: model name
// AND the exact served model version observed in responses,
// timestamp, dataset version + SHA-256, per-case results, aggregate
// scores across eight dimensions, failed cases with failure
// categories, and cost/token tracking when the provider reports it.
//
// This runner is separate from run-evals.mjs --provider model on
// purpose: a real-model run answers a different question (how does
// one model behave?) and needs a different record (served model
// version, dimension aggregates, failure classification, dataset
// fingerprint) than the mock regression suite. The two share the
// case validation (runners/run-evals.mjs validateCases) and the
// four scorers, so a case scores identically in both.
//
// Providers come from the registry (evals/lib/provider-registry.mjs):
// --provider gemini (default), openai, anthropic, local, or model
// (the legacy generic OpenAI-compatible provider). The registry
// resolves the name to its adapter; an unconfigured provider fails
// fast (exit 2) naming the missing variables, and the runner never
// falls back to another provider. Credentials come only from the
// environment (or, for the helper-based Gemini adapter, from the
// Secure Vault via the helper — never from a file, and never pasted
// into an env var by this runner). The key and the full endpoint
// URL never appear in any report — reports carry the endpoint host
// only.
//
// Gemini defaults (applied to the env copy passed to the adapter,
// never to process.env): model gemini-3.5-flash (the verified model
// for the connected key; gemini-2.5-flash 404s for it) and
// max_tokens 2048 (this thinking model returns empty content on
// small budgets). An operator-set value always wins over a default.
//
// Run discipline for live providers: cases run sequentially with a
// small delay between them (--delay-ms, default 500). A fresh
// rate-limit (429) error retries the case once after a backoff
// (--retry-backoff-ms, default 10000); a 429 whose adapter already
// exhausted its own retries is not retried again. An authentication
// error (401/403) or a model-unavailable error (404) aborts the
// whole run immediately (exit 2, no report written) — a rejected
// credential is never retried blindly, and a missing model would
// fail every remaining case identically. An empty model response is
// recorded as the observed outcome (emptyResponse on the result,
// plus finishReason when the adapter surfaces it); it never crashes
// the run and is never retried in a loop.
//
// Checkpointing: live calls can take minutes each, so a full run
// takes hours and an interruption must not lose it. After every
// case completes (pass or provider-error failure), the runner
// atomically writes <outDir>/checkpoint.json with all results so
// far, the dataset fingerprint, the provider/model, and accumulated
// token totals. --resume <checkpoint> continues an interrupted run:
// it validates the checkpoint against the current dataset and
// provider, skips already-completed cases (no re-billing), keeps
// the original run id, and merges the checkpointed token totals
// into the final report. A case in flight when the process died is
// re-run on resume (one extra call) — the checkpoint only ever
// records completed cases.
//
// Usage:
//   node evals/run-real-model.mjs [--provider <name>] [--dataset <path>]
//                                 [--out <dir>] [--archive <file>]
//                                 [--resume <checkpoint.json>]
//                                 [--delay-ms N] [--retry-backoff-ms N]
//                                 [--report-only] [--json] [--no-retrieval]
//   --provider   registry provider name (default: gemini)
//   --dataset    subset file (default: evals/datasets/real-model-subset-v2.json)
//   --out        report directory (default: evals/reports/model/<run-id>/;
//                on --resume, defaults to the checkpoint's directory)
//   --archive    also write the JSON report to this file (e.g.
//                ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22.json)
//   --resume     continue an interrupted run from its checkpoint.json
//   --delay-ms   pause between cases (default: 500)
//   --retry-backoff-ms  pause before a 429 retry (default: 10000)
//   --report-only  always exit 0 (reporting mode)
//   --json       print the run summary as JSON instead of text
//   --no-retrieval  do NOT give the model a candidate skill list
//                (the Day 1 condition; retrieval is on by default)
// Exit code 0 = all cases passed (or --report-only); 1 = any case
// failed; 2 = configuration error, dataset error, case-validation
// failure, or aborted run (authentication failure — no report).
//
// Reports are machine-readable JSON (latest.json) plus a human
// summary (latest.md). evals/reports/ is gitignored: use --archive
// (or copy the report into ai/test-results/ with a dated name) for
// a run worth keeping.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWriteFile } from '../scripts/lib/atomic-write.mjs';
import { resolveProvider, KNOWN_PROVIDERS } from './lib/provider-registry.mjs';
import { validateCases } from './runners/run-evals.mjs';
import { MockAgent } from './runners/mock-agent.mjs';
import { scoreSelection } from './scorers/selection.mjs';
import { scoreContent } from './scorers/content.mjs';
import { scoreRefusal } from './scorers/refusal.mjs';
import { scoreCode } from './scorers/code.mjs';
import { createVersionCapturingFetch, summarizeServedModel } from './lib/model-version.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVALS_DIR = path.join(ROOT, 'evals');
const CASES_DIR = path.join(EVALS_DIR, 'cases');
const GENERATED_FILE = path.join(EVALS_DIR, 'datasets', 'discovery-generated.json');
const DEFAULT_DATASET = path.join(EVALS_DIR, 'datasets', 'real-model-subset-v2.json');
const MODEL_REPORTS_DIR = path.join(EVALS_DIR, 'reports', 'model');

export const REPORT_FORMAT_VERSION = 1;
export const CHECKPOINT_FORMAT_VERSION = 1;
export const CHECKPOINT_FILENAME = 'checkpoint.json';
export const DEFAULT_PROVIDER = 'gemini';
export const DEFAULT_DELAY_MS = 500;
export const DEFAULT_RETRY_BACKOFF_MS = 10_000;
// Retrieval candidates per case. 10 covers what the mock's select()
// (max 5 within 60% of the top score) would pick, with room for the
// model to discriminate; each candidate costs ~1 line in the prompt.
export const DEFAULT_RETRIEVAL_TOP_K = 10;

// Provider-specific env defaults, applied (to a copy of env, never
// to process.env) when the operator has not set the variable. Only
// non-secret values may appear here — never a key.
export const PROVIDER_ENV_DEFAULTS = {
  // gemini-3.5-flash is the verified model for the connected key
  // (gemini-2.5-flash returns 404 for it); 2048 output tokens is
  // the minimum that avoids empty content from this thinking model.
  gemini: { GEMINI_MODEL: 'gemini-3.5-flash', GEMINI_MAX_TOKENS: '2048' },
};

// Apply a provider's env defaults to a copy of env. Returns
// { env, applied } where applied names the variables defaulted
// (recorded in the run report so the effective config is visible).
export function applyProviderEnvDefaults(providerName, env) {
  const defaults = PROVIDER_ENV_DEFAULTS[providerName] || {};
  const next = { ...env };
  const applied = [];
  for (const [name, value] of Object.entries(defaults)) {
    if (!(next[name] || '').trim()) {
      next[name] = value;
      applied.push(name);
    }
  }
  return { env: next, applied };
}

// An authentication failure (401/403) aborts the run immediately:
// a rejected credential is never retried blindly. Matched against
// the provider error's message (adapters surface HTTP status in
// it, e.g. "Gemini provider HTTP 403").
export function isAuthError(error) {
  const message = String(error && error.message || '');
  return /(\b401\b|\b403\b|unauthorized|forbidden|UNAUTHENTICATED|PERMISSION_DENIED)/i.test(message);
}

// A rate-limit failure retries once after a backoff. Matched
// against the provider error's message.
export function isRateLimitError(error) {
  const message = String(error && error.message || '');
  return /(\b429\b|rate.?limit|RESOURCE_EXHAUSTED|quota.?exceeded)/i.test(message);
}

// True when the error message says retries are already exhausted
// ("after 1 retry", "after 3 attempt(s)"): the adapter retried
// internally and gave up, so a runner-level retry would only pile
// on more attempts against a provider that already said to back
// off. The runner retries only a "fresh" rate limit. Note the
// alternation spells "retry" and "retries" out: the naive
// /retries?/ never matches "retry" (no "ie" in it).
export function isRetryExhausted(error) {
  const message = String(error && error.message || '');
  return /after \d+ (retr(?:y|ies)|attempt)/i.test(message);
}

// A model-unavailable failure (HTTP 404 naming the model) aborts
// the run like an auth failure: the model is gone for every case,
// so continuing would burn one failed call per case. Matched
// against the provider error's message.
export function isModelUnavailableError(error) {
  const message = String(error && error.message || '');
  return /(\b404\b|model unavailable|not available for this key)/i.test(message);
}

export class RunAbortError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'RunAbortError';
    this.code = code;
  }
}

export class AuthAbortError extends RunAbortError {
  constructor(message) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthAbortError';
  }
}

export class ModelUnavailableError extends RunAbortError {
  constructor(message) {
    super(message, 'MODEL_UNAVAILABLE');
    this.name = 'ModelUnavailableError';
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The eight aggregate dimensions a real-model run reports. Each
// dimension is a case set drawn from the 12 eval categories (or, for
// unsafe-instruction handling, a predicate over cases). A dimension
// with no cases in the run reports passRate null — never a
// fabricated 0 or 100.
//
// context-preservation is a PROXY: no dedicated context-preservation
// cases exist in the subset. It is measured over the three
// categories whose cases most directly test whether the model keeps
// the task's premises, failure paths, and completeness requirements
// in view (negative-case-handling corrects false premises;
// error-handling covers failure paths; output-quality requires a
// complete, structured answer). The report flags it as a proxy and
// the limitation is stated in the Markdown summary; a dedicated
// case set is future work, not a silent gap.
export const DIMENSIONS = [
  { id: 'skill-selection', label: 'Skill selection', categories: ['skill-selection', 'skill-discovery', 'trigger-accuracy'] },
  { id: 'instruction-following', label: 'Instruction following', categories: ['instruction-following'] },
  { id: 'refusal', label: 'Refusal', categories: ['security-compliance'] },
  { id: 'code-quality', label: 'Code quality', categories: ['code-generation'] },
  { id: 'grounding', label: 'Grounding', categories: ['technical-correctness', 'hallucination-resistance'] },
  { id: 'tool-use', label: 'Tool use', categories: ['tool-use-correctness'] },
  {
    id: 'unsafe-instruction-handling',
    label: 'Unsafe-instruction handling',
    // The refusal dimension covers every security-compliance case,
    // including legitimate requests (over-refusal). This dimension
    // isolates the unsafe half: requests the model must refuse
    // (prompt injection, destructive commands, secret exfiltration).
    predicate: (c) => c.category === 'security-compliance' && c.expected && c.expected.refuse === true,
  },
  {
    id: 'context-preservation',
    label: 'Context preservation',
    categories: ['error-handling', 'negative-case-handling', 'output-quality'],
    proxy: true,
    proxyNote: 'Proxy dimension: no dedicated context-preservation cases exist in the subset; measured over error-handling, negative-case-handling, and output-quality cases.',
  },
];

// Failure categories for the first-pass machine classification of a
// failed case. They follow ai/audits/REAL-MODEL-EVALUATION.md §5.4;
// the machine can only detect the first six. Case-design issues and
// library gaps need a human reading the model's answer, so every
// failure is flagged needsHumanReview: true and the category is
// recorded as a first pass, not a verdict.
export const FAILURE_CATEGORIES = [
  'provider-error',
  'refusal-gap',
  'code-gap',
  'selection-gap',
  'content-gap',
  'tool-gap',
];

function categoryOfCheck(checkName) {
  if (checkName === 'refused' || checkName === 'not-refused') return 'refusal-gap';
  if (checkName.startsWith('code-') || checkName.startsWith('fixture:')) return 'code-gap';
  if (checkName === 'recall' || checkName === 'precision' || checkName === 'no-forbidden'
    || /^top-\d+$/.test(checkName) || checkName.startsWith('grounded-in:')) return 'selection-gap';
  if (checkName.startsWith('must-include:') || checkName.startsWith('must-exclude:')) return 'content-gap';
  if (checkName.startsWith('tool:') || checkName.startsWith('no-forbidden-tool:')) return 'tool-gap';
  return null;
}

// Classify one failed result. Provider errors (timeouts, 5xx,
// non-JSON output) outrank everything: they say nothing about the
// model. Among scored failures, refusal outranks code outranks
// selection outranks content outranks tool-use — the order the audit
// treats as most-to-least serious. A case with several failed checks
// gets the highest-priority category and keeps the full failed-check
// list, so no signal is lost.
export function classifyFailure(result) {
  const failedChecks = (result.checks || []).filter((c) => !c.pass).map((c) => c.name);
  if (result.failureReason && result.failureReason.startsWith('provider error:')) {
    return { failureCategory: 'provider-error', failedChecks, needsHumanReview: true };
  }
  const categories = new Set(failedChecks.map(categoryOfCheck).filter(Boolean));
  for (const category of FAILURE_CATEGORIES.slice(1)) {
    if (categories.has(category)) {
      return { failureCategory: category, failedChecks, needsHumanReview: true };
    }
  }
  // A failed case with no failed check name we recognize (should not
  // happen — every scorer names its checks). Do not invent a
  // category: record it as unclassified so a human looks at it.
  return { failureCategory: 'unclassified', failedChecks, needsHumanReview: true };
}

// Aggregate per-dimension scores from scored results. `casesById`
// maps case id -> the case object (needed for predicate dimensions).
export function computeDimensions(results, casesById) {
  const dimensions = {};
  for (const dim of DIMENSIONS) {
    const members = results.filter((r) => {
      const c = casesById.get(r.id);
      if (!c) return false;
      if (dim.predicate) return dim.predicate(c);
      return dim.categories.includes(c.category);
    });
    const passed = members.filter((r) => r.pass).length;
    dimensions[dim.id] = {
      label: dim.label,
      ...(dim.proxy ? { proxy: true, proxyNote: dim.proxyNote } : {}),
      total: members.length,
      passed,
      failed: members.length - passed,
      passRate: members.length > 0 ? +(passed / members.length).toFixed(3) : null,
      failedCaseIds: members.filter((r) => !r.pass).map((r) => r.id),
    };
  }
  return dimensions;
}

function isCritical(evalCase, result) {
  if (result.pass) return false;
  if (evalCase.category === 'security-compliance') return true;
  if (evalCase.expected && evalCase.expected.refuse === true) return true;
  return false;
}

// Score one case with the four shared scorers. This mirrors
// run-evals.mjs scoreCase (not exported there); the composition must
// stay identical so a case scores the same in both runners.
async function scoreCase(evalCase, observation) {
  const expected = evalCase.expected || {};
  let checks = [];
  if (expected.skills || expected.notSkills) checks.push(...scoreSelection(evalCase, observation));
  if (expected.mustInclude || expected.mustExclude || expected.tools || expected.forbiddenTools) {
    checks.push(...scoreContent(evalCase, observation));
  }
  if (evalCase.category === 'code-generation' || expected.code || expected.fixture) {
    checks.push(...await scoreCode(evalCase, observation));
  }
  checks.push(...scoreRefusal(evalCase, observation));
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  return {
    checks,
    score: checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0,
    pass: failed.length === 0,
    failureReason: failed.length > 0 ? failed.map((c) => `${c.name}: ${c.detail}`).join(' | ') : null,
  };
}

async function loadAllCases() {
  const cases = [];
  const files = (await readdir(CASES_DIR).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  for (const f of files) {
    const data = JSON.parse(await readFile(path.join(CASES_DIR, f), 'utf8'));
    const list = Array.isArray(data) ? data : (data.cases || []);
    for (const c of list) cases.push({ ...c, _file: `cases/${f}` });
  }
  if (existsSync(GENERATED_FILE)) {
    const data = JSON.parse(await readFile(GENERATED_FILE, 'utf8'));
    const list = Array.isArray(data) ? data : (data.cases || []);
    for (const c of list) cases.push({ ...c, source: 'generated', _file: 'datasets/discovery-generated.json' });
  }
  return cases;
}

// Load a dataset file: an object with an `ids` array (the subset
// files), a `cases` array of { id } objects, or a plain array of
// ids. Returns the dataset metadata plus a SHA-256 fingerprint of
// the file, so a run record pins exactly which dataset it ran.
export async function loadDataset(datasetPath) {
  const abs = path.isAbsolute(datasetPath) ? datasetPath : path.join(ROOT, datasetPath);
  let raw;
  try {
    raw = await readFile(abs, 'utf8');
  } catch (e) {
    throw new Error(`cannot read dataset "${datasetPath}": ${e.message}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`dataset "${datasetPath}" is not valid JSON: ${e.message}`);
  }
  const list = Array.isArray(data) ? data : (data.ids || data.cases || null);
  if (!Array.isArray(list)) {
    throw new Error(`dataset "${datasetPath}" must be a JSON array of case ids or an object with "ids" or "cases"`);
  }
  const ids = list.map((c) => (typeof c === 'string' ? c : c.id)).filter((id) => typeof id === 'string');
  if (ids.length === 0) throw new Error(`dataset "${datasetPath}" contains no case ids`);
  if (new Set(ids).size !== ids.length) throw new Error(`dataset "${datasetPath}" contains duplicate case ids`);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  return {
    file: path.relative(ROOT, abs),
    version: typeof data.version === 'number' ? data.version : null,
    generated: typeof data.generated === 'string' ? data.generated : null,
    supersedes: typeof data.supersedes === 'string' ? data.supersedes : null,
    count: ids.length,
    declaredCount: typeof data.count === 'number' ? data.count : null,
    sha256,
    ids,
  };
}

// Sum the token usage recorded on completed per-case results, so a
// resumed run can merge the checkpointed totals with the new
// session's provider usage. requests counts completed cases (each
// made at least one request; adapter retries on those cases are not
// visible here — see the resumed-run usage note in the report).
// errors counts results that failed as provider errors.
export function computeUsageTotals(results) {
  const totals = { promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0, errors: 0 };
  for (const r of results) {
    totals.requests++;
    if (r.usage) {
      totals.promptTokens += r.usage.promptTokens || 0;
      totals.completionTokens += r.usage.completionTokens || 0;
      totals.totalTokens += r.usage.totalTokens || 0;
    }
    if (r.failureCategory === 'provider-error') totals.errors++;
  }
  return totals;
}

// Assemble a checkpoint object. Only completed cases go in: a case
// in flight when the process dies is simply absent and is re-run on
// resume (one extra call — the price of never recording a result
// that was not observed). servedModels merges the models observed
// in per-case observations with the models captured from response
// bodies by the fetch wrapper, so a resumed run keeps the full
// served-model record.
export function buildCheckpoint({ runId, providerName, requestedModel, dataset, started, results, runnerRetries, servedModels }) {
  return {
    kind: 'skillforge-real-model-eval-checkpoint',
    version: CHECKPOINT_FORMAT_VERSION,
    runId,
    providerName,
    requestedModel,
    dataset: {
      file: dataset.file,
      version: dataset.version,
      count: dataset.count,
      sha256: dataset.sha256,
      ids: dataset.ids,
    },
    started,
    updated: new Date().toISOString(),
    completed: results.length,
    total: dataset.count,
    results,
    runnerRetries,
    servedModels: [...servedModels],
    usageTokens: computeUsageTotals(results),
  };
}

// Read and shape-check a checkpoint file. Throws with a plain
// message when the file is missing, unparsable, or not a checkpoint.
export async function loadCheckpoint(checkpointPath) {
  const abs = path.isAbsolute(checkpointPath) ? checkpointPath : path.join(ROOT, checkpointPath);
  let raw;
  try {
    raw = await readFile(abs, 'utf8');
  } catch (e) {
    throw new Error(`cannot read checkpoint "${checkpointPath}": ${e.message}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`checkpoint "${checkpointPath}" is not valid JSON: ${e.message}`);
  }
  if (data.kind !== 'skillforge-real-model-eval-checkpoint' || data.version !== CHECKPOINT_FORMAT_VERSION) {
    throw new Error(`"${checkpointPath}" is not a real-model checkpoint (kind "${data.kind}", version ${data.version})`);
  }
  if (!Array.isArray(data.results) || typeof data.runId !== 'string' || !data.dataset || typeof data.dataset.sha256 !== 'string') {
    throw new Error(`checkpoint "${checkpointPath}" is malformed: missing runId, results, or dataset fingerprint`);
  }
  return { checkpoint: data, path: abs };
}

// A checkpoint is only resumable against the same dataset (same
// SHA-256 — the file may have moved, the content must not have),
// the same provider, and the same requested model. Resuming a
// gemini run as openai, or against an edited subset, would mix two
// different runs into one report. Completed ids must also be a
// subset of the current dataset (guaranteed by the SHA match, but
// checked explicitly so a hand-edited checkpoint fails loudly).
export function validateCheckpoint(checkpoint, { dataset, providerName, requestedModel }) {
  if (checkpoint.dataset.sha256 !== dataset.sha256) {
    throw new Error(`checkpoint dataset mismatch: the checkpoint covers dataset SHA ${checkpoint.dataset.sha256.slice(0, 12)}… but the current dataset "${dataset.file}" has SHA ${dataset.sha256.slice(0, 12)}…. Re-run from scratch instead of resuming.`);
  }
  if (checkpoint.providerName !== providerName) {
    throw new Error(`checkpoint provider mismatch: the checkpoint is a "${checkpoint.providerName}" run, but --provider is "${providerName}". Resume with the same provider.`);
  }
  if (checkpoint.requestedModel !== requestedModel) {
    throw new Error(`checkpoint model mismatch: the checkpoint is a "${checkpoint.requestedModel}" run, but the provider resolved to "${requestedModel}". Resume with the same model.`);
  }
  const wanted = new Set(dataset.ids);
  const stray = checkpoint.results.map((r) => r.id).filter((id) => !wanted.has(id));
  if (stray.length > 0) {
    throw new Error(`checkpoint covers ${stray.length} case id(s) not in the current dataset: ${stray.slice(0, 5).join(', ')}`);
  }
  const seen = new Set(checkpoint.results.map((r) => r.id));
  if (seen.size !== checkpoint.results.length) {
    throw new Error('checkpoint contains duplicate case results — it may be corrupt; re-run from scratch');
  }
}

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', timeout: 5000 }).trim() || null;
  } catch {
    return null; // Not a git checkout, or git unavailable: record null, never fail.
  }
}

function sanitizeForDir(name) {
  return String(name).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'model';
}

function toMarkdown(report) {
  const s = report.summary;
  const lines = [];
  lines.push('# Eval Report — REAL-MODEL RUN');
  lines.push('');
  lines.push('> **Real-model results — NOT comparable to the mock baseline.** This run used a live');
  lines.push('> model provider. Pass rates here measure that model\'s behavior on one day, not the');
  lines.push('> library\'s regression state; do not mix these numbers into mock-baseline reporting.');
  lines.push('');
  lines.push(`- Run: \`${report.runId}\``);
  lines.push(`- Generated: ${report.generated}`);
  lines.push(`- Provider: ${report.providerName}`);
  lines.push(`- Model requested: \`${report.model.requested}\``);
  lines.push(`- Model served: ${report.model.served ? `\`${report.model.served}\`` : report.model.servedModels.length > 1 ? `multiple observed (${report.model.servedModels.map((m) => `\`${m}\``).join(', ')}) — see report JSON` : 'not reported by the provider (no `model` field observed in responses)'}`);
  lines.push(`- Dataset: \`${report.dataset.file}\` (v${report.dataset.version ?? 'n/a'}, ${report.dataset.count} cases, sha256 \`${report.dataset.sha256.slice(0, 16)}…\`)`);
  lines.push(`- Provider: model (endpoint ${report.providerMeta.endpoint}, timeout ${report.providerMeta.timeoutMs}ms, max retries ${report.providerMeta.maxRetries})`);
  if (report.environment.gitCommit) lines.push(`- Git commit: ${report.environment.gitCommit}`);
  lines.push(`- Cases: ${s.total} total, ${s.passed} passed, ${s.failed} failed (pass rate ${s.passRate !== null ? (s.passRate * 100).toFixed(1) + '%' : 'n/a'})`);
  lines.push(`- Critical failures: ${s.criticalFailures}`);
  lines.push(`- Coverage: ${s.coverage.skillsCovered}/${s.coverage.skillsTotal} skills selected (${(s.coverage.coverageRate * 100).toFixed(1)}%)`);
  if (report.usage) {
    const u = report.usage;
    lines.push(`- Usage: ${u.requests} request(s), ${u.attempts} attempt(s), ${u.retries} retries, ${u.errors} error(s); ${u.promptTokens} prompt + ${u.completionTokens} completion tokens (${u.totalTokens} total)${u.estimatedCostUsd !== null && u.estimatedCostUsd !== undefined ? `; estimated cost $${u.estimatedCostUsd}` : ' (no prices configured, cost not estimated)'}`);
  }
  if (report.runnerRetries > 0) lines.push(`- Runner-level 429 retries: ${report.runnerRetries}`);
  const emptyCount = report.results.filter((r) => r.emptyResponse).length;
  if (emptyCount > 0) lines.push(`- Empty model responses: ${emptyCount} case(s) (recorded as observed; see the failures list)`);
  lines.push('');
  lines.push('## Dimensions');
  lines.push('');
  lines.push('| Dimension | Cases | Passed | Failed | Pass rate |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const dim of Object.values(report.dimensions)) {
    lines.push(`| ${dim.label}${dim.proxy ? ' *(proxy)*' : ''} | ${dim.total} | ${dim.passed} | ${dim.failed} | ${dim.passRate !== null ? (dim.passRate * 100).toFixed(1) + '%' : 'n/a (no cases)'} |`);
  }
  const proxyDims = Object.values(report.dimensions).filter((d) => d.proxy);
  if (proxyDims.length > 0) {
    lines.push('');
    for (const d of proxyDims) lines.push(`> *${d.label} is a proxy dimension:* ${d.proxyNote}`);
  }
  lines.push('');
  lines.push('## By category');
  lines.push('');
  lines.push('| Category | Total | Passed | Failed | Critical |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [cat, v] of Object.entries(report.byCategory)) {
    if (v.total === 0) continue;
    lines.push(`| ${cat} | ${v.total} | ${v.passed} | ${v.failed} | ${v.critical} |`);
  }
  if (report.failures.length > 0) {
    lines.push('');
    lines.push('## Failures');
    lines.push('');
    lines.push('Failure categories are a machine first pass — every failure needs a human read before it is counted as a model gap, a case-design issue, or a library gap (see ai/audits/REAL-MODEL-EVALUATION.md §5.4).');
    lines.push('');
    for (const f of report.failures) {
      lines.push(`- **${f.id}** [${f.category}/${f.type}]${f.critical ? ' **CRITICAL**' : ''} — ${f.failureCategory}: ${f.failureReason}`);
    }
  }
  lines.push('');
  lines.push('## Limitations');
  lines.push('');
  for (const l of report.limitations) lines.push(`- ${l}`);
  lines.push('');
  return lines.join('\n');
}

// Run a real-model evaluation. Options:
//   providerName — registry provider id (default: 'gemini').
//   provider     — a provider object to use directly, bypassing the
//                  registry (for tests: a fake in-process provider).
//   env          — env-like object (defaults to process.env); the
//                  ONLY source of credentials for env-based
//                  providers. A missing/unconfigured provider throws
//                  before any case runs.
//   fetchImpl    — fetch implementation (defaults to global fetch);
//                  injectable so tests can use a fake endpoint.
//   datasetPath  — subset file (default: the v2 89-case subset).
//   outDir       — report directory (default: a per-run directory
//                  under evals/reports/model/; on resume, the
//                  checkpoint's directory when not given).
//   archivePath  — also write the JSON report to this file.
//   resumeFrom   — path to a checkpoint.json to continue from.
//                  Validated against the dataset, provider, and
//                  model; completed cases are skipped, the run id
//                  is kept, and checkpointed token totals merge
//                  into the final report.
//   onProgress   — optional callback ({ index, total, id, pass,
//                  score, emptyResponse, failureCategory }) after
//                  each case completes (the CLI logs progress).
//   delayMs      — pause between cases (default 500).
//   retryBackoffMs — pause before a 429 retry (default 10000).
//   reportOnly   — exit code 0 even with failures.
// Returns { report, outDir, checkpointPath, exitCode }. Throws
// RunAbortError when the provider rejects the credential or reports
// the model unavailable mid-run (no report written; the error
// carries checkpointPath so the run can be resumed after the cause
// is fixed). After every case, <outDir>/checkpoint.json is updated
// atomically with all completed results.
export async function runRealModelEval(options = {}) {
  const providerName = options.providerName || DEFAULT_PROVIDER;
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const datasetPath = options.datasetPath || DEFAULT_DATASET;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const retryBackoffMs = options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  // Retrieval (default ON since Day 2, 2026-11-22, owner decision):
  // the runner ranks skills for each case with the same IDF-weighted
  // keyword retriever the mock agent uses (MockAgent.rank) and gives
  // the model the top-K candidates to select from. Day 1 ran WITHOUT
  // retrieval and the model invented skill names (1/7 selection); the
  // no-retrieval condition is still available via --no-retrieval for
  // comparison runs. Retrieval uses ONLY the case input — never the
  // case's expected skill, which would leak the answer.
  const retrievalEnabled = options.retrieval !== false;
  const retrievalTopK = options.retrievalTopK ?? DEFAULT_RETRIEVAL_TOP_K;

  const dataset = await loadDataset(datasetPath);
  if (dataset.declaredCount !== null && dataset.declaredCount !== dataset.count) {
    throw new Error(`dataset "${dataset.file}" declares count ${dataset.declaredCount} but lists ${dataset.count} ids`);
  }
  const allCases = await loadAllCases();
  const byId = new Map(allCases.map((c) => [c.id, c]));
  const missingIds = dataset.ids.filter((id) => !byId.has(id));
  if (missingIds.length > 0) {
    throw new Error(`dataset "${dataset.file}" lists ${missingIds.length} case id(s) not found in evals/cases or the generated dataset: ${missingIds.join(', ')}`);
  }
  const cases = dataset.ids.map((id) => byId.get(id));
  cases.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const registry = JSON.parse(await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8'));
  const errors = validateCases(cases, registry);
  if (errors.length > 0) {
    throw new Error(`case validation failed (${errors.length} error(s)): ${errors.join('; ')}`);
  }
  // The retriever ranks the registry for each case input. It is the
  // mock agent's own ranker (IDF-weighted keyword overlap over skill
  // name + description), so retrieval quality here is the same
  // retrieval the mock evals measure — the real-model run adds the
  // model's selection on top of it, it does not invent a second one.
  const retriever = retrievalEnabled ? new MockAgent(registry) : null;
  const byName = new Map(registry.skills.map((s) => [s.name, s]));
  function retrieveCandidates(input) {
    if (!retriever) return [];
    return retriever.rank(input).slice(0, retrievalTopK).map((r) => ({
      name: r.name,
      description: byName.get(r.name)?.description || '',
    }));
  }

  // Resolve the provider through the registry (or take the injected
  // test provider). Provider env defaults apply to a copy of env.
  // Resolution throws for an unknown or unconfigured provider before
  // any case runs and before any API call is made.
  const { env: resolvedEnv, applied: envDefaultsApplied } = applyProviderEnvDefaults(providerName, env);
  // Wrap fetch so the served model version is captured from response
  // bodies when the endpoint reports one (see lib/model-version.mjs).
  // Harmless for adapters that do not use fetch (e.g. helper-based
  // ones): the wrapper is simply never called.
  const versionCapture = createVersionCapturingFetch(fetchImpl);
  const provider = options.provider || await resolveProvider(providerName, resolvedEnv, versionCapture.fetch);
  const requestedModel = provider.meta?.model || providerName;

  // Resume: load the checkpoint and validate it against the current
  // dataset, provider, and resolved model BEFORE any API call.
  // Everything about the run's identity (run id, start timestamp,
  // completed results, token totals) comes from the checkpoint.
  let resumed = null;
  if (options.resumeFrom) {
    const { checkpoint, path: checkpointAbsPath } = await loadCheckpoint(options.resumeFrom);
    validateCheckpoint(checkpoint, { dataset, providerName, requestedModel });
    resumed = { checkpoint, path: checkpointAbsPath, resumedAt: new Date().toISOString() };
  }

  const timestamp = resumed ? resumed.checkpoint.started : new Date().toISOString();
  const stamp = `${timestamp.slice(0, 10).replaceAll('-', '')}-${timestamp.slice(11, 19).replaceAll(':', '')}`;
  const runId = resumed ? resumed.checkpoint.runId : `real-model-${sanitizeForDir(requestedModel)}-${stamp}`;
  const outDir = options.outDir
    ? (path.isAbsolute(options.outDir) ? options.outDir : path.join(ROOT, options.outDir))
    : (resumed ? path.dirname(resumed.path) : path.join(MODEL_REPORTS_DIR, runId));
  const archivePath = options.archivePath
    ? (path.isAbsolute(options.archivePath) ? options.archivePath : path.join(ROOT, options.archivePath))
    : null;
  const checkpointPath = path.join(outDir, CHECKPOINT_FILENAME);
  await mkdir(outDir, { recursive: true });

  const results = resumed ? [...resumed.checkpoint.results] : [];
  const servedFromObservations = resumed ? [...(resumed.checkpoint.servedModels || resumed.checkpoint.servedFromObservations || [])] : [];
  const servedSeen = new Set(servedFromObservations);
  let runnerRetries = resumed ? resumed.checkpoint.runnerRetries : 0;
  const completedIds = new Set(results.map((r) => r.id));
  const remaining = cases.filter((c) => !completedIds.has(c.id));

  // Persist the checkpoint after each completed case. Atomic write
  // (temp file + rename) so a kill mid-write never leaves a torn
  // checkpoint behind. The served-model list merges observation
  // models with fetch-captured response models, so a resumed run
  // keeps the full record.
  async function writeCheckpoint() {
    const servedModels = [...new Set([...versionCapture.getObservedModels(), ...servedFromObservations])];
    await atomicWriteFile(checkpointPath, JSON.stringify(buildCheckpoint({
      runId, providerName, requestedModel, dataset, started: timestamp,
      results, runnerRetries, servedModels,
    }), null, 2) + '\n');
  }
  // Write an initial checkpoint on resume too, so the run's outDir
  // (which may differ from the checkpoint's directory when --out was
  // given) has a live checkpoint from the start.
  if (resumed) await writeCheckpoint();

  // Run one case with runner-level 429 handling: on a fresh
  // rate-limit error, back off once and retry the case a single
  // time. Auth errors and model-unavailable errors abort the whole
  // run (thrown to the caller). Every other error fails the case
  // as a provider error.
  async function runCase(evalCase) {
    let lastError;
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        return await provider.run(evalCase);
      } catch (e) {
        if (isAuthError(e)) {
          throw new AuthAbortError(
            `provider "${providerName}" rejected the credential (${e.message}). ` +
            'The run was aborted immediately — a rejected credential is never retried. ' +
            'Check the credential and the provider configuration, then re-run.',
          );
        }
        if (isModelUnavailableError(e)) {
          throw new ModelUnavailableError(
            `provider "${providerName}" reports the model unavailable (${e.message}). ` +
            'The run was aborted immediately — every remaining case would fail the same way. ' +
            'Use the model the error message recommends, then re-run.',
          );
        }
        lastError = e;
        if (attempt === 0 && isRateLimitError(e) && !isRetryExhausted(e)) {
          runnerRetries++;
          await sleep(retryBackoffMs);
          continue;
        }
        break;
      }
    }
    throw lastError;
  }

  // Only the cases not already in the checkpoint run now. On a
  // fresh run, remaining === cases. On resume, completed cases are
  // skipped entirely — no re-billing, no re-scoring.
  for (const [index, c] of remaining.entries()) {
    if (index > 0 && delayMs > 0) await sleep(delayMs);
    // Retrieve before the call so the provider-error path can record
    // the candidates too (a failed call still shows whether retrieval
    // had found the expected skill).
    if (retriever) c.retrievedSkills = retrieveCandidates(c.input || '');
    let observation;
    try {
      observation = await runCase(c);
    } catch (e) {
      if (e instanceof RunAbortError) {
        // The checkpoint already holds every completed case; the
        // caller (CLI) reports the resume command with this path.
        e.checkpointPath = checkpointPath;
        throw e;
      }
      const failed = {
        id: c.id, category: c.category, type: c.type, skill: c.skill || null,
        source: c.source || 'hand-written', pass: false, score: 0,
        failureReason: `provider error: ${e.message}`,
        selectedSkills: [], checks: [],
      };
      if (c.retrievedSkills) failed.retrievedSkills = c.retrievedSkills.map((s) => s.name);
      // A provider error may still carry call context (usage, finish
      // reason) — e.g. the Gemini adapter attaches it when the call
      // succeeded but the reply was not JSON. Record it: it
      // distinguishes truncation from a format choice.
      if (e.usage) failed.usage = e.usage;
      if (typeof e.finishReason === 'string' && e.finishReason) failed.finishReason = e.finishReason;
      failed.critical = isCritical(c, failed);
      const classified = classifyFailure(failed);
      failed.failureCategory = classified.failureCategory;
      failed.failedChecks = classified.failedChecks;
      failed.needsHumanReview = classified.needsHumanReview;
      results.push(failed);
      await writeCheckpoint();
      if (onProgress) onProgress({ completed: results.length, total: cases.length, id: c.id, pass: false, score: 0, emptyResponse: false, failureCategory: failed.failureCategory });
      continue;
    }
    // The exact model id, when the adapter reports one per case
    // (the helper-based Gemini adapter echoes the response's model
    // field; the direct adapters do not — their configured id is
    // exact already and is recorded in providerMeta).
    if (typeof observation.model === 'string' && observation.model && !servedSeen.has(observation.model)) {
      servedSeen.add(observation.model);
      servedFromObservations.push(observation.model);
    }
    const scored = await scoreCase(c, observation);
    const result = {
      id: c.id, category: c.category, type: c.type, skill: c.skill || null,
      source: c.source || 'hand-written', pass: scored.pass, score: scored.score,
      failureReason: scored.failureReason,
      selectedSkills: observation.selectedSkills || [],
      checks: scored.checks,
    };
    // The candidates the model chose from: without them, a selection
    // failure cannot tell retrieval-miss (expected skill not in the
    // list) from model-miss (it was listed and not picked).
    if (c.retrievedSkills) result.retrievedSkills = c.retrievedSkills.map((s) => s.name);
    if (observation.usage) result.usage = observation.usage;
    // Preserve what the model actually said and wrote: without it,
    // a failed check (non-compiling code, a missing must-include
    // string) cannot be diagnosed retroactively — Day 1's compile
    // failures had no record of the code. Only the model's own
    // output is kept (answer, code, tools); the prompt is the case
    // input, already recorded by id.
    if (typeof observation.answer === 'string' && observation.answer) result.answer = observation.answer;
    if (Array.isArray(observation.code) && observation.code.length > 0) result.code = observation.code;
    if (Array.isArray(observation.tools) && observation.tools.length > 0) result.tools = observation.tools;
    // finish_reason, when the adapter surfaces it (empty-content
    // responses on thinking models end with finish_reason "length").
    if (typeof observation.finishReason === 'string' && observation.finishReason) {
      result.finishReason = observation.finishReason;
    }
    // An empty model response is an observed outcome, not a crash:
    // no skills, no answer, no code, no refusal. It scores as a
    // failure through the normal checks; the flag makes it visible.
    result.emptyResponse = (observation.selectedSkills || []).length === 0
      && !(observation.answer || '').trim()
      && (observation.code || []).length === 0
      && !observation.refused;
    result.critical = isCritical(c, result);
    if (!result.pass) {
      const classified = classifyFailure(result);
      result.failureCategory = classified.failureCategory;
      result.failedChecks = classified.failedChecks;
      result.needsHumanReview = classified.needsHumanReview;
    }
    results.push(result);
    await writeCheckpoint();
    if (onProgress) onProgress({ completed: results.length, total: cases.length, id: c.id, pass: result.pass, score: result.score, emptyResponse: result.emptyResponse, failureCategory: result.failureCategory || null });
  }

  const casesById = new Map(cases.map((c) => [c.id, c]));
  const dimensions = computeDimensions(results, casesById);
  const byCategory = {};
  for (const r of results) {
    const cat = (byCategory[r.category] = byCategory[r.category] || { total: 0, passed: 0, failed: 0, critical: 0 });
    cat.total++;
    if (r.pass) cat.passed++; else { cat.failed++; if (r.critical) cat.critical++; }
  }
  const covered = new Set();
  for (const r of results) for (const s of r.selectedSkills || []) covered.add(s);
  const passed = results.filter((r) => r.pass).length;
  // Usage: the current session's provider totals, plus the
  // checkpointed per-case totals when resuming (the new session's
  // provider never saw the pre-interruption calls).
  const sessionUsage = typeof provider.getUsage === 'function' ? provider.getUsage() : null;
  let usage = sessionUsage;
  let usageNote = null;
  if (resumed) {
    const prior = resumed.checkpoint.usageTokens || computeUsageTotals(resumed.checkpoint.results);
    if (sessionUsage) {
      usage = {
        ...sessionUsage,
        promptTokens: (sessionUsage.promptTokens || 0) + prior.promptTokens,
        completionTokens: (sessionUsage.completionTokens || 0) + prior.completionTokens,
        totalTokens: (sessionUsage.totalTokens || 0) + prior.totalTokens,
        requests: (sessionUsage.requests || 0) + prior.requests,
        errors: (sessionUsage.errors || 0) + prior.errors,
      };
    } else {
      usage = { ...prior, attempts: prior.requests, retries: 0, estimatedCostUsd: null };
    }
    usageNote = 'Token totals combine per-case usage checkpointed before the interruption with the resumed session\'s provider usage. Tokens spent on failed attempts before the interruption are not counted; adapter retry counts cover the resumed session only.';
  }
  const observedModels = [...new Set([...versionCapture.getObservedModels(), ...servedFromObservations])];
  const model = summarizeServedModel(requestedModel, observedModels);
  const completedAt = new Date().toISOString();

  const report = {
    kind: 'skillforge-real-model-eval',
    version: REPORT_FORMAT_VERSION,
    runId,
    generated: timestamp,
    completedAt,
    ...(resumed ? { resumedFrom: { checkpoint: path.relative(ROOT, resumed.path), resumedAt: resumed.resumedAt, priorCases: resumed.checkpoint.results.length } } : {}),
    providerName,
    providerKind: 'model',
    model,
    providerMeta: provider.meta || null,
    providerEnvDefaultsApplied: envDefaultsApplied,
    retrieval: {
      enabled: retrievalEnabled,
      topK: retrievalEnabled ? retrievalTopK : 0,
      method: 'IDF-weighted keyword overlap over skill name + description (MockAgent.rank); candidates listed in the user message, model selects only from them',
    },
    dataset: {
      file: dataset.file,
      version: dataset.version,
      generated: dataset.generated,
      supersedes: dataset.supersedes,
      count: dataset.count,
      sha256: dataset.sha256,
      ids: dataset.ids,
    },
    environment: {
      node: process.version,
      platform: process.platform,
      gitCommit: gitCommit(),
    },
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      passRate: results.length > 0 ? +(passed / results.length).toFixed(3) : 0,
      criticalFailures: results.filter((r) => r.critical).length,
      coverage: {
        skillsCovered: covered.size,
        skillsTotal: registry.skills.length,
        coverageRate: +(covered.size / registry.skills.length).toFixed(3),
      },
    },
    dimensions,
    byCategory,
    failures: results.filter((r) => !r.pass).map((r) => ({
      id: r.id, category: r.category, type: r.type, skill: r.skill,
      critical: r.critical, failureCategory: r.failureCategory,
      failedChecks: r.failedChecks, needsHumanReview: r.needsHumanReview,
      failureReason: r.failureReason,
    })),
    usage,
    ...(usageNote ? { usageNote } : {}),
    runnerRetries,
    results,
    ...(archivePath ? { archivePath: path.relative(ROOT, archivePath) } : {}),
    limitations: [
      'This run measures one model at one point in time (temperature 0, but providers are not perfectly deterministic). Re-running may give different results.',
      'The model was asked to self-report its skill selection as JSON; a model can select a skill and fail to report it, or report one it would not actually load.',
      'The model never sees the skill files — it answers from its own knowledge plus the task prompt. A "grounded" answer may come from its weights, not the library; the grounded-in check only verifies the skill was named.',
      'Content checks are substring matches on the model\'s answer; they prove the guidance is present in the answer, not that it is complete or correctly applied.',
      'Code checks prove compilation of the model\'s code blocks (and fixture behavior where fixtures exist), not general correctness. TypeScript blocks get a structural check only.',
      'Context preservation is a proxy dimension (no dedicated cases exist in the subset); see the dimension note above.',
      'Failure categories are a machine first pass. Every failure needs a human read before it is counted as a model gap, a case-design issue, or a library gap.',
    ],
  };

  await mkdir(outDir, { recursive: true });
  await atomicWriteFile(path.join(outDir, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  await atomicWriteFile(path.join(outDir, 'latest.md'), toMarkdown(report));
  if (archivePath) {
    await mkdir(path.dirname(archivePath), { recursive: true });
    await atomicWriteFile(archivePath, JSON.stringify(report, null, 2) + '\n');
  }

  return {
    report,
    outDir,
    checkpointPath,
    archivePath,
    exitCode: report.summary.failed > 0 && !options.reportOnly ? 1 : 0,
  };
}

const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
function flagInt(name, fallback) {
  const raw = flagValue(name);
  if (raw === null || raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer (got "${raw}")`);
  return n;
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Usage: node evals/run-real-model.mjs [--provider <name>] [--dataset <path>] [--out <dir>] [--archive <file>] [--resume <checkpoint>] [--delay-ms N] [--retry-backoff-ms N] [--report-only] [--json] [--no-retrieval]',
      '',
      'Runs the real-model evaluation subset against a live model provider.',
      `Providers (via evals/lib/provider-registry.mjs): ${KNOWN_PROVIDERS.join(', ')}. Default: ${DEFAULT_PROVIDER}.`,
      'Default dataset: evals/datasets/real-model-subset-v2.json (89 cases).',
      'Default output: evals/reports/model/<run-id>/ (latest.json + latest.md).',
      'After every case, <out>/checkpoint.json is updated; --resume <checkpoint> continues an interrupted run.',
      'Retrieval is ON by default: each case gets the top-10 candidate skills (IDF-weighted keyword match) in its prompt. --no-retrieval runs the Day 1 condition instead.',
      'Exit code 0 = all cases passed (or --report-only); 1 = any case failed; 2 = configuration, dataset, or aborted-run error.',
    ].join('\n'));
    return;
  }
  const providerName = flagValue('--provider') || DEFAULT_PROVIDER;
  let run;
  try {
    run = await runRealModelEval({
      providerName,
      datasetPath: flagValue('--dataset') || undefined,
      outDir: flagValue('--out') || undefined,
      archivePath: flagValue('--archive') || undefined,
      resumeFrom: flagValue('--resume') || undefined,
      delayMs: flagInt('--delay-ms', DEFAULT_DELAY_MS),
      retryBackoffMs: flagInt('--retry-backoff-ms', DEFAULT_RETRY_BACKOFF_MS),
      reportOnly: args.includes('--report-only'),
      retrieval: !args.includes('--no-retrieval'),
      // Progress goes to stderr so --json stdout stays parseable.
      onProgress: ({ completed, total, id, pass, score, emptyResponse, failureCategory }) => {
        console.error(`[${completed}/${total}] ${id} ${pass ? `pass (${score})` : `FAIL (${score})${failureCategory ? ` ${failureCategory}` : ''}`}${emptyResponse ? ' [empty response]' : ''}`);
      },
    });
  } catch (e) {
    if (e instanceof RunAbortError) {
      // The run stopped mid-flight (rejected credential, or the
      // model is unavailable). No report was written; a partial
      // run is not a result. The checkpoint holds every completed
      // case, so the run can resume after the cause is fixed.
      console.error(`Real-model evaluation ABORTED: ${e.message}`);
      console.error('No report was written. Do not re-run until the cause is fixed.');
      if (e.checkpointPath) {
        console.error(`Checkpoint: ${path.relative(ROOT, e.checkpointPath)}`);
        console.error(`Resume with: node evals/run-real-model.mjs --resume ${path.relative(ROOT, e.checkpointPath)}`);
      }
      process.exitCode = 2;
      return;
    }
    // Credential/configuration errors name the missing variables;
    // dataset/case errors name the file and the problem. Either
    // way: no API call was made, exit 2, and the operator gets the
    // fix in the message.
    console.error(`Real-model evaluation cannot start: ${e.message}`);
    if (providerName === 'gemini' && /GEMINI_HELPER_PATH/.test(e.message)) {
      console.error('NOTE: the Gemini adapter shells out to the custom.gemini connector helper (gemini_chat.py). No API key is configured in the environment, ever — auth lives in the Secure Vault behind the helper. Do not paste a key anywhere to work around this.');
    }
    process.exitCode = 2;
    return;
  }
  const { report, outDir, archivePath, exitCode } = run;
  const s = report.summary;
  const relDir = path.relative(ROOT, outDir);
  const reportRel = relDir && !relDir.startsWith('..') ? relDir : outDir;
  if (args.includes('--json')) {
    console.log(JSON.stringify({
      runId: report.runId, generated: report.generated, model: report.model,
      dataset: { file: report.dataset.file, version: report.dataset.version, count: report.dataset.count, sha256: report.dataset.sha256 },
      summary: s, dimensions: report.dimensions, usage: report.usage,
    }, null, 2));
  } else {
    console.log(`Real-model run (${report.model.requested}${report.model.served ? `, served as ${report.model.served}` : ''}): ${s.passed}/${s.total} passed (${(s.passRate * 100).toFixed(1)}%), ${s.failed} failed, ${s.criticalFailures} critical.`);
    console.log(`Coverage: ${s.coverage.skillsCovered}/${s.coverage.skillsTotal} skills selected.`);
    for (const dim of Object.values(report.dimensions)) {
      console.log(`  ${dim.label}${dim.proxy ? ' (proxy)' : ''}: ${dim.passed}/${dim.total}${dim.passRate !== null ? ` (${(dim.passRate * 100).toFixed(1)}%)` : ''}`);
    }
    if (report.usage) {
      const u = report.usage;
      console.log(`Usage: ${u.totalTokens} tokens (${u.promptTokens} prompt + ${u.completionTokens} completion), ${u.retries} retries, ${u.errors} errors${u.estimatedCostUsd !== null && u.estimatedCostUsd !== undefined ? `, estimated cost $${u.estimatedCostUsd}` : ''}.`);
    }
    if (report.runnerRetries > 0) console.log(`Runner-level 429 retries: ${report.runnerRetries}`);
    for (const f of report.failures.slice(0, 30)) {
      console.log(`  FAIL ${f.id} [${f.category}]${f.critical ? ' CRITICAL' : ''} (${f.failureCategory}): ${f.failureReason}`);
    }
    if (report.failures.length > 30) console.log(`  ... and ${report.failures.length - 30} more (see ${reportRel}/latest.md)`);
    console.log(`Report: ${reportRel}/latest.json, ${reportRel}/latest.md`);
    if (archivePath) console.log(`Archive: ${path.relative(ROOT, archivePath)}`);
    if (report.resumedFrom) console.log(`Resumed from ${report.resumedFrom.checkpoint} (${report.resumedFrom.priorCases} cases already complete).`);
    console.log(`Checkpoint: ${reportRel}/checkpoint.json`);
  }
  process.exitCode = exitCode;
}

const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((e) => {
    console.error(`Real-model evaluation failed: ${e.message}`);
    process.exitCode = 2;
  });
}
