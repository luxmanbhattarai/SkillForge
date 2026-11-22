// eval-providers.test.mjs — unit tests for the multi-model provider
// adapters (evals/providers/*) and the provider registry
// (evals/lib/provider-registry.mjs).
//
// Every adapter test runs against a fake in-process HTTP server on
// 127.0.0.1 with fake credentials: no network, no real provider
// access, no paid API calls. The standard suite (npm test) must
// never need real provider credentials.

import test from 'node:test';
import assert from 'node:assert/strict';
import { after } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { parseRetryAfter, MODEL_SYSTEM_PROMPT } from '../evals/providers/shared.mjs';
import { createOpenAIProvider, isOpenAIConfigured, parseOpenAIConfig } from '../evals/providers/openai.mjs';
import { createAnthropicProvider, isAnthropicConfigured, parseAnthropicConfig } from '../evals/providers/anthropic.mjs';
import { createGeminiProvider, isGeminiConfigured, parseGeminiConfig, GEMINI_MODEL } from '../evals/providers/gemini.mjs';
import { createLocalProvider, isLocalConfigured, parseLocalConfig } from '../evals/providers/local.mjs';
import {
  resolveProvider, listProviders, getProviderSpec, KNOWN_PROVIDERS,
} from '../evals/lib/provider-registry.mjs';

const FAKE_KEY = 'test-key-not-a-real-credential';
const CASE = { id: 'T-001', input: 'How do I build a REST API?' };

const MODEL_REPLY = {
  skills: ['alpha-skill'],
  answer: 'Use alpha widgets for this task.',
  refused: false,
  refusalReason: null,
  tools: ['load alpha-skill'],
  code: ['const a = 1;\n'],
};

function startStub(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

// Reads the request body as JSON, then hands (req, body) to fn.
function withJsonBody(fn) {
  return (req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let body = null;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        // fn sees body === null for a malformed request.
      }
      fn(req, res, body);
    });
  };
}

function jsonResponse(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify(payload));
}

const chatCompletion = (content, usage) => ({
  choices: [{ message: { role: 'assistant', content } }],
  usage: usage ?? { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
});

const anthropicMessage = (text, usage) => ({
  content: [{ type: 'text', text }],
  usage: usage ?? { input_tokens: 12, output_tokens: 6 },
});

// A dummy helper file so Gemini config parsing succeeds without the
// real connector helper (spawn is stubbed in these tests, so the
// file is never executed). Cleaned up when the file finishes.
const GEMINI_TMP = mkdtempSync(path.join(os.tmpdir(), 'skillforge-gemini-test-'));
const DUMMY_HELPER = path.join(GEMINI_TMP, 'gemini_chat.py');
writeFileSync(DUMMY_HELPER, '# dummy helper for tests — never executed\n');
after(() => rmSync(GEMINI_TMP, { recursive: true, force: true }));

const GEMINI_ENV = (extra = {}) => ({
  GEMINI_HELPER_PATH: DUMMY_HELPER,
  GEMINI_RETRY_DELAY_MS: '1',
  ...extra,
});

// An OpenAI-compatible helper response (what gemini_chat.py prints).
const helperResponse = (content, extra = {}) => JSON.stringify({
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: 1795310000,
  model: 'gemini-3.5-flash',
  choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
  ...extra,
});

// A stub spawn implementation: serves canned results in order and
// records every invocation. An Error entry is thrown instead.
function fakeSpawn(results) {
  const calls = [];
  const impl = async ({ command, args, input, timeoutMs }) => {
    calls.push({ command, args, input, timeoutMs });
    const next = results[Math.min(calls.length - 1, results.length - 1)];
    if (next instanceof Error) throw next;
    return next;
  };
  return { impl, calls };
}

const okResult = (content, extra) => ({ code: 0, stdout: helperResponse(content, extra), stderr: '' });
const failResult = (stderr) => ({ code: 1, stdout: '', stderr });

// ---- Shared helpers -------------------------------------------------

test('parseRetryAfter: delay-seconds, HTTP-date, and unparseable values', () => {
  assert.equal(parseRetryAfter('2'), 2000);
  assert.equal(parseRetryAfter('0'), 0);
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter(undefined), null);
  assert.equal(parseRetryAfter('not-a-date'), null);
  assert.equal(parseRetryAfter('  3  '), 3000);
  // An HTTP-date in the past means "retry now".
  const now = Date.parse('2026-11-22T00:00:00Z');
  assert.equal(parseRetryAfter('Wed, 21 Nov 2026 00:00:00 GMT', now), 0);
  // An HTTP-date in the future is the delay until then.
  assert.equal(parseRetryAfter('Sun, 22 Nov 2026 00:00:05 GMT', now), 5000);
});

test('adapters share one system prompt (same instructions, every provider)', () => {
  assert.match(MODEL_SYSTEM_PROMPT, /respond with a single JSON object/);
  assert.match(MODEL_SYSTEM_PROMPT, /SkillForge skills library/);
});

// ---- OpenAI ---------------------------------------------------------

test('openai: request shape, response normalization, usage, and metadata', async () => {
  const seen = [];
  const { server, baseUrl } = await startStub(withJsonBody((req, res, body) => {
    seen.push({ url: req.url, method: req.method, auth: req.headers.authorization, body });
    jsonResponse(res, 200, chatCompletion(JSON.stringify(MODEL_REPLY)));
  }));
  try {
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: FAKE_KEY,
      OPENAI_MODEL: 'stub-gpt',
      OPENAI_BASE_URL: `${baseUrl}/v1`,
      OPENAI_RETRY_DELAY_MS: '1',
      OPENAI_PRICE_INPUT_PER_1K: '3',
      OPENAI_PRICE_OUTPUT_PER_1K: '15',
    });
    const obs = await provider.run(CASE);
    assert.equal(provider.name, 'openai:stub-gpt');
    assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
    assert.equal(obs.answer, 'Use alpha widgets for this task.');
    assert.equal(obs.refused, false);
    assert.deepEqual(obs.tools, ['load alpha-skill']);
    assert.deepEqual(obs.code, ['const a = 1;\n']);
    assert.deepEqual(obs.usage, { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, '/v1/chat/completions');
    assert.equal(seen[0].method, 'POST');
    assert.equal(seen[0].auth, `Bearer ${FAKE_KEY}`);
    assert.equal(seen[0].body.model, 'stub-gpt');
    assert.equal(seen[0].body.temperature, 0);
    assert.equal(seen[0].body.messages[0].role, 'system');
    assert.equal(seen[0].body.messages[1].content, CASE.input);
    // Metadata records the exact model id and the endpoint host —
    // never the key or the full URL.
    assert.equal(provider.meta.model, 'stub-gpt');
    assert.equal(provider.meta.provider, 'openai');
    assert.equal(provider.meta.kind, 'model');
    assert.ok(!JSON.stringify(provider.meta).includes(FAKE_KEY));
    const usage = provider.getUsage();
    assert.equal(usage.requests, 1);
    assert.equal(usage.totalTokens, 15);
    // 10/1000*3 + 5/1000*15 = 0.105
    assert.equal(usage.estimatedCostUsd, 0.105);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('openai: missing credentials fail fast and name the variables', () => {
  assert.throws(() => parseOpenAIConfig({}), /OPENAI_API_KEY.*OPENAI_MODEL/);
  assert.throws(() => createOpenAIProvider({ OPENAI_API_KEY: FAKE_KEY }), /OPENAI_MODEL/);
  assert.equal(isOpenAIConfigured({}), false);
  assert.equal(isOpenAIConfigured({ OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm' }), true);
});

test('openai: a 401 fails immediately without retries', async () => {
  let calls = 0;
  const { server, baseUrl } = await startStub((_req, res) => {
    calls++;
    jsonResponse(res, 401, { error: { message: 'Incorrect API key', type: 'invalid_request_error' } });
  });
  try {
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm',
      OPENAI_BASE_URL: `${baseUrl}/v1`, OPENAI_RETRY_DELAY_MS: '1',
    });
    await assert.rejects(() => provider.run(CASE), /OpenAI provider HTTP 401/);
    assert.equal(calls, 1, 'a 401 is not retryable');
    assert.equal(provider.getUsage().errors, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('openai: retries on 429 and honors Retry-After', async () => {
  let calls = 0;
  const { server, baseUrl } = await startStub((_req, res) => {
    calls++;
    if (calls === 1) {
      jsonResponse(res, 429, { error: { message: 'rate limited' } }, { 'Retry-After': '0' });
      return;
    }
    jsonResponse(res, 200, chatCompletion(JSON.stringify(MODEL_REPLY)));
  });
  try {
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm',
      OPENAI_BASE_URL: `${baseUrl}/v1`, OPENAI_RETRY_DELAY_MS: '1',
    });
    const obs = await provider.run(CASE);
    assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
    assert.equal(calls, 2);
    assert.equal(provider.getUsage().retries, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('openai: retries a 500, then succeeds', async () => {
  let calls = 0;
  const { server, baseUrl } = await startStub((_req, res) => {
    calls++;
    if (calls === 1) {
      jsonResponse(res, 500, { error: { message: 'boom' } });
      return;
    }
    jsonResponse(res, 200, chatCompletion(JSON.stringify(MODEL_REPLY)));
  });
  try {
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm',
      OPENAI_BASE_URL: `${baseUrl}/v1`, OPENAI_RETRY_DELAY_MS: '1',
    });
    await provider.run(CASE);
    assert.equal(calls, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('openai: timeout aborts a hanging endpoint', async () => {
  const { server, baseUrl } = await startStub((_req, _res) => {
    // Never responds: the client timeout must fire.
  });
  try {
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm',
      OPENAI_BASE_URL: `${baseUrl}/v1`,
      OPENAI_TIMEOUT_MS: '50', OPENAI_MAX_RETRIES: '0',
    });
    await assert.rejects(() => provider.run(CASE), /timed out after 50ms/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('openai: non-JSON model output fails the case, not the framework', async () => {
  const { server, baseUrl } = await startStub((_req, res) => {
    jsonResponse(res, 200, chatCompletion('I refuse to answer in JSON.'));
  });
  try {
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm',
      OPENAI_BASE_URL: `${baseUrl}/v1`, OPENAI_RETRY_DELAY_MS: '1',
    });
    await assert.rejects(() => provider.run(CASE), /non-JSON output/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('openai: a fenced ```json reply is parsed, and a fenced refusal normalizes', async () => {
  const { server, baseUrl } = await startStub((_req, res) => {
    jsonResponse(res, 200, chatCompletion('```json\n' + JSON.stringify({
      skills: [], answer: '', refused: true, refusalReason: 'unsafe request', tools: [], code: [],
    }) + '\n```'));
  });
  try {
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm',
      OPENAI_BASE_URL: `${baseUrl}/v1`, OPENAI_RETRY_DELAY_MS: '1',
    });
    const obs = await provider.run(CASE);
    assert.equal(obs.refused, true);
    assert.equal(obs.refusalReason, 'unsafe request');
    assert.deepEqual(obs.selectedSkills, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ---- Anthropic ------------------------------------------------------

test('anthropic: request shape (x-api-key, version, system field) and response normalization', async () => {
  const seen = [];
  const { server, baseUrl } = await startStub(withJsonBody((req, res, body) => {
    seen.push({ url: req.url, headers: req.headers, body });
    jsonResponse(res, 200, anthropicMessage(JSON.stringify(MODEL_REPLY)));
  }));
  try {
    const provider = createAnthropicProvider({
      ANTHROPIC_API_KEY: FAKE_KEY,
      ANTHROPIC_MODEL: 'stub-claude',
      ANTHROPIC_BASE_URL: baseUrl,
      ANTHROPIC_RETRY_DELAY_MS: '1',
    });
    const obs = await provider.run(CASE);
    assert.equal(provider.name, 'anthropic:stub-claude');
    assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
    assert.deepEqual(obs.usage, { promptTokens: 12, completionTokens: 6, totalTokens: 18 });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, '/v1/messages');
    assert.equal(seen[0].headers['x-api-key'], FAKE_KEY);
    assert.equal(seen[0].headers['anthropic-version'], '2023-06-01');
    assert.equal(seen[0].body.model, 'stub-claude');
    assert.equal(seen[0].body.max_tokens, 1024, 'max_tokens is required by the API and defaults to 1024');
    assert.equal(seen[0].body.system, MODEL_SYSTEM_PROMPT);
    assert.equal(seen[0].body.messages[0].role, 'user');
    assert.ok(!JSON.stringify(provider.meta).includes(FAKE_KEY));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('anthropic: missing credentials fail fast; 529 (overloaded) is retried', async () => {
  assert.throws(() => parseAnthropicConfig({}), /ANTHROPIC_API_KEY.*ANTHROPIC_MODEL/);
  assert.equal(isAnthropicConfigured({}), false);
  let calls = 0;
  const { server, baseUrl } = await startStub((_req, res) => {
    calls++;
    if (calls === 1) {
      jsonResponse(res, 529, { error: { type: 'overloaded_error', message: 'overloaded' } });
      return;
    }
    jsonResponse(res, 200, anthropicMessage(JSON.stringify(MODEL_REPLY)));
  });
  try {
    const provider = createAnthropicProvider({
      ANTHROPIC_API_KEY: FAKE_KEY, ANTHROPIC_MODEL: 'm',
      ANTHROPIC_BASE_URL: baseUrl, ANTHROPIC_RETRY_DELAY_MS: '1',
    });
    const obs = await provider.run(CASE);
    assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
    assert.equal(calls, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ---- Gemini (connector-helper based) ------------------------------
// No HTTP, no API key: the adapter shells out to gemini_chat.py.
// These tests stub the spawn, plus one integration test against a
// real fake helper script. No paid calls, ever.

test('gemini: config requires the helper on disk and gemini-3.5-flash only', () => {
  assert.equal(GEMINI_MODEL, 'gemini-3.5-flash');
  assert.equal(isGeminiConfigured(GEMINI_ENV()), true);
  assert.equal(isGeminiConfigured({ GEMINI_HELPER_PATH: '/nonexistent/gemini_chat.py' }), false);
  assert.throws(
    () => parseGeminiConfig({ GEMINI_HELPER_PATH: '/nonexistent/gemini_chat.py' }),
    /helper not found at \/nonexistent\/gemini_chat\.py/,
  );
  assert.throws(
    () => parseGeminiConfig(GEMINI_ENV({ GEMINI_MODEL: 'gemini-2.5-flash' })),
    /only supports model "gemini-3\.5-flash"/,
  );
  // Unset or equal is fine.
  assert.equal(parseGeminiConfig(GEMINI_ENV()).model, 'gemini-3.5-flash');
  assert.equal(parseGeminiConfig(GEMINI_ENV({ GEMINI_MODEL: 'gemini-3.5-flash' })).model, 'gemini-3.5-flash');
  assert.equal(parseGeminiConfig(GEMINI_ENV()).maxTokens, 2048);
});

test('gemini: spawns the helper with the eval args, parses the response, records the served model', async () => {
  const { impl, calls } = fakeSpawn([okResult(JSON.stringify(MODEL_REPLY))]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  const obs = await provider.run(CASE);
  assert.equal(provider.name, 'gemini:gemini-3.5-flash');
  assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
  assert.equal(obs.answer, 'Use alpha widgets for this task.');
  assert.equal(obs.refused, false);
  assert.deepEqual(obs.tools, ['load alpha-skill']);
  assert.deepEqual(obs.code, ['const a = 1;\n']);
  assert.deepEqual(obs.usage, { promptTokens: 11, completionTokens: 7, totalTokens: 18 });
  assert.equal(obs.model, 'gemini-3.5-flash', 'exact model id from the response');
  assert.equal(obs.finishReason, 'stop');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'python3');
  assert.deepEqual(calls[0].args, [
    DUMMY_HELPER, '--model', 'gemini-3.5-flash',
    '--max-tokens', '2048', '--temperature', '0', '--timeout', '300',
  ]);
  const messages = JSON.parse(calls[0].input);
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[0].content, MODEL_SYSTEM_PROMPT);
  assert.equal(messages[1].role, 'user');
  assert.equal(messages[1].content, CASE.input);
  // No key anywhere in the invocation or the metadata.
  assert.ok(!JSON.stringify(calls[0]).includes('key'));
  assert.ok(!JSON.stringify(provider.meta).includes('key'));
  assert.equal(provider.meta.model, 'gemini-3.5-flash');
  assert.equal(provider.meta.helper, 'gemini_chat.py');
  const usage = provider.getUsage();
  assert.equal(usage.requests, 1);
  assert.equal(usage.totalTokens, 18);
  assert.deepEqual(usage.servedModels, { 'gemini-3.5-flash': 1 });
  assert.equal(usage.emptyResponses, 0);
});

test('gemini: empty content with finish_reason=length is an empty response, not a crash or a retry', async () => {
  const { impl, calls } = fakeSpawn([{
    code: 0,
    stdout: JSON.stringify({
      model: 'gemini-3.5-flash',
      choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'length' }],
      usage: { prompt_tokens: 11, completion_tokens: 0, total_tokens: 11 },
    }),
    stderr: '',
  }]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  const obs = await provider.run(CASE);
  assert.deepEqual(obs.selectedSkills, []);
  assert.equal(obs.answer, '');
  assert.equal(obs.refused, false);
  assert.equal(obs.finishReason, 'length');
  assert.equal(obs.model, 'gemini-3.5-flash');
  assert.equal(calls.length, 1, 'an empty response is recorded, not retried');
  assert.equal(provider.getUsage().emptyResponses, 1);
});

test('gemini: a 429 is retried exactly once, then succeeds; a second 429 fails', async () => {
  const err429 = failResult('Gemini API error: HTTP 429: {"error": {"message": "rate limited"}}');
  const { impl, calls } = fakeSpawn([err429, okResult(JSON.stringify(MODEL_REPLY))]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  const obs = await provider.run(CASE);
  assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
  assert.equal(calls.length, 2);
  assert.equal(provider.getUsage().retries, 1);

  const failing = fakeSpawn([err429, err429]);
  const provider2 = createGeminiProvider(GEMINI_ENV(), failing.impl);
  await assert.rejects(() => provider2.run(CASE), /rate-limited \(HTTP 429\) after 1 retry/);
  assert.equal(failing.calls.length, 2, 'one retry, then stop — no loop');
});

test('gemini: a 401 stops immediately with no retry and a coordinator report', async () => {
  const { impl, calls } = fakeSpawn([failResult('Gemini API error: HTTP 401: {"error": {"message": "unauthenticated"}}')]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  await assert.rejects(
    () => provider.run(CASE),
    /credential rejected \(HTTP 401\) — STOP: do not retry\. Report this to the coordinator/,
  );
  assert.equal(calls.length, 1);
});

test('gemini: a 404 names the model as unavailable; a transport failure names the helper', async () => {
  const { impl, calls } = fakeSpawn([failResult('Gemini API error: HTTP 404: {"error": {"message": "model not found"}}')]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  await assert.rejects(() => provider.run(CASE), /model unavailable \(HTTP 404\)/);
  assert.equal(calls.length, 1);

  const transport = fakeSpawn([failResult('Gemini request failed: <urlopen error timed out>')]);
  const provider2 = createGeminiProvider(GEMINI_ENV(), transport.impl);
  await assert.rejects(() => provider2.run(CASE), /Gemini helper failed \(exit 1\): Gemini request failed/);
  assert.equal(transport.calls.length, 1, 'a failed call is never retried — it may have been billed');
});

test('gemini: timeout and spawn failure are clear errors, never retried', async () => {
  const timeoutErr = new Error('helper timed out after 300000ms');
  timeoutErr.timedOut = true;
  const { impl, calls } = fakeSpawn([timeoutErr]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  await assert.rejects(() => provider.run(CASE), /timed out after 300000ms.*may still have been billed/);
  assert.equal(calls.length, 1);

  const spawnErr = new Error('failed to start python3: ENOENT');
  spawnErr.spawnFailed = true;
  const failing = fakeSpawn([spawnErr]);
  const provider2 = createGeminiProvider(GEMINI_ENV(), failing.impl);
  await assert.rejects(() => provider2.run(CASE), /Gemini helper failed to start/);
});

test('gemini: non-JSON helper output fails the case with the output excerpt', async () => {
  const { impl } = fakeSpawn([{ code: 0, stdout: 'not json at all', stderr: '' }]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  await assert.rejects(() => provider.run(CASE), /returned non-JSON output: not json at all/);
});

test('gemini: non-JSON model content fails the case like the other adapters', async () => {
  const { impl } = fakeSpawn([okResult('I refuse to answer in JSON.')]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  await assert.rejects(() => provider.run(CASE), /non-JSON output/);
});

test('gemini: non-JSON model content error carries usage, finish reason, and served model', async () => {
  const { impl } = fakeSpawn([okResult('I refuse to answer in JSON.')]);
  const provider = createGeminiProvider(GEMINI_ENV(), impl);
  let caught;
  try {
    await provider.run(CASE);
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, 'the case must fail');
  assert.match(caught.message, /non-JSON output/);
  // Day 1's 3 format failures recorded no usage and no finish
  // reason, so truncation was indistinguishable from the model
  // choosing prose. The call context must survive the throw.
  assert.deepEqual(caught.usage, { promptTokens: 11, completionTokens: 7, totalTokens: 18 });
  assert.equal(caught.finishReason, 'stop');
  assert.equal(caught.model, 'gemini-3.5-flash');
});

test('gemini: real spawn path against a fake helper script (no paid call)', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'skillforge-gemini-spawn-test-'));
  try {
    const script = path.join(dir, 'gemini_chat.py');
    const seenFile = path.join(dir, 'seen.json');
    // A fake helper: records argv + stdin, prints a canned response.
    // It never touches the network or any credential.
    writeFileSync(script, [
      'import json, sys, os',
      'messages = json.load(sys.stdin)',
      'seen = {"argv": sys.argv[1:], "messages": messages}',
      `open(${JSON.stringify(seenFile)}, "w").write(json.dumps(seen))`,
      'print(json.dumps({"model": "gemini-3.5-flash",',
      '  "choices": [{"message": {"role": "assistant", "content": json.dumps(',
      '    {"skills": ["alpha-skill"], "answer": "Use alpha widgets.", "refused": False,',
      '     "refusalReason": None, "tools": [], "code": []})}, "finish_reason": "stop"}],',
      '  "usage": {"prompt_tokens": 11, "completion_tokens": 7, "total_tokens": 18}}))',
      '',
    ].join('\n'));
    const provider = createGeminiProvider({
      GEMINI_HELPER_PATH: script,
      GEMINI_RETRY_DELAY_MS: '1',
    });
    const obs = await provider.run(CASE);
    assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
    assert.equal(obs.model, 'gemini-3.5-flash');
    const seen = JSON.parse(readFileSync(seenFile, 'utf8'));
    assert.deepEqual(seen.argv, [
      '--model', 'gemini-3.5-flash',
      '--max-tokens', '2048', '--temperature', '0', '--timeout', '300',
    ]);
    assert.equal(seen.messages[0].role, 'system');
    assert.equal(seen.messages[1].content, CASE.input);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- Local ----------------------------------------------------------

test('local: no key required, no Authorization header sent, custom URL honored', async () => {
  const seen = [];
  const { server, baseUrl } = await startStub(withJsonBody((req, res, body) => {
    seen.push({ url: req.url, auth: req.headers.authorization, body });
    jsonResponse(res, 200, chatCompletion(JSON.stringify(MODEL_REPLY)));
  }));
  try {
    const provider = createLocalProvider({
      EVAL_LOCAL_URL: `${baseUrl}/custom/chat/completions`,
      EVAL_LOCAL_MODEL: 'stub-local',
      EVAL_LOCAL_RETRY_DELAY_MS: '1',
    });
    const obs = await provider.run(CASE);
    assert.equal(provider.name, 'local:stub-local');
    assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
    assert.equal(seen[0].url, '/custom/chat/completions');
    assert.equal(seen[0].auth, undefined, 'no key configured means no Authorization header');
    assert.equal(seen[0].body.model, 'stub-local');
    // Local inference has no per-token price: no cost estimate, ever.
    assert.equal(provider.getUsage().estimatedCostUsd, null);
    assert.equal(provider.getUsage().totalTokens, 15);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('local: an optional key is sent as Bearer; missing config fails fast', async () => {
  assert.throws(() => parseLocalConfig({}), /EVAL_LOCAL_URL.*EVAL_LOCAL_MODEL/);
  assert.equal(isLocalConfigured({}), false);
  const seen = [];
  const { server, baseUrl } = await startStub(withJsonBody((req, res) => {
    seen.push(req.headers.authorization);
    jsonResponse(res, 200, chatCompletion(JSON.stringify(MODEL_REPLY)));
  }));
  try {
    const provider = createLocalProvider({
      EVAL_LOCAL_URL: `${baseUrl}/v1/chat/completions`,
      EVAL_LOCAL_MODEL: 'm',
      EVAL_LOCAL_API_KEY: FAKE_KEY,
      EVAL_LOCAL_RETRY_DELAY_MS: '1',
    });
    await provider.run(CASE);
    assert.equal(seen[0], `Bearer ${FAKE_KEY}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ---- Registry -------------------------------------------------------

test('registry: known providers resolve; unknown names list the known providers', async () => {
  const { server, baseUrl } = await startStub((_req, res) => {
    jsonResponse(res, 200, chatCompletion(JSON.stringify(MODEL_REPLY)));
  });
  try {
    const provider = await resolveProvider('openai', {
      OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'stub-gpt',
      OPENAI_BASE_URL: `${baseUrl}/v1`, OPENAI_RETRY_DELAY_MS: '1',
    });
    assert.equal(provider.name, 'openai:stub-gpt');
    const obs = await provider.run(CASE);
    assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  await assert.rejects(
    () => resolveProvider('no-such-provider', {}),
    /Unknown provider "no-such-provider".*openai.*anthropic.*gemini.*local/s,
  );
  assert.equal(getProviderSpec('no-such-provider'), null);
  assert.ok(getProviderSpec('openai'));
  assert.deepEqual(KNOWN_PROVIDERS, ['mock', 'model', 'openai', 'anthropic', 'gemini', 'local']);
});

test('registry: an unconfigured provider fails loudly and names the missing variables', async () => {
  await assert.rejects(
    () => resolveProvider('anthropic', {}),
    /not configured: missing ANTHROPIC_API_KEY, ANTHROPIC_MODEL/,
  );
  // Gemini has no key to miss: unconfigured means the helper is absent.
  await assert.rejects(
    () => resolveProvider('gemini', { GEMINI_HELPER_PATH: '/nonexistent/gemini_chat.py' }),
    /not configured: missing GEMINI_HELPER_PATH \(helper not found at \/nonexistent\/gemini_chat\.py\)/,
  );
});

test('registry: gemini resolves to the helper adapter when the helper exists', async () => {
  const provider = await resolveProvider('gemini', GEMINI_ENV());
  assert.equal(provider.name, 'gemini:gemini-3.5-flash');
  assert.equal(provider.meta.provider, 'gemini');
  assert.equal(provider.meta.helper, 'gemini_chat.py');
});

test('registry: listProviders reports configured vs unconfigured without secret values', () => {
  const env = {
    OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'stub-gpt',
    // Gemini is forced unconfigured: its configured-ness depends on
    // the helper file on disk, which exists on this machine.
    GEMINI_HELPER_PATH: '/nonexistent/gemini_chat.py',
    // Everything else unconfigured.
  };
  const list = listProviders(env);
  assert.equal(list.length, 6);
  const byId = Object.fromEntries(list.map((p) => [p.id, p]));
  assert.equal(byId.mock.configured, true, 'mock needs no configuration');
  assert.equal(byId.openai.configured, true);
  assert.deepEqual(byId.openai.missing, []);
  assert.equal(byId.anthropic.configured, false);
  assert.deepEqual(byId.anthropic.missing, ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']);
  assert.equal(byId.gemini.configured, false);
  assert.deepEqual(byId.gemini.missing, ['GEMINI_HELPER_PATH (helper not found at /nonexistent/gemini_chat.py)']);
  assert.equal(byId.local.configured, false);
  assert.equal(byId.model.configured, false);
  assert.ok(!JSON.stringify(list).includes(FAKE_KEY), 'status output must never contain a key');
  // An empty environment (plus a missing helper) configures nothing but the mock.
  const empty = listProviders({ GEMINI_HELPER_PATH: '/nonexistent/gemini_chat.py' });
  assert.deepEqual(empty.filter((p) => p.configured).map((p) => p.id), ['mock']);
  // With a helper file present, Gemini reports configured.
  const withHelper = listProviders(GEMINI_ENV());
  assert.equal(withHelper.find((p) => p.id === 'gemini').configured, true);
});

test('registry: mock resolves with no configuration at all', async () => {
  const provider = await resolveProvider('mock', {});
  assert.equal(provider.name, 'mock');
  assert.equal(provider.meta.kind, 'mock');
  assert.equal(provider.getUsage(), null);
});
