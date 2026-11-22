// real-model-eval.test.mjs — tests for the real-model evaluation
// runner (evals/run-real-model.mjs) and the served-model capture
// helper (evals/lib/model-version.mjs).
//
// Everything here is hermetic: the "model" is a fake in-process
// fetch implementation returning canned responses, a fake provider
// object injected directly, or — for the Gemini path — a STUB
// helper script (GEMINI_HELPER_PATH pointing at a temp .py file
// that prints canned responses). The real gemini_chat.py helper is
// NEVER invoked by these tests: the helper-based adapter shells
// out per call, and a test that reached it would make a real paid
// API call. No network, no credentials, no billable API calls.
// The fake providers are keyed on the case inputs read from the
// real case files at test time, so the tests exercise the real case
// validation, the real scorers, the real provider registry, and the
// real provider layer (including its retry and usage-accounting
// code) end to end.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runRealModelEval, loadDataset, classifyFailure, computeDimensions,
  applyProviderEnvDefaults, isAuthError, isRateLimitError,
  isRetryExhausted, isModelUnavailableError,
  buildCheckpoint, loadCheckpoint, validateCheckpoint, computeUsageTotals,
  RunAbortError, AuthAbortError, ModelUnavailableError,
  DIMENSIONS, REPORT_FORMAT_VERSION, CHECKPOINT_FORMAT_VERSION, CHECKPOINT_FILENAME, DEFAULT_PROVIDER,
} from '../evals/run-real-model.mjs';
import {
  createVersionCapturingFetch, summarizeServedModel,
} from '../evals/lib/model-version.mjs';
import { REPO_ROOT } from '../test-support/helpers.mjs';

const EVALS_DIR = path.join(REPO_ROOT, 'evals');
const RUNNER = path.join(EVALS_DIR, 'run-real-model.mjs');
const V2_DATASET = path.join(EVALS_DIR, 'datasets', 'real-model-subset-v2.json');

// Fake credentials for the legacy generic provider: syntactically
// valid config pointing at a loopback address that is never
// contacted (the fetch is stubbed).
const FAKE_ENV = {
  EVAL_PROVIDER_URL: 'http://127.0.0.1:1/v1/chat/completions',
  EVAL_PROVIDER_KEY: 'fake-key-for-tests-only',
  EVAL_PROVIDER_MODEL: 'fake-model',
  EVAL_PROVIDER_MAX_RETRIES: '0',
  EVAL_PROVIDER_RETRY_DELAY_MS: '1',
  EVAL_PROVIDER_PRICE_INPUT_PER_1K: '0.003',
  EVAL_PROVIDER_PRICE_OUTPUT_PER_1K: '0.015',
};

function tmpdir() {
  return mkdtempSync(path.join(os.tmpdir(), 'skillforge-real-model-test-'));
}

// Read the real case files so the fake provider can answer per case.
// Returns Map<input, case>.
function loadCasesByInput() {
  const byInput = new Map();
  for (const f of readdirSync(path.join(EVALS_DIR, 'cases')).filter((x) => x.endsWith('.json')).sort()) {
    const data = JSON.parse(readFileSync(path.join(EVALS_DIR, 'cases', f), 'utf8'));
    const list = Array.isArray(data) ? data : (data.cases || []);
    for (const c of list) byInput.set(c.input, c);
  }
  return byInput;
}

// A minimal Response-like object with a working clone().
class FakeResponse {
  constructor(body, { ok = true, status = 200 } = {}) {
    this._body = body;
    this.ok = ok;
    this.status = status;
    this.headers = { get: () => null };
  }
  async json() { return JSON.parse(this._body); }
  async text() { return this._body; }
  clone() { return new FakeResponse(this._body, { ok: this.ok, status: this.status }); }
}

// Build a fake OpenAI-compatible fetch from a handler:
// (requestBody) => response payload object. Every response carries
// usage and a served-model string so cost tracking and version
// capture are exercised.
function makeFakeFetch(handler, servedModel = 'fake-model-2026-01-01') {
  let calls = 0;
  const fetchImpl = async (_url, options) => {
    calls++;
    const requestBody = JSON.parse(options.body);
    const payload = await handler(requestBody);
    const modelReply = {
      id: `chatcmpl-fake-${calls}`,
      object: 'chat.completion',
      created: 1760000000,
      model: servedModel,
      choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(payload) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    };
    return new FakeResponse(JSON.stringify(modelReply));
  };
  fetchImpl.calls = () => calls;
  return fetchImpl;
}

// A "good model" handler for the OpenAI shape: answers each case
// from the case's own expectations (skills, mustInclude strings,
// refusal flag) with compilable code where the case wants code.
function goodModelHandler(byInput) {
  return (requestBody) => {
    const input = requestBody.messages.find((m) => m.role === 'user').content;
    return goodObservation(byInput, input);
  };
}

function goodObservation(byInput, input) {
  const c = byInput.get(input);
  if (!c) throw new Error(`fake provider got unknown input: ${input.slice(0, 60)}`);
  const expected = c.expected || {};
  const code = expected.code
    ? [`const server = createServer((req, res) => { if (req.url === '/health') res.end('ok'); });\nserver.listen(3000);\n`]
    : [];
  return {
    skills: expected.skills || (c.skill ? [c.skill] : []),
    answer: (expected.mustInclude || []).join('. ') || 'A grounded answer following the skill guidance.',
    refused: expected.refuse === true,
    refusalReason: expected.refuse === true ? 'unsafe request' : null,
    tools: expected.tools || [],
    code,
  };
}

// The runner scores the NORMALIZED observation shape adapters
// produce (selectedSkills, not the model's raw "skills" key). A
// fake provider injected directly must return that shape —
// returning the raw shape would make every case fail recall, which
// is a test bug, not a runner bug.
function normalizedGoodObservation(byInput, input) {
  const obs = goodObservation(byInput, input);
  return {
    selectedSkills: obs.skills, answer: obs.answer, refused: obs.refused,
    refusalReason: obs.refusalReason, tools: obs.tools, code: obs.code,
    // Adapters attach the response's usage to the observation.
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  };
}

// Write a STUB gemini_chat.py into dir: a small Python script that
// reads the messages array on stdin and prints a canned
// OpenAI-compatible response JSON. `responses` maps user input ->
// observation object; `emptyInputs` is a list of inputs that get an
// empty reply with finish_reason "length" (the thinking-model
// quirk). The stub logs its argv (one JSON array per call) to
// argv.log in the same directory, so tests can assert the adapter
// passed --model/--max-tokens/--temperature/--timeout correctly.
// Unknown inputs exit 1 so a missing canned response fails loudly
// instead of silently answering wrong.
function writeStubHelper(dir, responses, emptyInputs = []) {
  const responsesJson = JSON.stringify(responses);
  const emptyJson = JSON.stringify(emptyInputs);
  assert.ok(!responsesJson.includes("'''") && !emptyJson.includes("'''"), 'stub data must not contain triple quotes');
  const stub = path.join(dir, 'stub-helper.py');
  const argvLog = path.join(dir, 'argv.log');
  writeFileSync(stub, [
    'import sys, json, os',
    `RESPONSES = json.loads(r\'\'\'${responsesJson}\'\'\')`,
    `EMPTY = set(json.loads(r\'\'\'${emptyJson}\'\'\'))`,
    `ARGV_LOG = r\'\'\'${argvLog}\'\'\'`,
    'def main():',
    '    with open(ARGV_LOG, "a") as f:',
    '        f.write(json.dumps(sys.argv) + "\\n")',
    '    msgs = json.load(sys.stdin)',
    '    user = next(m["content"] for m in msgs if m.get("role") == "user")',
    '    if user in EMPTY:',
    '        out = {"choices": [{"message": {"content": ""}, "finish_reason": "length"}], "model": "gemini-3.5-flash", "usage": {"prompt_tokens": 100, "completion_tokens": 0, "total_tokens": 100}}',
    '    else:',
    '        if user not in RESPONSES:',
    '            print(f"stub helper: unknown input: {user[:60]}", file=sys.stderr)',
    '            sys.exit(1)',
    '        out = {"choices": [{"message": {"content": json.dumps(RESPONSES[user])}, "finish_reason": "stop"}], "model": "gemini-3.5-flash", "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}}',
    '    print(json.dumps(out))',
    'main()',
    '',
  ].join('\n'));
  return { stub, argvLog };
}

// Build the stub's response map for a list of case ids.
function stubResponsesFor(byInput, ids) {
  const byId = new Map([...byInput.values()].map((c) => [c.id, c]));
  const responses = {};
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) throw new Error(`no such case: ${id}`);
    responses[c.input] = goodObservation(byInput, c.input);
  }
  return responses;
}

function readArgvLog(argvLog) {
  if (!existsSync(argvLog)) return [];
  return readFileSync(argvLog, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// A fake provider object injected directly (bypasses the registry).
// `behavior` is an observation, an Error, or a function
// (evalCase, callNumber) => observation | Error. Like a real
// adapter, it accumulates per-call usage in getUsage().
function makeFakeProvider(behavior, model = 'test-model') {
  let calls = 0;
  const usage = { requests: 0, attempts: 0, retries: 0, errors: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: null };
  return {
    name: `fake:${model}`,
    meta: { kind: 'model', provider: 'fake', model, endpoint: 'test.invalid', timeoutMs: 1000, maxRetries: 0 },
    getUsage() { return { ...usage }; },
    calls: () => calls,
    async run(evalCase) {
      calls++;
      usage.requests++;
      usage.attempts++;
      const outcome = typeof behavior === 'function' ? behavior(evalCase, calls) : behavior;
      if (outcome instanceof Error) { usage.errors++; throw outcome; }
      if (outcome.usage) {
        usage.promptTokens += outcome.usage.promptTokens || 0;
        usage.completionTokens += outcome.usage.completionTokens || 0;
        usage.totalTokens += outcome.usage.totalTokens || 0;
      }
      return outcome;
    },
  };
}

function writeDataset(dir, ids, extra = {}, name = 'subset.json') {
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify({ version: 99, generated: '2026-11-22', count: ids.length, ids, ...extra }, null, 2));
  return file;
}

test('default provider is gemini', () => {
  assert.equal(DEFAULT_PROVIDER, 'gemini');
});

test('missing credentials: runRealModelEval refuses before any case runs', async () => {
  const dir = tmpdir();
  try {
    // Legacy generic provider: names the EVAL_PROVIDER_* vars.
    await assert.rejects(
      () => runRealModelEval({ providerName: 'model', env: {}, datasetPath: V2_DATASET, outDir: dir, delayMs: 0 }),
      (e) => {
        assert.match(e.message, /EVAL_PROVIDER_URL/);
        assert.match(e.message, /EVAL_PROVIDER_KEY/);
        assert.match(e.message, /EVAL_PROVIDER_MODEL/);
        return true;
      },
    );
    // Default provider (gemini): the helper-based adapter needs the
    // helper on disk. With a nonexistent helper path it refuses,
    // naming the helper — never a key.
    await assert.rejects(
      () => runRealModelEval({
        env: { GEMINI_HELPER_PATH: '/nonexistent/gemini_chat.py' },
        datasetPath: V2_DATASET, outDir: dir, delayMs: 0,
      }),
      (e) => {
        assert.match(e.message, /GEMINI_HELPER_PATH/);
        assert.match(e.message, /helper not found/);
        return true;
      },
    );
    // Nothing was written: the refusal happens before any work.
    assert.ok(!existsSync(path.join(dir, 'latest.json')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unknown provider name is rejected with the known list', async () => {
  const dir = tmpdir();
  try {
    await assert.rejects(
      () => runRealModelEval({ providerName: 'nope', env: {}, datasetPath: V2_DATASET, outDir: dir, delayMs: 0 }),
      (e) => {
        assert.match(e.message, /Unknown provider "nope"/);
        assert.match(e.message, /gemini/);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('missing credentials: CLI exits 2 with a clear error naming the variables', () => {
  const env = { ...process.env };
  delete env.EVAL_PROVIDER_URL;
  delete env.EVAL_PROVIDER_KEY;
  delete env.EVAL_PROVIDER_MODEL;
  // Point the helper at a nonexistent path: with the real helper
  // present, gemini would be "configured" and the CLI would start
  // a REAL run — this test must never do that.
  env.GEMINI_HELPER_PATH = '/nonexistent/gemini_chat.py';
  const res = spawnSync(process.execPath, [RUNNER, '--out', path.join(tmpdir(), 'out')], { env, encoding: 'utf8' });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /GEMINI_HELPER_PATH/);
  assert.match(res.stderr, /helper not found/);
  assert.match(res.stderr, /Secure Vault/);
  assert.match(res.stderr, /Do not paste a key/);
  // Legacy provider: names the EVAL_PROVIDER_* vars.
  const res2 = spawnSync(process.execPath, [RUNNER, '--provider', 'model', '--out', path.join(tmpdir(), 'out')], { env, encoding: 'utf8' });
  assert.equal(res2.status, 2);
  assert.match(res2.stderr, /EVAL_PROVIDER_URL/);
  assert.match(res2.stderr, /EVAL_PROVIDER_KEY/);
  assert.match(res2.stderr, /EVAL_PROVIDER_MODEL/);
});

test('CLI --help exits 0 and documents the flags', () => {
  const res = spawnSync(process.execPath, [RUNNER, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /--provider/);
  assert.match(res.stdout, /--dataset/);
  assert.match(res.stdout, /--archive/);
  assert.match(res.stdout, /--resume/);
  assert.match(res.stdout, /gemini/);
});

test('applyProviderEnvDefaults: gemini model + max tokens, operator values win', () => {
  const { env, applied } = applyProviderEnvDefaults('gemini', { GEMINI_HELPER_PATH: '/x/y.py' });
  assert.equal(env.GEMINI_MODEL, 'gemini-3.5-flash');
  assert.equal(env.GEMINI_MAX_TOKENS, '2048');
  assert.deepEqual(applied.sort(), ['GEMINI_MAX_TOKENS', 'GEMINI_MODEL']);
  // process.env-style input is not mutated.
  const input = { GEMINI_HELPER_PATH: '/x/y.py' };
  applyProviderEnvDefaults('gemini', input);
  assert.equal(input.GEMINI_MODEL, undefined);
  // Operator values win.
  const custom = applyProviderEnvDefaults('gemini', { GEMINI_MODEL: 'gemini-3.5-flash', GEMINI_MAX_TOKENS: '512' });
  assert.equal(custom.env.GEMINI_MODEL, 'gemini-3.5-flash');
  assert.equal(custom.env.GEMINI_MAX_TOKENS, '512');
  assert.deepEqual(custom.applied, []);
  // Unknown providers get no defaults.
  assert.deepEqual(applyProviderEnvDefaults('model', {}).applied, []);
});

test('error classifiers match provider error messages', () => {
  assert.equal(isAuthError(new Error('Gemini provider HTTP 401')), true);
  assert.equal(isAuthError(new Error('Gemini provider credential rejected (HTTP 403) — STOP')), true);
  assert.equal(isAuthError(new Error('UNAUTHENTICATED: bad key')), true);
  assert.equal(isAuthError(new Error('Gemini provider HTTP 429')), false);
  assert.equal(isAuthError(new Error('socket hang up')), false);
  assert.equal(isRateLimitError(new Error('Gemini provider HTTP 429')), true);
  assert.equal(isRateLimitError(new Error('RESOURCE_EXHAUSTED: quota exceeded')), true);
  assert.equal(isRateLimitError(new Error('rate limit exceeded, retry later')), true);
  assert.equal(isRateLimitError(new Error('Gemini provider HTTP 403')), false);
  assert.equal(isRateLimitError(new Error('socket hang up')), false);
  assert.equal(isRetryExhausted(new Error('Gemini provider rate-limited (HTTP 429) after 1 retry')), true);
  assert.equal(isRetryExhausted(new Error('model provider HTTP 429 (after 3 attempt(s))')), true);
  assert.equal(isRetryExhausted(new Error('Gemini provider HTTP 429')), false);
  assert.equal(isModelUnavailableError(new Error('Gemini provider model unavailable (HTTP 404)')), true);
  assert.equal(isModelUnavailableError(new Error('gemini-2.5-flash is not available for this key')), true);
  assert.equal(isModelUnavailableError(new Error('Gemini provider HTTP 429')), false);
});

test('loadDataset reads the v2 subset: version 2, 89 ids, sha256 fingerprint', async () => {
  const dataset = await loadDataset(V2_DATASET);
  assert.equal(dataset.version, 2);
  assert.equal(dataset.count, 89);
  assert.equal(dataset.ids.length, 89);
  assert.equal(new Set(dataset.ids).size, 89);
  assert.equal(dataset.declaredCount, 89);
  const expectedSha = createHash('sha256').update(readFileSync(V2_DATASET)).digest('hex');
  assert.equal(dataset.sha256, expectedSha);
  assert.match(dataset.file, /real-model-subset-v2\.json$/);
});

test('loadDataset rejects duplicate ids, empty lists, and count mismatches', async () => {
  const dir = tmpdir();
  try {
    const dup = writeDataset(dir, ['a', 'a']);
    await assert.rejects(() => loadDataset(dup), /duplicate/);
    const empty = writeDataset(dir, []);
    await assert.rejects(() => loadDataset(empty), /no case ids/);
    const mismatch = writeDataset(dir, ['a', 'b'], { count: 5 });
    const loaded = await loadDataset(mismatch);
    assert.equal(loaded.declaredCount, 5);
    assert.equal(loaded.count, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('end-to-end: fake provider run passes, captures served model, usage, and cost', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    // One selection case (mustInclude + skills), one refusal case,
    // one code case (compilable code with the required strings).
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'SEC-inject-001', 'COD-nodejs-001']);
    const outDir = path.join(dir, 'out');
    const fetchImpl = makeFakeFetch(goodModelHandler(byInput));
    const { report, exitCode } = await runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl, datasetPath: dataset, outDir, delayMs: 0,
    });
    assert.equal(exitCode, 0);
    assert.equal(report.kind, 'skillforge-real-model-eval');
    assert.equal(report.version, REPORT_FORMAT_VERSION);
    assert.equal(report.providerName, 'model');
    assert.match(report.runId, /^real-model-fake-model-\d{8}-\d{6}$/);
    assert.ok(report.generated);

    // Model capture: requested alias AND exact served version.
    assert.equal(report.model.requested, 'fake-model');
    assert.equal(report.model.served, 'fake-model-2026-01-01');
    assert.deepEqual(report.model.servedModels, ['fake-model-2026-01-01']);
    assert.equal(report.model.consistent, true);
    assert.equal(report.providerMeta.kind, 'model');
    assert.equal(report.providerMeta.endpoint, '127.0.0.1:1');
    // No credential material anywhere in the report.
    const serialized = JSON.stringify(report);
    assert.ok(!serialized.includes('fake-key-for-tests-only'));
    assert.ok(!serialized.includes('127.0.0.1:1/v1/chat/completions'));

    // Dataset fingerprint.
    assert.equal(report.dataset.count, 3);
    assert.equal(report.dataset.version, 99);
    assert.equal(report.dataset.sha256.length, 64);
    assert.deepEqual([...report.dataset.ids].sort(), ['COD-nodejs-001', 'SEC-inject-001', 'SEL-nextjs-001']);

    // Environment + reproducibility.
    assert.equal(report.environment.node, process.version);
    assert.equal(typeof report.environment.gitCommit, 'string');

    // Summary and per-case results.
    assert.equal(report.summary.total, 3);
    assert.equal(report.summary.passed, 3);
    assert.equal(report.summary.failed, 0);
    assert.equal(report.summary.passRate, 1);
    assert.equal(report.results.length, 3);
    for (const r of report.results) {
      assert.equal(r.pass, true);
      assert.equal(r.score, 100);
      assert.equal(r.emptyResponse, false);
      assert.deepEqual(r.usage, { promptTokens: 100, completionTokens: 50, totalTokens: 150 });
    }

    // All eight dimensions present with correct aggregates.
    assert.deepEqual(Object.keys(report.dimensions), DIMENSIONS.map((d) => d.id));
    assert.equal(report.dimensions['skill-selection'].total, 1);
    assert.equal(report.dimensions['skill-selection'].passed, 1);
    assert.equal(report.dimensions.refusal.total, 1);
    assert.equal(report.dimensions['unsafe-instruction-handling'].total, 1);
    assert.equal(report.dimensions['code-quality'].total, 1);
    assert.equal(report.dimensions['instruction-following'].total, 0);
    assert.equal(report.dimensions['instruction-following'].passRate, null);
    assert.equal(report.dimensions['context-preservation'].proxy, true);

    // Usage + cost: 3 cases x 150 tokens; (300/1000)*0.003 + (150/1000)*0.015.
    assert.equal(report.usage.requests, 3);
    assert.equal(report.usage.totalTokens, 450);
    assert.equal(report.usage.estimatedCostUsd, 0.00315);
    assert.equal(report.failures.length, 0);
    assert.equal(report.runnerRetries, 0);
    assert.equal(fetchImpl.calls(), 3);

    // Files on disk: JSON + Markdown summary.
    const jsonPath = path.join(outDir, 'latest.json');
    const mdPath = path.join(outDir, 'latest.md');
    assert.ok(existsSync(jsonPath));
    assert.ok(existsSync(mdPath));
    assert.deepEqual(JSON.parse(readFileSync(jsonPath, 'utf8')).runId, report.runId);
    const md = readFileSync(mdPath, 'utf8');
    assert.match(md, /REAL-MODEL RUN/);
    assert.match(md, /fake-model-2026-01-01/);
    assert.match(md, /NOT comparable to the mock baseline/);
    assert.match(md, /Context preservation \*\(proxy\)\*/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('end-to-end: gemini adapter path via the registry with a STUB helper', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const ids = ['SEL-nextjs-001', 'SEC-inject-001'];
    const dataset = writeDataset(dir, ids);
    const { stub, argvLog } = writeStubHelper(dir, stubResponsesFor(byInput, ids));
    const outDir = path.join(dir, 'out');
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini',
      env: { GEMINI_HELPER_PATH: stub, GEMINI_MODEL: 'gemini-3.5-flash', GEMINI_TIMEOUT_MS: '10000' },
      datasetPath: dataset, outDir, delayMs: 0,
    });
    assert.equal(exitCode, 0);
    assert.equal(report.providerName, 'gemini');
    assert.equal(report.summary.passed, 2);
    assert.equal(report.summary.failed, 0);
    // The stub echoes the exact model id per response; the runner
    // aggregates it as the served model.
    assert.equal(report.model.requested, 'gemini-3.5-flash');
    assert.equal(report.model.served, 'gemini-3.5-flash');
    assert.deepEqual(report.model.servedModels, ['gemini-3.5-flash']);
    assert.equal(report.model.consistent, true);
    assert.equal(report.providerMeta.provider, 'gemini');
    assert.equal(report.providerMeta.endpoint, 'generativelanguage.googleapis.com');
    assert.equal(report.providerMeta.helper, 'stub-helper.py');
    // Usage from the stubbed response, per case and in aggregate,
    // plus the adapter's servedModels / emptyResponses accounting.
    assert.equal(report.usage.totalTokens, 300);
    assert.equal(report.usage.promptTokens, 200);
    assert.equal(report.usage.completionTokens, 100);
    assert.deepEqual(report.usage.servedModels, { 'gemini-3.5-flash': 2 });
    assert.equal(report.usage.emptyResponses, 0);
    for (const r of report.results) {
      assert.deepEqual(r.usage, { promptTokens: 100, completionTokens: 50, totalTokens: 150 });
    }
    // The runner defaulted max tokens to 2048 (thinking-model
    // floor); the adapter passed it to the helper as --max-tokens.
    assert.deepEqual(report.providerEnvDefaultsApplied, ['GEMINI_MAX_TOKENS']);
    const argvCalls = readArgvLog(argvLog);
    assert.equal(argvCalls.length, 2);
    for (const argv of argvCalls) {
      assert.equal(argv[argv.indexOf('--model') + 1], 'gemini-3.5-flash');
      assert.equal(argv[argv.indexOf('--max-tokens') + 1], '2048');
      assert.equal(argv[argv.indexOf('--temperature') + 1], '0');
      assert.equal(argv[argv.indexOf('--timeout') + 1], '10');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gemini model defaults to gemini-3.5-flash when GEMINI_MODEL is unset', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const ids = ['SEL-nextjs-001'];
    const dataset = writeDataset(dir, ids);
    const { stub, argvLog } = writeStubHelper(dir, stubResponsesFor(byInput, ids));
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini',
      env: { GEMINI_HELPER_PATH: stub, GEMINI_TIMEOUT_MS: '10000' },
      datasetPath: dataset, outDir: path.join(dir, 'out'), delayMs: 0,
    });
    assert.equal(exitCode, 0);
    assert.equal(report.model.requested, 'gemini-3.5-flash');
    assert.deepEqual([...report.providerEnvDefaultsApplied].sort(), ['GEMINI_MAX_TOKENS', 'GEMINI_MODEL']);
    const argvCalls = readArgvLog(argvLog);
    assert.equal(argvCalls[0][argvCalls[0].indexOf('--model') + 1], 'gemini-3.5-flash');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gemini empty content: stub returns length/empty, recorded with finishReason', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const ids = ['SEL-nextjs-001'];
    const dataset = writeDataset(dir, ids);
    const c = [...byInput.values()].find((x) => x.id === 'SEL-nextjs-001');
    const { stub } = writeStubHelper(dir, {}, [c.input]);
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini',
      env: { GEMINI_HELPER_PATH: stub, GEMINI_TIMEOUT_MS: '10000' },
      datasetPath: dataset, outDir: path.join(dir, 'out'), delayMs: 0,
    });
    assert.equal(exitCode, 1);
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].emptyResponse, true);
    assert.equal(report.results[0].finishReason, 'length');
    assert.equal(report.results[0].pass, false);
    assert.equal(report.usage.emptyResponses, 1);
    // Empty content is never retried: one helper call, not two.
    assert.equal(report.usage.attempts, 1);
    assert.equal(report.runnerRetries, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('end-to-end: failures are classified, exit code 1, report-only exits 0', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'SEC-inject-001', 'COD-nodejs-001']);
    // A bad model: selects nothing, answers nothing, never refuses,
    // writes no code. Every case fails, each in a different way.
    const badFetch = makeFakeFetch(() => ({
      skills: [], answer: '', refused: false, refusalReason: null, tools: [], code: [],
    }));
    const outDir = path.join(dir, 'out');
    const { report, exitCode } = await runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl: badFetch, datasetPath: dataset, outDir, delayMs: 0,
    });
    assert.equal(exitCode, 1);
    assert.equal(report.summary.total, 3);
    assert.equal(report.summary.passed, 0);
    assert.equal(report.summary.failed, 3);
    assert.equal(report.summary.criticalFailures, 1); // the unrefused security case
    assert.equal(report.failures.length, 3);
    const byId = new Map(report.failures.map((f) => [f.id, f]));
    // Refusal outranks selection: the unrefused injection is a refusal gap.
    assert.equal(byId.get('SEC-inject-001').failureCategory, 'refusal-gap');
    assert.equal(byId.get('SEC-inject-001').critical, true);
    // Missing skill + missing mustInclude: selection outranks content.
    assert.equal(byId.get('SEL-nextjs-001').failureCategory, 'selection-gap');
    assert.ok(byId.get('SEL-nextjs-001').failedChecks.includes('recall'));
    // No code at all: code gap.
    assert.equal(byId.get('COD-nodejs-001').failureCategory, 'code-gap');
    assert.ok(byId.get('COD-nodejs-001').failedChecks.includes('code-present'));
    for (const f of report.failures) assert.equal(f.needsHumanReview, true);
    // An empty model reply is flagged as an observed outcome.
    for (const r of report.results) assert.equal(r.emptyResponse, true);

    // Dimensions reflect the failures; empty dimensions stay null.
    assert.equal(report.dimensions['skill-selection'].passRate, 0);
    assert.equal(report.dimensions.refusal.passRate, 0);
    assert.deepEqual(report.dimensions.refusal.failedCaseIds, ['SEC-inject-001']);

    // --report-only: same failures, exit 0.
    const { exitCode: reportOnlyCode } = await runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl: makeFakeFetch(() => ({ skills: [], answer: '', refused: false, refusalReason: null, tools: [], code: [] })),
      datasetPath: dataset, outDir: path.join(dir, 'out2'), reportOnly: true, delayMs: 0,
    });
    assert.equal(reportOnlyCode, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('end-to-end: provider errors fail the case as provider-error, not silently', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const failingFetch = async () => { throw new Error('socket hang up'); };
    const { report, exitCode } = await runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl: failingFetch, datasetPath: dataset, outDir: path.join(dir, 'out'), delayMs: 0,
    });
    assert.equal(exitCode, 1);
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].pass, false);
    assert.match(report.results[0].failureReason, /^provider error: socket hang up/);
    assert.equal(report.results[0].failureCategory, 'provider-error');
    assert.equal(report.usage.errors, 1);
    assert.equal(report.usage.requests, 1);
    // No response was ever observed, so no served model is recorded —
    // and none is invented.
    assert.equal(report.model.served, null);
    assert.equal(report.model.consistent, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('results preserve the model observation (answer, code, tools) for diagnosis', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const observation = {
      selectedSkills: ['nextjs'], answer: 'The nextjs skill covers this.',
      refused: false, refusalReason: null,
      tools: ['Load nextjs', 'Follow its routing guide'],
      code: ['export default function Page() { return null; }'],
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    };
    const provider = makeFakeProvider(() => observation);
    const { report } = await runRealModelEval({
      providerName: 'gemini', provider, datasetPath: dataset,
      outDir: path.join(dir, 'out'), delayMs: 0, retryBackoffMs: 1,
    });
    assert.equal(report.results.length, 1);
    // Day 1's compile failures had no record of the code: the
    // model's own output must survive into the result record.
    assert.equal(report.results[0].answer, observation.answer);
    assert.deepEqual(report.results[0].code, observation.code);
    assert.deepEqual(report.results[0].tools, observation.tools);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('provider-error results keep the call context the error carries (usage, finish reason)', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const err = new Error('Gemini provider returned non-JSON output: not json');
    err.usage = { promptTokens: 100, completionTokens: 50, totalTokens: 150 };
    err.finishReason = 'stop';
    const provider = makeFakeProvider(() => err);
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini', provider, datasetPath: dataset,
      outDir: path.join(dir, 'out'), delayMs: 0, retryBackoffMs: 1,
    });
    assert.equal(exitCode, 1);
    assert.equal(report.results[0].failureCategory, 'provider-error');
    assert.deepEqual(report.results[0].usage, err.usage);
    assert.equal(report.results[0].finishReason, 'stop');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rate-limit: the runner retries a fresh 429 once, then the case passes', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    let attempts = 0;
    const provider = makeFakeProvider((evalCase) => {
      attempts++;
      if (attempts === 1) throw new Error('Gemini provider HTTP 429: quota exceeded');
      return normalizedGoodObservation(byInput, evalCase.input);
    });
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini', provider, datasetPath: dataset,
      outDir: path.join(dir, 'out'), delayMs: 0, retryBackoffMs: 1,
    });
    assert.equal(exitCode, 0);
    assert.equal(report.summary.passed, 1);
    assert.equal(report.runnerRetries, 1);
    assert.equal(provider.calls(), 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rate-limit: a second 429 fails the case as provider-error (no retry loop)', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const provider = makeFakeProvider(() => new Error('Gemini provider HTTP 429'));
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini', provider, datasetPath: dataset,
      outDir: path.join(dir, 'out'), delayMs: 0, retryBackoffMs: 1,
    });
    assert.equal(exitCode, 1);
    assert.equal(report.results[0].failureCategory, 'provider-error');
    assert.equal(report.runnerRetries, 1);
    assert.equal(provider.calls(), 2); // one attempt + exactly one retry
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rate-limit: an already-exhausted 429 is NOT retried again by the runner', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const provider = makeFakeProvider(() => new Error('Gemini provider rate-limited (HTTP 429) after 1 retry — back off and re-run later'));
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini', provider, datasetPath: dataset,
      outDir: path.join(dir, 'out'), delayMs: 0, retryBackoffMs: 1,
    });
    assert.equal(exitCode, 1);
    assert.equal(report.results[0].failureCategory, 'provider-error');
    assert.equal(report.runnerRetries, 0);
    assert.equal(provider.calls(), 1); // the adapter already retried; the runner does not pile on
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auth failure: the run aborts immediately with no report written', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'SEC-inject-001']);
    const provider = makeFakeProvider(() => new Error('Gemini provider credential rejected (HTTP 403) — STOP: do not retry.'));
    const outDir = path.join(dir, 'out');
    await assert.rejects(
      () => runRealModelEval({
        providerName: 'gemini', provider, datasetPath: dataset, outDir, delayMs: 0, retryBackoffMs: 1,
      }),
      (e) => {
        assert.ok(e instanceof AuthAbortError);
        assert.ok(e instanceof RunAbortError);
        assert.equal(e.code, 'AUTH_ERROR');
        assert.match(e.message, /rejected the credential/);
        assert.match(e.message, /aborted immediately/);
        // The abort carries the checkpoint path for the resume
        // command (no case completed here, so no checkpoint file
        // exists yet — the path is where one would live).
        assert.equal(e.checkpointPath, path.join(outDir, CHECKPOINT_FILENAME));
        return true;
      },
    );
    // The run stopped on the first case: one call, no report.
    assert.equal(provider.calls(), 1);
    assert.ok(!existsSync(path.join(outDir, 'latest.json')));
    assert.ok(!existsSync(path.join(outDir, 'latest.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('model unavailable: the run aborts immediately with no report written', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'SEC-inject-001']);
    const provider = makeFakeProvider(() => new Error('Gemini provider model unavailable (HTTP 404): gemini-3.5-flash is not available for this key.'));
    const outDir = path.join(dir, 'out');
    await assert.rejects(
      () => runRealModelEval({
        providerName: 'gemini', provider, datasetPath: dataset, outDir, delayMs: 0, retryBackoffMs: 1,
      }),
      (e) => {
        assert.ok(e instanceof ModelUnavailableError);
        assert.ok(e instanceof RunAbortError);
        assert.equal(e.code, 'MODEL_UNAVAILABLE');
        assert.match(e.message, /model unavailable/);
        assert.match(e.message, /aborted immediately/);
        return true;
      },
    );
    assert.equal(provider.calls(), 1);
    assert.ok(!existsSync(path.join(outDir, 'latest.json')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('empty response: recorded as the observed outcome with finishReason, no crash', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const provider = makeFakeProvider(() => ({
      selectedSkills: [], answer: '', refused: false, refusalReason: null,
      tools: [], code: [], finishReason: 'length',
    }));
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini', provider, datasetPath: dataset,
      outDir: path.join(dir, 'out'), delayMs: 0,
    });
    assert.equal(exitCode, 1);
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].emptyResponse, true);
    assert.equal(report.results[0].finishReason, 'length');
    assert.equal(report.results[0].pass, false);
    assert.equal(provider.calls(), 1); // never retried in a loop
    const md = readFileSync(path.join(dir, 'out', 'latest.md'), 'utf8');
    assert.match(md, /Empty model responses: 1 case/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('archive: --archive writes a copy of the JSON report', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const archivePath = path.join(dir, 'runs', 'real-model-gemini-3.5-flash-2026-11-22.json');
    const { report, archivePath: returned } = await runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl: makeFakeFetch(goodModelHandler(byInput)),
      datasetPath: dataset, outDir: path.join(dir, 'out'), archivePath, delayMs: 0,
    });
    assert.equal(returned, archivePath);
    assert.ok(existsSync(archivePath));
    const archived = JSON.parse(readFileSync(archivePath, 'utf8'));
    assert.equal(archived.runId, report.runId);
    assert.equal(archived.archivePath, path.relative(REPO_ROOT, archivePath));
    assert.deepEqual(archived.results, report.results);
    assert.deepEqual(archived.dimensions, report.dimensions);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkpoint: written after each case with results, dataset fingerprint, and usage totals', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'SEC-inject-001']);
    const outDir = path.join(dir, 'out');
    const { report, checkpointPath } = await runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl: makeFakeFetch(goodModelHandler(byInput)),
      datasetPath: dataset, outDir, delayMs: 0,
    });
    assert.equal(checkpointPath, path.join(outDir, CHECKPOINT_FILENAME));
    assert.ok(existsSync(checkpointPath));
    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf8'));
    assert.equal(checkpoint.kind, 'skillforge-real-model-eval-checkpoint');
    assert.equal(checkpoint.version, CHECKPOINT_FORMAT_VERSION);
    assert.equal(checkpoint.runId, report.runId);
    assert.equal(checkpoint.providerName, 'model');
    assert.equal(checkpoint.requestedModel, 'fake-model');
    assert.equal(checkpoint.dataset.sha256, report.dataset.sha256);
    assert.equal(checkpoint.completed, 2);
    assert.equal(checkpoint.total, 2);
    assert.equal(checkpoint.results.length, 2);
    assert.deepEqual(checkpoint.results.map((r) => r.id), ['SEC-inject-001', 'SEL-nextjs-001']);
    assert.deepEqual(checkpoint.servedModels, ['fake-model-2026-01-01']);
    assert.deepEqual(checkpoint.usageTokens, { promptTokens: 200, completionTokens: 100, totalTokens: 300, requests: 2, errors: 0 });
    assert.equal(checkpoint.runnerRetries, 0);
    // No credential material in the checkpoint either.
    assert.ok(!JSON.stringify(checkpoint).includes('fake-key-for-tests-only'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resume: aborted run continues, skips completed cases, keeps run id, merges usage', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'SEC-inject-001', 'COD-nodejs-001']);
    const outDir = path.join(dir, 'out');
    // First session: case 1 (COD-nodejs-001, sorted first) passes,
    // case 2 (SEC-inject-001) hits a rejected credential and aborts.
    const aborting = makeFakeProvider((evalCase, n) => {
      if (n === 2) throw new Error('Gemini provider credential rejected (HTTP 403)');
      return normalizedGoodObservation(byInput, evalCase.input);
    });
    let checkpointPath;
    await assert.rejects(
      () => runRealModelEval({
        providerName: 'gemini', provider: aborting, datasetPath: dataset, outDir, delayMs: 0,
      }),
      (e) => {
        assert.ok(e instanceof AuthAbortError);
        checkpointPath = e.checkpointPath;
        return true;
      },
    );
    assert.equal(checkpointPath, path.join(outDir, CHECKPOINT_FILENAME));
    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf8'));
    assert.equal(checkpoint.results.length, 1);
    assert.equal(checkpoint.results[0].id, 'COD-nodejs-001');
    assert.equal(checkpoint.results[0].pass, true);
    assert.deepEqual(checkpoint.usageTokens, { promptTokens: 100, completionTokens: 50, totalTokens: 150, requests: 1, errors: 0 });
    assert.equal(aborting.calls(), 2);
    // No report was written by the aborted session.
    assert.ok(!existsSync(path.join(outDir, 'latest.json')));

    // Second session: resume (outDir defaults to the checkpoint's
    // directory). Only the two remaining cases run.
    const resumedProvider = makeFakeProvider((evalCase) => normalizedGoodObservation(byInput, evalCase.input));
    const { report, exitCode } = await runRealModelEval({
      providerName: 'gemini', provider: resumedProvider, datasetPath: dataset,
      resumeFrom: checkpointPath, delayMs: 0,
    });
    assert.equal(exitCode, 0);
    assert.equal(resumedProvider.calls(), 2);
    assert.equal(report.runId, checkpoint.runId);
    assert.equal(report.generated, checkpoint.started);
    assert.ok(report.completedAt);
    assert.equal(report.summary.total, 3);
    assert.equal(report.summary.passed, 3);
    assert.deepEqual(report.results.map((r) => r.id), ['COD-nodejs-001', 'SEC-inject-001', 'SEL-nextjs-001']);
    assert.equal(report.resumedFrom.priorCases, 1);
    assert.equal(report.resumedFrom.checkpoint, path.relative(REPO_ROOT, checkpointPath));
    assert.ok(report.resumedFrom.resumedAt);
    // Usage merges checkpointed case-1 tokens with the resumed
    // session's two calls: 3 requests, 300/150/450 tokens.
    assert.equal(report.usage.requests, 3);
    assert.equal(report.usage.promptTokens, 300);
    assert.equal(report.usage.completionTokens, 150);
    assert.equal(report.usage.totalTokens, 450);
    assert.match(report.usageNote, /checkpointed/);
    // The checkpoint in the resumed outDir now covers all 3 cases.
    const finalCheckpoint = JSON.parse(readFileSync(path.join(outDir, CHECKPOINT_FILENAME), 'utf8'));
    assert.equal(finalCheckpoint.completed, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resume: rejects a checkpoint for a different dataset, provider, or model', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001']);
    const outDir = path.join(dir, 'out');
    const provider = makeFakeProvider((evalCase) => normalizedGoodObservation(byInput, evalCase.input));
    const { checkpointPath } = await runRealModelEval({
      providerName: 'gemini', provider, datasetPath: dataset, outDir, delayMs: 0,
    });
    // Different dataset (different SHA) — a separate file, so the
    // original dataset file is not overwritten.
    const otherDataset = writeDataset(dir, ['SEC-inject-001'], {}, 'other-subset.json');
    await assert.rejects(
      () => runRealModelEval({
        providerName: 'gemini', provider: makeFakeProvider(() => ({})),
        datasetPath: otherDataset, resumeFrom: checkpointPath, delayMs: 0,
      }),
      /dataset mismatch/,
    );
    // Different provider.
    await assert.rejects(
      () => runRealModelEval({
        providerName: 'model', provider: makeFakeProvider(() => ({})),
        datasetPath: dataset, resumeFrom: checkpointPath, delayMs: 0,
      }),
      /provider mismatch/,
    );
    // Different model (same provider name, different resolved model).
    await assert.rejects(
      () => runRealModelEval({
        providerName: 'gemini', provider: makeFakeProvider(() => ({}), 'other-model'),
        datasetPath: dataset, resumeFrom: checkpointPath, delayMs: 0,
      }),
      /model mismatch/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('onProgress: called once per completed case, in case order', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'COD-nodejs-001']);
    const events = [];
    await runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl: makeFakeFetch(goodModelHandler(byInput)),
      datasetPath: dataset, outDir: path.join(dir, 'out'), delayMs: 0,
      onProgress: (e) => events.push(e),
    });
    assert.equal(events.length, 2);
    assert.deepEqual(events[0], { completed: 1, total: 2, id: 'COD-nodejs-001', pass: true, score: 100, emptyResponse: false, failureCategory: null });
    assert.deepEqual(events[1], { completed: 2, total: 2, id: 'SEL-nextjs-001', pass: true, score: 100, emptyResponse: false, failureCategory: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('computeUsageTotals / buildCheckpoint / validateCheckpoint: unit behavior', async () => {
  const results = [
    { id: 'a', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } },
    { id: 'b', usage: { promptTokens: 20, completionTokens: 0, totalTokens: 20 }, failureCategory: 'provider-error' },
    { id: 'c' }, // no usage recorded (provider error without a response)
  ];
  assert.deepEqual(computeUsageTotals(results), { promptTokens: 30, completionTokens: 5, totalTokens: 35, requests: 3, errors: 1 });
  const dataset = { file: 'evals/datasets/x.json', version: 2, count: 3, sha256: 'a'.repeat(64), ids: ['a', 'b', 'c'] };
  const checkpoint = buildCheckpoint({
    runId: 'r1', providerName: 'gemini', requestedModel: 'gemini-3.5-flash',
    dataset, started: '2026-11-22T00:00:00.000Z', results,
    runnerRetries: 1, servedModels: ['gemini-3.5-flash'],
  });
  assert.equal(checkpoint.kind, 'skillforge-real-model-eval-checkpoint');
  assert.equal(checkpoint.completed, 3);
  assert.equal(checkpoint.runnerRetries, 1);
  validateCheckpoint(checkpoint, { dataset, providerName: 'gemini', requestedModel: 'gemini-3.5-flash' });
  assert.throws(() => validateCheckpoint(checkpoint, { dataset: { ...dataset, sha256: 'b'.repeat(64) }, providerName: 'gemini', requestedModel: 'gemini-3.5-flash' }), /dataset mismatch/);
  assert.throws(() => validateCheckpoint(checkpoint, { dataset, providerName: 'openai', requestedModel: 'gemini-3.5-flash' }), /provider mismatch/);
  assert.throws(() => validateCheckpoint(checkpoint, { dataset, providerName: 'gemini', requestedModel: 'gemini-2.5-flash' }), /model mismatch/);
  // loadCheckpoint rejects a non-checkpoint file.
  const dir = tmpdir();
  try {
    const notCheckpoint = path.join(dir, 'x.json');
    writeFileSync(notCheckpoint, JSON.stringify({ kind: 'something-else', version: 1 }));
    await assert.rejects(() => loadCheckpoint(notCheckpoint), /not a real-model checkpoint/);
    await assert.rejects(() => loadCheckpoint(path.join(dir, 'missing.json')), /cannot read checkpoint/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scoring consistency: the same fake run twice gives identical per-case results', async () => {
  const dir = tmpdir();
  const byInput = loadCasesByInput();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'SEC-inject-001']);
    const run = (out) => runRealModelEval({
      providerName: 'model', env: FAKE_ENV, fetchImpl: makeFakeFetch(goodModelHandler(byInput)),
      datasetPath: dataset, outDir: out, delayMs: 0,
    });
    const a = await run(path.join(dir, 'a'));
    const b = await run(path.join(dir, 'b'));
    const slim = (r) => r.results.map((x) => ({ id: x.id, pass: x.pass, score: x.score, checks: x.checks }));
    assert.deepEqual(slim(a.report), slim(b.report));
    assert.deepEqual(a.report.dimensions, b.report.dimensions);
    assert.deepEqual(a.report.summary, b.report.summary);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runRealModelEval fails fast on dataset ids that do not resolve', async () => {
  const dir = tmpdir();
  try {
    const dataset = writeDataset(dir, ['SEL-nextjs-001', 'NOPE-000']);
    await assert.rejects(
      () => runRealModelEval({ providerName: 'model', env: FAKE_ENV, fetchImpl: makeFakeFetch(() => ({})), datasetPath: dataset, outDir: path.join(dir, 'out'), delayMs: 0 }),
      /NOPE-000/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('classifyFailure: priority order and unclassified fallback', () => {
  const failed = (checks, reason) => ({
    checks: checks.map((name) => ({ name, pass: false, detail: '' })),
    failureReason: reason || 'x',
  });
  assert.equal(classifyFailure(failed([], 'provider error: timeout')).failureCategory, 'provider-error');
  assert.equal(classifyFailure(failed(['refused', 'recall'])).failureCategory, 'refusal-gap');
  assert.equal(classifyFailure(failed(['code-block-1-compiles', 'recall'])).failureCategory, 'code-gap');
  assert.equal(classifyFailure(failed(['recall', 'must-include: x'])).failureCategory, 'selection-gap');
  assert.equal(classifyFailure(failed(['must-include: x', 'tool: y'])).failureCategory, 'content-gap');
  assert.equal(classifyFailure(failed(['tool: y'])).failureCategory, 'tool-gap');
  assert.equal(classifyFailure(failed(['grounded-in: nextjs'])).failureCategory, 'selection-gap');
  assert.equal(classifyFailure(failed(['something-unknown'])).failureCategory, 'unclassified');
  assert.equal(classifyFailure(failed(['recall'])).needsHumanReview, true);
});

test('computeDimensions: predicate dimension and empty-dimension null rate', () => {
  const casesById = new Map([
    ['a', { id: 'a', category: 'security-compliance', expected: { refuse: true } }],
    ['b', { id: 'b', category: 'security-compliance', expected: { refuse: false } }],
    ['c', { id: 'c', category: 'skill-selection', expected: {} }],
  ]);
  const results = [
    { id: 'a', pass: true },
    { id: 'b', pass: false },
    { id: 'c', pass: true },
  ];
  const dims = computeDimensions(results, casesById);
  // Refusal counts both security cases; unsafe-instruction handling
  // counts only the refuse=true one.
  assert.equal(dims.refusal.total, 2);
  assert.equal(dims.refusal.passed, 1);
  assert.equal(dims['unsafe-instruction-handling'].total, 1);
  assert.equal(dims['unsafe-instruction-handling'].passed, 1);
  assert.equal(dims['code-quality'].total, 0);
  assert.equal(dims['code-quality'].passRate, null);
  assert.equal(dims['context-preservation'].proxy, true);
  assert.match(dims['context-preservation'].proxyNote, /Proxy dimension/);
});

test('model-version capture: records served model, tolerates missing clone()', async () => {
  // With clone(): the served model is observed.
  const { fetch, getObservedModels } = createVersionCapturingFetch(
    async () => new FakeResponse(JSON.stringify({ model: 'served-1.2.3', choices: [] })),
  );
  const res = await fetch('http://example.invalid/v1/chat/completions', {});
  // The original response is untouched: the caller can still read it.
  assert.deepEqual(await res.json(), { model: 'served-1.2.3', choices: [] });
  assert.deepEqual(getObservedModels(), ['served-1.2.3']);

  // Two different served models across calls: both recorded, in order.
  let n = 0;
  const multi = createVersionCapturingFetch(async () => {
    n++;
    return new FakeResponse(JSON.stringify({ model: n === 1 ? 'm-a' : 'm-b', choices: [] }));
  });
  await multi.fetch('http://example.invalid/', {});
  await multi.fetch('http://example.invalid/', {});
  assert.deepEqual(multi.getObservedModels(), ['m-a', 'm-b']);
  assert.deepEqual(summarizeServedModel('alias', ['m-a', 'm-b']), {
    requested: 'alias', served: null, servedModels: ['m-a', 'm-b'], consistent: false,
  });
  assert.deepEqual(summarizeServedModel('alias', ['m-a']), {
    requested: 'alias', served: 'm-a', servedModels: ['m-a'], consistent: true,
  });
  assert.deepEqual(summarizeServedModel('alias', []), {
    requested: 'alias', served: null, servedModels: [], consistent: false,
  });

  // Without clone(): observation is skipped, the call still works.
  const noClone = createVersionCapturingFetch(async () => ({
    ok: true, status: 200, headers: { get: () => null },
    json: async () => ({ model: 'invisible', choices: [] }),
  }));
  const res2 = await noClone.fetch('http://example.invalid/', {});
  assert.deepEqual(await res2.json(), { model: 'invisible', choices: [] });
  assert.deepEqual(noClone.getObservedModels(), []);

  // Non-2xx responses are not observed.
  const failing = createVersionCapturingFetch(async () => new FakeResponse(JSON.stringify({ model: 'nope' }), { ok: false, status: 500 }));
  await failing.fetch('http://example.invalid/', {});
  assert.deepEqual(failing.getObservedModels(), []);
});
