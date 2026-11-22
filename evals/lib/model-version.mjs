// model-version.mjs — capture the exact served model version from an
// OpenAI-compatible chat-completions endpoint.
//
// The model name the operator configures (EVAL_PROVIDER_MODEL) is a
// request alias: providers routinely serve a dated snapshot behind it
// (e.g. "gpt-5-mini" -> "gpt-5-mini-2026-08-07"), and the snapshot can
// change between runs without any configuration change. A real-model
// eval report must record the model that actually answered, not just
// the alias that was asked for — otherwise two runs of the "same"
// model are not comparable.
//
// This module wraps a fetch implementation and reads the `model`
// field out of each successful JSON response body. It is a passive
// observer: it never changes the request, never retries, never logs,
// and never touches credentials. The wrapped fetch still returns the
// original response untouched, so the provider layer parses it
// exactly as it would have without the wrapper.
//
// Body reading uses Response.clone() so the original body stays
// available to the caller. When clone() is unavailable (a minimal
// test stub, or a non-standard fetch), observation is skipped
// silently — version capture is best-effort, never a failure mode.
// A response whose body is not JSON, or has no string `model` field,
// is likewise skipped. Nothing here can fail a run.

// Create a fetch wrapper that records every distinct `model` value
// seen in successful (2xx) JSON response bodies.
// Returns { fetch, getObservedModels } where getObservedModels()
// returns the distinct model strings in first-seen order.
export function createVersionCapturingFetch(fetchImpl) {
  const observed = [];
  const seen = new Set();

  function record(model) {
    if (typeof model === 'string' && model.length > 0 && !seen.has(model)) {
      seen.add(model);
      observed.push(model);
    }
  }

  async function fetchWithCapture(url, options) {
    const res = await fetchImpl(url, options);
    // Only successful responses carry a meaningful served model, and
    // only a cloneable body can be peeked at without consuming the
    // caller's response. Anything else: observe nothing.
    if (!res || !res.ok || typeof res.clone !== 'function') return res;
    try {
      const copy = res.clone();
      const data = await copy.json();
      record(data && data.model);
    } catch {
      // Non-JSON body, consumed body, or clone failure: the provider
      // layer will surface any real problem when it parses the
      // original response. Version capture stays silent.
    }
    return res;
  }

  return {
    fetch: fetchWithCapture,
    getObservedModels() { return [...observed]; },
  };
}

// Summarize observed served models for a report.
//   requested — the EVAL_PROVIDER_MODEL alias that was asked for.
//   observed  — distinct served model strings, first-seen order.
// Returns { requested, served, servedModels, consistent }:
//   served     — the single served model when exactly one was seen,
//                otherwise null (no observation, or the provider
//                served more than one model during the run).
//   consistent — true when exactly one served model was observed.
export function summarizeServedModel(requested, observed) {
  const servedModels = [...observed];
  return {
    requested,
    served: servedModels.length === 1 ? servedModels[0] : null,
    servedModels,
    consistent: servedModels.length === 1,
  };
}
