// anthropic.mjs — Anthropic Messages API adapter.
//
// Conforms to the provider interface in evals/runners/providers.mjs:
// { name, meta, getUsage(), run(evalCase) } returning the normalized
// observation. Talks to the Messages API (POST /v1/messages), not the
// OpenAI-compatible shape: the system prompt is a top-level field,
// auth is an x-api-key header, and max_tokens is required by the API
// (default 1024 when ANTHROPIC_MAX_TOKENS is unset).
//
// Configuration (environment variables only — never hardcoded):
//   ANTHROPIC_API_KEY            (required) API key (x-api-key header)
//   ANTHROPIC_MODEL              (required) model id, e.g. claude-sonnet-4-5
//   ANTHROPIC_BASE_URL           (optional, default https://api.anthropic.com)
//   ANTHROPIC_VERSION            (optional, default 2023-06-01) anthropic-version header
//   ANTHROPIC_TIMEOUT_MS         (optional, default 60000)
//   ANTHROPIC_MAX_RETRIES        (optional, default 2; 0 disables retries)
//   ANTHROPIC_RETRY_DELAY_MS     (optional, default 1000; doubles per attempt, capped at 30s)
//   ANTHROPIC_MAX_TOKENS         (optional, default 1024) max_tokens sent per request
//   ANTHROPIC_PRICE_INPUT_PER_1K / ANTHROPIC_PRICE_OUTPUT_PER_1K
//                                (optional) USD per 1k tokens; when both
//                                are set, usage reports an estimated cost
//
// The key is never logged, never written to a report, and never
// included in provider metadata; `meta` carries the endpoint host
// (not the full URL) and the exact model id.

import {
  DEFAULT_TIMEOUT_MS, DEFAULT_MAX_RETRIES, DEFAULT_RETRY_DELAY_MS,
  MODEL_SYSTEM_PROMPT,
  buildUserMessage,
  parsePositiveInt, parseNonNegativeInt, parseNonNegativeNumber,
  missingEnvVars, warnPlaintextHttp,
  createUsageTracker, postJsonWithRetry,
  extractJsonObject, normalizeObservation,
} from './shared.mjs';

export const PROVIDER_ID = 'anthropic';
export const DISPLAY_NAME = 'Anthropic';
export const DEFAULT_BASE_URL = 'https://api.anthropic.com';
export const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';
export const DEFAULT_MAX_TOKENS = 1024;
export const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL'];
export const OPTIONAL_ENV = [
  'ANTHROPIC_BASE_URL', 'ANTHROPIC_VERSION', 'ANTHROPIC_TIMEOUT_MS',
  'ANTHROPIC_MAX_RETRIES', 'ANTHROPIC_RETRY_DELAY_MS',
  'ANTHROPIC_MAX_TOKENS',
  'ANTHROPIC_PRICE_INPUT_PER_1K', 'ANTHROPIC_PRICE_OUTPUT_PER_1K',
];

export function missingConfig(env = process.env) {
  return missingEnvVars(env, REQUIRED_ENV);
}

export function isAnthropicConfigured(env = process.env) {
  return missingConfig(env).length === 0;
}

export function parseAnthropicConfig(env = process.env) {
  const missing = missingConfig(env);
  if (missing.length > 0) {
    throw new Error(
      `Anthropic provider needs ${missing.join(', ')}. Set them in the environment — ` +
      'no provider is required, and an unconfigured provider simply reports as unavailable.',
    );
  }
  const baseUrl = (env.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  let url;
  try {
    url = new URL(`${baseUrl}/v1/messages`).toString();
  } catch {
    throw new Error(`ANTHROPIC_BASE_URL is not a valid URL: "${baseUrl}"`);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`ANTHROPIC_BASE_URL must use http(s): "${baseUrl}"`);
  }
  warnPlaintextHttp(url, 'Anthropic provider');
  return {
    url,
    key: env.ANTHROPIC_API_KEY.trim(),
    model: env.ANTHROPIC_MODEL.trim(),
    version: (env.ANTHROPIC_VERSION || DEFAULT_ANTHROPIC_VERSION).trim(),
    timeoutMs: parsePositiveInt(env.ANTHROPIC_TIMEOUT_MS, 'ANTHROPIC_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
    maxRetries: parseNonNegativeInt(env.ANTHROPIC_MAX_RETRIES, 'ANTHROPIC_MAX_RETRIES', DEFAULT_MAX_RETRIES),
    retryDelayMs: parseNonNegativeInt(env.ANTHROPIC_RETRY_DELAY_MS, 'ANTHROPIC_RETRY_DELAY_MS', DEFAULT_RETRY_DELAY_MS),
    maxTokens: parsePositiveInt(env.ANTHROPIC_MAX_TOKENS, 'ANTHROPIC_MAX_TOKENS', DEFAULT_MAX_TOKENS),
    inputPricePer1k: parseNonNegativeNumber(env.ANTHROPIC_PRICE_INPUT_PER_1K, 'ANTHROPIC_PRICE_INPUT_PER_1K', undefined),
    outputPricePer1k: parseNonNegativeNumber(env.ANTHROPIC_PRICE_OUTPUT_PER_1K, 'ANTHROPIC_PRICE_OUTPUT_PER_1K', undefined),
  };
}

// `env` and `fetchImpl` are injectable so tests can run against a
// local stub endpoint with fake credentials and no network.
export function createAnthropicProvider(env = process.env, fetchImpl = globalThis.fetch) {
  const config = parseAnthropicConfig(env);
  const usage = createUsageTracker(config);

  return {
    name: `anthropic:${config.model}`,
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
        max_tokens: config.maxTokens,
        temperature: 0,
        system: MODEL_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: buildUserMessage(evalCase) },
        ],
      };

      const data = await postJsonWithRetry({
        fetchImpl,
        url: config.url,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.key,
          'anthropic-version': config.version,
        },
        body,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        retryDelayMs: config.retryDelayMs,
        label: 'Anthropic provider',
        usage,
      });
      // The Messages API returns content blocks; the model's JSON
      // reply is the concatenation of the text blocks.
      const blocks = Array.isArray(data.content) ? data.content : [];
      const text = blocks
        .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('')
        .trim();
      const parsed = extractJsonObject(text, 'Anthropic provider');
      const observation = normalizeObservation(parsed);
      const u = data.usage;
      if (u && typeof u === 'object') {
        const caseUsage = {
          promptTokens: Number(u.input_tokens) || 0,
          completionTokens: Number(u.output_tokens) || 0,
          totalTokens: 0,
        };
        caseUsage.totalTokens = caseUsage.promptTokens + caseUsage.completionTokens;
        usage.recordTokens(caseUsage);
        observation.usage = caseUsage;
      }
      return observation;
    },
  };
}
