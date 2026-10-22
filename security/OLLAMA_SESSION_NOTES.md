# Ollama session/cache implementation notes

Checked 2026-10-11 against the official API and FAQ:

- `/api/generate` accepts a prompt and an optional deprecated `context` value returned by earlier generation; context is how callers request conversational memory. Gateway must never forward a previous `context` value.
- `keep_alive` controls model residency, not a documented prompt-cache toggle: `0` unloads the model immediately; the FAQ says the default is five minutes and API `keep_alive` overrides `OLLAMA_KEEP_ALIVE`.
- The API schema exposes `prompt_eval_cached_count` in responses but no documented cache-disable request field. Therefore model-residency settings alone must not be described as disabling prefix caching. Measure the returned cached-token count and request latency, and record a failure/limitation if cache isolation cannot be demonstrated.
- A fresh `/api/generate` prompt with no `context` is a separate caller-controlled conversation; cached token reuse, if present, is a distinct runtime behavior that needs measurement.

Sources:

- https://docs.ollama.com/api/generate — official generate request/response schema (`context`, `keep_alive`, cached token count).
- https://docs.ollama.com/faq — official model residency/unload behavior and `keep_alive` override semantics.
- https://github.com/ollama/ollama/blob/main/docs/api.md — official API reference describes `context` as deprecated, caller-supplied conversational memory.
