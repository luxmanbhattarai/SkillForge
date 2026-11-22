// gemini.mjs — Gemini adapter (connector-helper based).
//
// Conforms to the provider interface in evals/runners/providers.mjs:
// { name, meta, getUsage(), run(evalCase) } returning the normalized
// observation. Unlike the other adapters, this one makes NO HTTP
// call and takes NO API key: it shells out to the custom.gemini
// connector helper (bin/gemini_chat.py), which sends one chat
// completion per invocation through the stored Secure Vault
// credential (hsurr: surrogate exchange — the real key never
// appears in this process's arguments, environment, or logs).
//
// HARD RULES (from the connector doc — do not weaken them):
// - NEVER read the raw key into an env var, file, argument, or
//   log. NEVER pass a key to anything. The helper handles auth.
// - Model is gemini-3.5-flash ONLY. gemini-2.5-flash returns HTTP
//   404 for this key. A GEMINI_MODEL set to anything else is a
//   configuration error, not an override.
//   (Switched from gemini-3.8-flash on 2026-11-22 per owner
//   instruction: 3.5-flash has the higher per-minute limit
//   (10-15 RPM vs 5 RPM for 3.8-flash) on the same 20 req/day
//   free-tier quota. Probe verified 2026-11-22: 3.5-flash
//   answered with finish stop.)
// - max_tokens defaults to 2048 for eval cases. Thinking-model
//   quirk (verified): a small budget ends with finish_reason=length
//   and EMPTY content. Empty content is recorded as an empty
//   response with its finish reason — never a crash, never a
//   silent retry loop.
// - 429: back off and retry ONCE after a pause. 401/403: STOP
//   immediately, do not retry, report it to the coordinator.
// - A timed-out or failed call is never retried (except the single
//   429 retry): a completion may have been billed even when the
//   response was lost.
//
// Configuration (environment variables only — no key anywhere):
//   GEMINI_HELPER_PATH          (optional) path to gemini_chat.py;
//                              default ~/workspace/custom-connectors/
//                              custom.gemini/bin/gemini_chat.py
//   GEMINI_PYTHON              (optional, default python3) python executable
//   GEMINI_MODEL               (optional) must be unset or gemini-3.5-flash
//   GEMINI_TIMEOUT_MS          (optional, default 300000) per-attempt
//                              timeout; the child is killed (SIGKILL)
//                              when it fires. 300s, not the 60s the
//                              other adapters use: gemini-3.5-flash
//                              reasons internally before replying —
//                              the first verification call timed out
//                              at 60s, and the second took ~164s for
//                              a tiny prompt. A short timeout would
//                              fail eval cases that are merely slow.
//   GEMINI_MAX_TOKENS          (optional, default 2048) max_tokens per call
//   GEMINI_RETRY_DELAY_MS      (optional, default 5000) pause before the
//                              single 429 retry
//
// Per-call usage (prompt/completion/total tokens) is recorded from
// the helper's response, and the EXACT model id from each response
// (`model` field) is recorded per case (observation.model) and
// aggregated in getUsage().servedModels. The requested model and
// the served model can differ — a run must record what answered,
// not just what was asked for.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import {
  MODEL_SYSTEM_PROMPT,
  buildUserMessage,
  parsePositiveInt, parseNonNegativeInt,
  sleep,
  createUsageTracker,
  extractJsonObject, normalizeObservation,
} from './shared.mjs';

export const PROVIDER_ID = 'gemini';
export const DISPLAY_NAME = 'Gemini';
export const GEMINI_MODEL = 'gemini-3.5-flash';
export const DEFAULT_HELPER_PATH = join(
  homedir(), 'workspace', 'custom-connectors', 'custom.gemini', 'bin', 'gemini_chat.py',
);
export const DEFAULT_TIMEOUT_MS = 300_000;
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_RETRY_DELAY_MS = 5000;
// A 429 is retried exactly once. Not configurable: the connector
// doc says "back off and retry once", and a retry loop on a billed
// API is a budget hazard.
export const MAX_RETRIES_429 = 1;
export const REQUIRED_ENV = [];
export const OPTIONAL_ENV = [
  'GEMINI_HELPER_PATH', 'GEMINI_PYTHON', 'GEMINI_MODEL',
  'GEMINI_TIMEOUT_MS', 'GEMINI_MAX_TOKENS', 'GEMINI_RETRY_DELAY_MS',
];

export function resolveHelperPath(env = process.env) {
  return (env.GEMINI_HELPER_PATH || '').trim() || DEFAULT_HELPER_PATH;
}

// "Configured" for Gemini means the helper exists on disk. There is
// no key to check — auth lives in the Secure Vault behind the
// helper, and this adapter must never touch it.
export function missingConfig(env = process.env) {
  const helperPath = resolveHelperPath(env);
  if (!existsSync(helperPath)) {
    return [`GEMINI_HELPER_PATH (helper not found at ${helperPath})`];
  }
  return [];
}

export function isGeminiConfigured(env = process.env) {
  return missingConfig(env).length === 0;
}

export function parseGeminiConfig(env = process.env) {
  const missing = missingConfig(env);
  if (missing.length > 0) {
    throw new Error(
      `Gemini provider needs ${missing.join(', ')}. The adapter shells out to the ` +
      'custom.gemini connector helper — no API key is configured here, ever.',
    );
  }
  const model = (env.GEMINI_MODEL || '').trim();
  if (model && model !== GEMINI_MODEL) {
    throw new Error(
      `Gemini provider only supports model "${GEMINI_MODEL}" (got "${model}"). ` +
      'gemini-2.5-flash returns HTTP 404 for this key; see the custom.gemini connector doc.',
    );
  }
  return {
    helperPath: resolveHelperPath(env),
    python: (env.GEMINI_PYTHON || '').trim() || 'python3',
    model: GEMINI_MODEL,
    timeoutMs: parsePositiveInt(env.GEMINI_TIMEOUT_MS, 'GEMINI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
    maxTokens: parsePositiveInt(env.GEMINI_MAX_TOKENS, 'GEMINI_MAX_TOKENS', DEFAULT_MAX_TOKENS),
    retryDelayMs: parseNonNegativeInt(env.GEMINI_RETRY_DELAY_MS, 'GEMINI_RETRY_DELAY_MS', DEFAULT_RETRY_DELAY_MS),
  };
}

// Run the helper once: spawn python3 with the eval arguments, feed
// the messages array on stdin, collect stdout/stderr. Returns
// { code, stdout, stderr }. Throws on timeout (err.timedOut) or
// spawn failure (err.spawnFailed). The child is killed (SIGKILL)
// when the timeout fires — the helper is stateless, so there is
// nothing to clean up.
export async function spawnHelper({ command, args, input, timeoutMs }) {
  return new Promise((resolvePromise, reject) => {
    let child;
    try {
      child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      const err = new Error(`failed to start ${command}: ${e.message}`);
      err.spawnFailed = true;
      reject(err);
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      const err = new Error(`helper timed out after ${timeoutMs}ms`);
      err.timedOut = true;
      reject(err);
    }, timeoutMs);
    // The timer must not keep the process alive on its own.
    timer.unref?.();
    child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const err = new Error(`failed to start ${command}: ${e.message}`);
      err.spawnFailed = true;
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
    child.stdin.on('error', () => {
      // The child exited before reading stdin (e.g. it failed fast
      // on bad arguments): the close handler reports the exit code.
    });
    child.stdin.end(input);
  });
}

// Classify a failed helper invocation from its stderr. The helper
// prints "Gemini API error: HTTP <code>: <body>" for API errors and
// "Gemini request failed: <detail>" for transport errors.
function classifyHelperError(stderr) {
  const text = stderr || '';
  if (/HTTP 429\b/.test(text)) return { kind: 'rate-limited', status: 429 };
  if (/HTTP 401\b/.test(text) || /HTTP 403\b/.test(text)) {
    const status = /HTTP 401\b/.test(text) ? 401 : 403;
    return { kind: 'auth', status };
  }
  if (/HTTP 404\b/.test(text)) return { kind: 'not-found', status: 404 };
  return { kind: 'failed', status: null };
}

// `env` and `spawnImpl` are injectable so tests can run against a
// stub helper with no network and no paid calls. The default
// spawnImpl is the real child-process spawn above.
export function createGeminiProvider(env = process.env, spawnImpl = spawnHelper) {
  const config = parseGeminiConfig(env);
  const usage = createUsageTracker(config);
  const servedModels = new Map();
  let emptyResponses = 0;

  return {
    name: `gemini:${config.model}`,
    // Metadata is safe to write into reports: no key (there is
    // none to leak — auth lives behind the helper), no full helper
    // path (basename only), and the exact requested model id.
    meta: {
      kind: 'model',
      provider: PROVIDER_ID,
      model: config.model,
      endpoint: 'generativelanguage.googleapis.com',
      helper: basename(config.helperPath),
      timeoutMs: config.timeoutMs,
      maxRetries: MAX_RETRIES_429,
    },
    getUsage() {
      return {
        ...usage.getUsage(),
        servedModels: Object.fromEntries(servedModels),
        emptyResponses,
      };
    },
    async run(evalCase) {
      usage.recordRequest();
      const messages = [
        { role: 'system', content: MODEL_SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(evalCase) },
      ];
      const args = [
        config.helperPath,
        '--model', config.model,
        '--max-tokens', String(config.maxTokens),
        '--temperature', '0',
        // The helper's own request timeout, aligned with ours (it
        // takes whole seconds; never below 1).
        '--timeout', String(Math.max(1, Math.ceil(config.timeoutMs / 1000))),
      ];

      for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
        usage.recordAttempt();
        let result;
        try {
          result = await spawnImpl({
            command: config.python,
            args,
            input: JSON.stringify(messages),
            timeoutMs: config.timeoutMs,
          });
        } catch (e) {
          usage.recordError();
          if (e.timedOut) {
            // Never retried: a completion may have been billed even
            // though the response was lost.
            throw new Error(`Gemini provider timed out after ${config.timeoutMs}ms (helper killed; the call may still have been billed — check before retrying)`);
          }
          throw new Error(`Gemini helper failed to start: ${e.message}`);
        }
        if (result.code !== 0) {
          const failure = classifyHelperError(result.stderr);
          if (failure.kind === 'rate-limited' && attempt < MAX_RETRIES_429) {
            usage.recordRetry();
            await sleep(config.retryDelayMs);
            continue;
          }
          usage.recordError();
          const detail = (result.stderr || '').trim().slice(0, 500);
          if (failure.kind === 'rate-limited') {
            throw new Error(`Gemini provider rate-limited (HTTP 429) after ${MAX_RETRIES_429} retry — back off and re-run later${detail ? `: ${detail}` : ''}`);
          }
          if (failure.kind === 'auth') {
            throw new Error(
              `Gemini provider credential rejected (HTTP ${failure.status}) — STOP: do not retry. ` +
              'Report this to the coordinator; the connector doc says to confirm the helper attached the ' +
              `credential before considering a reconnect.${detail ? ` Helper said: ${detail}` : ''}`,
            );
          }
          if (failure.kind === 'not-found') {
            throw new Error(
              `Gemini provider model unavailable (HTTP 404): ${config.model} is not available for this key. ` +
              `The error names the replacement — use it.${detail ? ` Helper said: ${detail}` : ''}`,
            );
          }
          throw new Error(
            `Gemini helper failed (exit ${result.code})${detail ? `: ${detail}` : ''}`,
          );
        }
        let data;
        try {
          data = JSON.parse(result.stdout);
        } catch {
          usage.recordError();
          throw new Error(`Gemini helper returned non-JSON output: ${result.stdout.slice(0, 200)}`);
        }
        const choice = data.choices?.[0] || {};
        const text = (choice.message?.content || '').trim();
        const finishReason = choice.finish_reason || null;
        const servedModel = typeof data.model === 'string' ? data.model : null;
        if (servedModel) servedModels.set(servedModel, (servedModels.get(servedModel) || 0) + 1);
        let caseUsage = null;
        const u = data.usage;
        if (u && typeof u === 'object') {
          caseUsage = {
            promptTokens: Number(u.prompt_tokens) || 0,
            completionTokens: Number(u.completion_tokens) || 0,
            totalTokens: Number(u.total_tokens) || 0,
          };
          if (!caseUsage.totalTokens) {
            caseUsage.totalTokens = caseUsage.promptTokens + caseUsage.completionTokens;
          }
          usage.recordTokens(caseUsage);
        }
        // Thinking-model quirk: a small max_tokens budget ends with
        // finish_reason=length and EMPTY content. That is a
        // recorded empty response, not a crash and not a retry:
        // retrying the same prompt would likely hit the same wall
        // and burn budget. The empty answer scores as not having
        // done the thing, and finishReason says why.
        if (text === '') {
          emptyResponses++;
          return {
            selectedSkills: [],
            answer: '',
            refused: false,
            refusalReason: null,
            tools: [],
            code: [],
            ...(caseUsage ? { usage: caseUsage } : {}),
            ...(servedModel ? { model: servedModel } : {}),
            ...(finishReason ? { finishReason } : {}),
          };
        }
        let parsed;
        try {
          parsed = extractJsonObject(text, 'Gemini provider');
        } catch (e) {
          // The call succeeded but the reply was not JSON: keep the
          // call context on the error so the runner can record it —
          // without it, a format failure shows no usage and no finish
          // reason, and truncation (finish_reason "length") is
          // indistinguishable from the model choosing prose. Day 1
          // had 3 such cases with no context at all.
          if (caseUsage) e.usage = caseUsage;
          if (finishReason) e.finishReason = finishReason;
          if (servedModel) e.model = servedModel;
          throw e;
        }
        const observation = normalizeObservation(parsed);
        if (caseUsage) observation.usage = caseUsage;
        if (servedModel) observation.model = servedModel;
        if (finishReason) observation.finishReason = finishReason;
        return observation;
      }
      // Unreachable: the loop always returns or throws.
      throw new Error('Gemini provider: no attempt completed');
    },
  };
}
