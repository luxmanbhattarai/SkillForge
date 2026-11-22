// local.mjs — OpenAI-compatible local inference adapter.
//
// Conforms to the provider interface in evals/runners/providers.mjs:
// { name, meta, getUsage(), run(evalCase) } returning the normalized
// observation. Talks to any local server that speaks the
// OpenAI-compatible chat-completions shape (Ollama, vLLM, LM Studio,
// llama.cpp server, text-generation-webui) — the endpoint is whatever
// the user runs, so there is no default URL and no default model.
//
// Differences from the cloud adapters:
// - No API key is required: most local servers need none. When the
//   server does want one, set EVAL_LOCAL_API_KEY and it is sent as a
//   Bearer token; when unset, no Authorization header is sent at all.
// - No cost is ever estimated: local inference has no per-token
//   price, so estimatedCostUsd stays null (usage still tracks token
//   counts when the server reports them).
//
// Configuration (environment variables only — never hardcoded):
//   EVAL_LOCAL_URL               (required) full chat-completions
//                                endpoint, e.g.
//                                http://localhost:11434/v1/chat/completions
//   EVAL_LOCAL_MODEL             (required) model id the server should
//                                run, e.g. llama-3.3-70b-instruct
//   EVAL_LOCAL_API_KEY           (optional) Bearer token, when the server wants one
//   EVAL_LOCAL_TIMEOUT_MS        (optional, default 60000)
//   EVAL_LOCAL_MAX_RETRIES       (optional, default 2; 0 disables retries)
//   EVAL_LOCAL_RETRY_DELAY_MS    (optional, default 1000; doubles per attempt, capped at 30s)
//   EVAL_LOCAL_MAX_TOKENS        (optional) max_tokens sent per request
//
// The key (when set) is never logged, never written to a report, and
// never included in provider metadata; `meta` carries the endpoint
// host (not the full URL) and the exact model id.

import {
  DEFAULT_TIMEOUT_MS, DEFAULT_MAX_RETRIES, DEFAULT_RETRY_DELAY_MS,
  MODEL_SYSTEM_PROMPT,
  parsePositiveInt, parseNonNegativeInt,
  missingEnvVars, warnPlaintextHttp,
  createUsageTracker, postJsonWithRetry,
  extractJsonObject, normalizeObservation,
} from './shared.mjs';

export const PROVIDER_ID = 'local';
export const DISPLAY_NAME = 'Local (OpenAI-compatible)';
export const REQUIRED_ENV = ['EVAL_LOCAL_URL', 'EVAL_LOCAL_MODEL'];
export const OPTIONAL_ENV = [
  'EVAL_LOCAL_API_KEY', 'EVAL_LOCAL_TIMEOUT_MS', 'EVAL_LOCAL_MAX_RETRIES',
  'EVAL_LOCAL_RETRY_DELAY_MS', 'EVAL_LOCAL_MAX_TOKENS',
];

export function missingConfig(env = process.env) {
  return missingEnvVars(env, REQUIRED_ENV);
}

export function isLocalConfigured(env = process.env) {
  return missingConfig(env).length === 0;
}

export function parseLocalConfig(env = process.env) {
  const missing = missingConfig(env);
  if (missing.length > 0) {
    throw new Error(
      `Local provider needs ${missing.join(', ')}. Set them in the environment — ` +
      'no provider is required, and an unconfigured provider simply reports as unavailable.',
    );
  }
  const url = env.EVAL_LOCAL_URL.trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`EVAL_LOCAL_URL is not a valid URL: "${url}"`);
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`EVAL_LOCAL_URL must use http(s): "${url}"`);
  }
  // Only warn about plaintext when a key is actually configured:
  // with no key there is nothing to intercept.
  if ((env.EVAL_LOCAL_API_KEY || '').trim()) warnPlaintextHttp(url, 'Local provider');
  return {
    url,
    key: (env.EVAL_LOCAL_API_KEY || '').trim() || null,
    model: env.EVAL_LOCAL_MODEL.trim(),
    timeoutMs: parsePositiveInt(env.EVAL_LOCAL_TIMEOUT_MS, 'EVAL_LOCAL_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
    maxRetries: parseNonNegativeInt(env.EVAL_LOCAL_MAX_RETRIES, 'EVAL_LOCAL_MAX_RETRIES', DEFAULT_MAX_RETRIES),
    retryDelayMs: parseNonNegativeInt(env.EVAL_LOCAL_RETRY_DELAY_MS, 'EVAL_LOCAL_RETRY_DELAY_MS', DEFAULT_RETRY_DELAY_MS),
    maxTokens: parsePositiveInt(env.EVAL_LOCAL_MAX_TOKENS, 'EVAL_LOCAL_MAX_TOKENS', undefined),
  };
}

// `env` and `fetchImpl` are injectable so tests can run against a
// local stub endpoint with fake credentials and no network.
export function createLocalProvider(env = process.env, fetchImpl = globalThis.fetch) {
  const config = parseLocalConfig(env);
  const usage = createUsageTracker(config);

  return {
    name: `local:${config.model}`,
    // Metadata is safe to write into reports: no key, no full URL.
    meta: {
      kind: 'model',
      provider: PROVIDER_ID,
      model: config.model,
      endpoint: new URL(config.url).host,
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
    },
    getUsage() { return usage.getUsage(); },
    async run(evalCase) {
      usage.recordRequest();
      const body = {
        model: config.model,
        temperature: 0,
        messages: [
          { role: 'system', content: MODEL_SYSTEM_PROMPT },
          { role: 'user', content: evalCase.input },
        ],
      };
      if (config.maxTokens !== undefined) body.max_tokens = config.maxTokens;
      const headers = { 'Content-Type': 'application/json' };
      if (config.key) headers.Authorization = `Bearer ${config.key}`;

      const data = await postJsonWithRetry({
        fetchImpl,
        url: config.url,
        headers,
        body,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        retryDelayMs: config.retryDelayMs,
        label: 'Local provider',
        usage,
      });
      const text = (data.choices?.[0]?.message?.content || '').trim();
      const parsed = extractJsonObject(text, 'Local provider');
      const observation = normalizeObservation(parsed);
      const u = data.usage;
      if (u && typeof u === 'object') {
        const caseUsage = {
          promptTokens: Number(u.prompt_tokens) || 0,
          completionTokens: Number(u.completion_tokens) || 0,
          totalTokens: Number(u.total_tokens) || 0,
        };
        if (!caseUsage.totalTokens) {
          caseUsage.totalTokens = caseUsage.promptTokens + caseUsage.completionTokens;
        }
        usage.recordTokens(caseUsage);
        observation.usage = caseUsage;
      }
      return observation;
    },
  };
}
