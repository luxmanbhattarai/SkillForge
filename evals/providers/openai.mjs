// openai.mjs — OpenAI chat-completions adapter.
//
// Conforms to the provider interface in evals/runners/providers.mjs:
// { name, meta, getUsage(), run(evalCase) } returning the normalized
// observation. Any OpenAI-compatible endpoint works by setting
// OPENAI_BASE_URL (Azure OpenAI and compatible proxies included,
// as long as they speak the chat-completions shape and Bearer auth).
//
// Configuration (environment variables only — never hardcoded):
//   OPENAI_API_KEY               (required) API key (Bearer token)
//   OPENAI_MODEL                 (required) model id, e.g. gpt-5-mini
//   OPENAI_BASE_URL              (optional, default https://api.openai.com/v1)
//   OPENAI_TIMEOUT_MS            (optional, default 60000)
//   OPENAI_MAX_RETRIES           (optional, default 2; 0 disables retries)
//   OPENAI_RETRY_DELAY_MS        (optional, default 1000; doubles per attempt, capped at 30s)
//   OPENAI_MAX_TOKENS            (optional) max_tokens sent per request
//   OPENAI_PRICE_INPUT_PER_1K / OPENAI_PRICE_OUTPUT_PER_1K
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

export const PROVIDER_ID = 'openai';
export const DISPLAY_NAME = 'OpenAI';
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const REQUIRED_ENV = ['OPENAI_API_KEY', 'OPENAI_MODEL'];
export const OPTIONAL_ENV = [
  'OPENAI_BASE_URL', 'OPENAI_TIMEOUT_MS', 'OPENAI_MAX_RETRIES',
  'OPENAI_RETRY_DELAY_MS', 'OPENAI_MAX_TOKENS',
  'OPENAI_PRICE_INPUT_PER_1K', 'OPENAI_PRICE_OUTPUT_PER_1K',
];

// Names of the required variables that are missing from env.
export function missingConfig(env = process.env) {
  return missingEnvVars(env, REQUIRED_ENV);
}

// True when the required variables are present (values not validated).
export function isOpenAIConfigured(env = process.env) {
  return missingConfig(env).length === 0;
}

export function parseOpenAIConfig(env = process.env) {
  const missing = missingConfig(env);
  if (missing.length > 0) {
    throw new Error(
      `OpenAI provider needs ${missing.join(', ')}. Set them in the environment — ` +
      'no provider is required, and an unconfigured provider simply reports as unavailable.',
    );
  }
  const baseUrl = (env.OPENAI_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  let url;
  try {
    url = new URL(`${baseUrl}/chat/completions`).toString();
  } catch {
    throw new Error(`OPENAI_BASE_URL is not a valid URL: "${baseUrl}"`);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`OPENAI_BASE_URL must use http(s): "${baseUrl}"`);
  }
  warnPlaintextHttp(url, 'OpenAI provider');
  return {
    url,
    key: env.OPENAI_API_KEY.trim(),
    model: env.OPENAI_MODEL.trim(),
    timeoutMs: parsePositiveInt(env.OPENAI_TIMEOUT_MS, 'OPENAI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
    maxRetries: parseNonNegativeInt(env.OPENAI_MAX_RETRIES, 'OPENAI_MAX_RETRIES', DEFAULT_MAX_RETRIES),
    retryDelayMs: parseNonNegativeInt(env.OPENAI_RETRY_DELAY_MS, 'OPENAI_RETRY_DELAY_MS', DEFAULT_RETRY_DELAY_MS),
    maxTokens: parsePositiveInt(env.OPENAI_MAX_TOKENS, 'OPENAI_MAX_TOKENS', undefined),
    inputPricePer1k: parseNonNegativeNumber(env.OPENAI_PRICE_INPUT_PER_1K, 'OPENAI_PRICE_INPUT_PER_1K', undefined),
    outputPricePer1k: parseNonNegativeNumber(env.OPENAI_PRICE_OUTPUT_PER_1K, 'OPENAI_PRICE_OUTPUT_PER_1K', undefined),
  };
}

// `env` and `fetchImpl` are injectable so tests can run against a
// local stub endpoint with fake credentials and no network.
export function createOpenAIProvider(env = process.env, fetchImpl = globalThis.fetch) {
  const config = parseOpenAIConfig(env);
  const usage = createUsageTracker(config);

  return {
    name: `openai:${config.model}`,
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
          { role: 'user', content: buildUserMessage(evalCase) },
        ],
      };
      if (config.maxTokens !== undefined) body.max_tokens = config.maxTokens;

      const data = await postJsonWithRetry({
        fetchImpl,
        url: config.url,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.key}`,
        },
        body,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        retryDelayMs: config.retryDelayMs,
        label: 'OpenAI provider',
        usage,
      });
      const text = (data.choices?.[0]?.message?.content || '').trim();
      const parsed = extractJsonObject(text, 'OpenAI provider');
      const observation = normalizeObservation(parsed);
      // Token/cost tracking, when the provider reports usage.
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
