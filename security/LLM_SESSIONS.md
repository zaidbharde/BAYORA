# Phase 9 — LLM session boundary

Gateway creates a fresh random session ID for every `/attack` call and stores only its SHA-256 in the signed Audit chain. The ID is not returned to Red. Gateway makes one `/api/generate` call per request and never forwards Ollama's deprecated `context` field or any prior response context. A per-session system nonce changes the initial prompt prefix; this reduces shared-prefix reuse but is not a vendor-supported cache-disable switch.

The model may remain resident for performance. A signed `operator` token can call `POST /session/reset`; Gateway sends Ollama `keep_alive: 0` to unload the model and records `SESSION_RESET`. The trusted host also restarts the Ollama container after a sealed run via `scripts/reset_model.sh`; tenants receive no Docker socket or restart authority.

Blue's test-only canary is stored only in the Blue image. Its output filter redacts raw, Base64, hex, and ROT13 forms. Red-side Phase 9 tests use ephemeral tmpfs input and print only verdicts, hashes, and timing values. Gateway/Audit persist hashes and coarse metadata, not prompt or response text.

## Runtime limitation

Official Ollama API/FAQ pages document request context and model residency controls, but not a cache-disable flag. The pinned `ollama/ollama:0.6.8` response omitted `prompt_eval_cached_count` in a repeated-prompt probe. T13 therefore measures latency distributions; passing that test means no statistically detectable timing separation in this run, not proof that every possible cache side channel is absent. Revisit the pinned server version/configuration if strict prefix-cache disablement is required.

Sources: [Ollama generate API](https://docs.ollama.com/api/generate), [Ollama FAQ](https://docs.ollama.com/faq), [Ollama API reference](https://github.com/ollama/ollama/blob/main/docs/api.md).
