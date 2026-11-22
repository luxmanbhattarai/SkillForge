// provider-registry.mjs — resolves a provider name to its adapter.
//
// Single resolution point for eval providers. The multi-model
// adapters live in evals/providers/; the mock and the legacy generic
// model provider live in evals/runners/providers.mjs and are
// delegated to, not re-implemented.
//
//   resolveProvider(name, env?, fetchImpl?) — async; returns the
//       provider object for `name`. Throws for an unknown name
//       (listing the known providers) or for a known-but-unconfigured
//       provider (naming the missing variables). Never falls back to
//       another provider: a request for a model that is not
//       configured fails loudly instead of silently running the mock.
//   listProviders(env?) — synchronous status of every known
//       provider: configured vs unconfigured, with the missing
//       variables named. Safe to print: no values, no keys.
//   getProviderSpec(name) — the spec object, or null when unknown.
//
// No provider is required to be configured. An environment with no
// credentials at all is the normal state: listProviders reports the
// model providers as unconfigured, and only `mock` resolves.

import {
  createMockProvider,
  createModelProvider,
  isModelProviderConfigured,
} from '../runners/providers.mjs';
import {
  createOpenAIProvider, isOpenAIConfigured, missingConfig as missingOpenAIConfig,
  REQUIRED_ENV as OPENAI_REQUIRED_ENV, OPTIONAL_ENV as OPENAI_OPTIONAL_ENV,
} from '../providers/openai.mjs';
import {
  createAnthropicProvider, isAnthropicConfigured, missingConfig as missingAnthropicConfig,
  REQUIRED_ENV as ANTHROPIC_REQUIRED_ENV, OPTIONAL_ENV as ANTHROPIC_OPTIONAL_ENV,
} from '../providers/anthropic.mjs';
import {
  createGeminiProvider, isGeminiConfigured, missingConfig as missingGeminiConfig,
  REQUIRED_ENV as GEMINI_REQUIRED_ENV, OPTIONAL_ENV as GEMINI_OPTIONAL_ENV,
} from '../providers/gemini.mjs';
import {
  createLocalProvider, isLocalConfigured, missingConfig as missingLocalConfig,
  REQUIRED_ENV as LOCAL_REQUIRED_ENV, OPTIONAL_ENV as LOCAL_OPTIONAL_ENV,
} from '../providers/local.mjs';

// The legacy generic model provider's required variables (see
// evals/runners/providers.mjs parseModelConfig). Kept here so the
// registry can name what is missing without re-parsing config.
const MODEL_REQUIRED_ENV = ['EVAL_PROVIDER_URL', 'EVAL_PROVIDER_KEY', 'EVAL_PROVIDER_MODEL'];
const MODEL_OPTIONAL_ENV = [
  'EVAL_PROVIDER_TIMEOUT_MS', 'EVAL_PROVIDER_MAX_RETRIES',
  'EVAL_PROVIDER_RETRY_DELAY_MS', 'EVAL_PROVIDER_MAX_TOKENS',
  'EVAL_PROVIDER_PRICE_INPUT_PER_1K', 'EVAL_PROVIDER_PRICE_OUTPUT_PER_1K',
];

function missingModelConfig(env) {
  return MODEL_REQUIRED_ENV.filter((n) => !(env[n] || '').trim());
}

// Each spec: id (the name a runner passes), displayName, a one-line
// description, create(env, fetchImpl) returning the provider object
// (async — the mock provider loads the registry), isConfigured(env),
// missing(env) naming absent variables, and the env var lists.
export const PROVIDER_SPECS = [
  {
    id: 'mock',
    displayName: 'Mock (deterministic)',
    description: 'Deterministic mock agent; no network, no credentials. The default provider.',
    create: async () => createMockProvider(),
    isConfigured: () => true,
    missing: () => [],
    requiredEnv: [],
    optionalEnv: [],
  },
  {
    id: 'model',
    displayName: 'Model (generic OpenAI-compatible)',
    description: 'Legacy generic provider from evals/runners/providers.mjs (EVAL_PROVIDER_*). Prefer the named adapters for new runs.',
    create: async (env, fetchImpl) => createModelProvider(env, fetchImpl),
    isConfigured: (env) => isModelProviderConfigured(env),
    missing: (env) => missingModelConfig(env),
    requiredEnv: MODEL_REQUIRED_ENV,
    optionalEnv: MODEL_OPTIONAL_ENV,
  },
  {
    id: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI chat-completions API (or any compatible endpoint via OPENAI_BASE_URL).',
    create: async (env, fetchImpl) => createOpenAIProvider(env, fetchImpl),
    isConfigured: (env) => isOpenAIConfigured(env),
    missing: (env) => missingOpenAIConfig(env),
    requiredEnv: OPENAI_REQUIRED_ENV,
    optionalEnv: OPENAI_OPTIONAL_ENV,
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    description: 'Anthropic Messages API.',
    create: async (env, fetchImpl) => createAnthropicProvider(env, fetchImpl),
    isConfigured: (env) => isAnthropicConfigured(env),
    missing: (env) => missingAnthropicConfig(env),
    requiredEnv: ANTHROPIC_REQUIRED_ENV,
    optionalEnv: ANTHROPIC_OPTIONAL_ENV,
  },
  {
    id: 'gemini',
    displayName: 'Gemini',
    description: 'Google Gemini via the custom.gemini connector helper (shells out to gemini_chat.py; no key in env, no direct HTTP).',
    // Gemini takes no fetchImpl: it shells out to the helper.
    create: async (env) => createGeminiProvider(env),
    isConfigured: (env) => isGeminiConfigured(env),
    missing: (env) => missingGeminiConfig(env),
    requiredEnv: GEMINI_REQUIRED_ENV,
    optionalEnv: GEMINI_OPTIONAL_ENV,
  },
  {
    id: 'local',
    displayName: 'Local (OpenAI-compatible)',
    description: 'Local inference server speaking the chat-completions shape (Ollama, vLLM, LM Studio, llama.cpp).',
    create: async (env, fetchImpl) => createLocalProvider(env, fetchImpl),
    isConfigured: (env) => isLocalConfigured(env),
    missing: (env) => missingLocalConfig(env),
    requiredEnv: LOCAL_REQUIRED_ENV,
    optionalEnv: LOCAL_OPTIONAL_ENV,
  },
];

export const KNOWN_PROVIDERS = PROVIDER_SPECS.map((s) => s.id);

export function getProviderSpec(name) {
  return PROVIDER_SPECS.find((s) => s.id === name) || null;
}

// Status of every known provider against env (defaults to
// process.env). Never throws for a missing provider — that is the
// normal state — and never includes secret values.
export function listProviders(env = process.env) {
  return PROVIDER_SPECS.map((spec) => ({
    id: spec.id,
    displayName: spec.displayName,
    description: spec.description,
    configured: spec.isConfigured(env),
    missing: spec.missing(env),
    requiredEnv: [...spec.requiredEnv],
    optionalEnv: [...spec.optionalEnv],
  }));
}

// Resolve a provider name to its adapter. `env` and `fetchImpl` are
// injectable so tests can resolve against fake credentials and a
// stub endpoint with no network.
export async function resolveProvider(name, env = process.env, fetchImpl = globalThis.fetch) {
  const spec = getProviderSpec(name);
  if (!spec) {
    throw new Error(
      `Unknown provider "${name}" (expected one of: ${KNOWN_PROVIDERS.join(', ')})`,
    );
  }
  if (!spec.isConfigured(env)) {
    throw new Error(
      `Provider "${name}" is not configured: missing ${spec.missing(env).join(', ')}. ` +
      'Set the variables in the environment, or use a provider that is configured.',
    );
  }
  return spec.create(env, fetchImpl);
}
