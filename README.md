# BAYORA

BAYORA is a single-host, Docker-based adversarial AI safety evaluation PoC. Red replays transformations of public research prompts, Gateway is the only cross-zone mediator, Blue applies operator-selected defenses, the Client LLM is isolated behind the Gateway, and Audit records signed hash-only evidence.

BAYORA is designed for defensible measurements, not absolute security claims. The host, Docker daemon, kernel, and operator are trusted in this PoC. Plaintext prompts and replies are held only in controlled in-memory or encrypted-at-rest paths; Audit records hashes and metadata rather than plaintext.

## Current status

Phases 1–11 are recorded as accepted with limitations. Phase 12 implements the trusted-host A/B/C lifecycle, encrypted chunk capture, post-seal reveal, deterministic judging, signed Audit evidence, and independent Replay. It remains **in progress and unaccepted** until the prescribed 200-item-per-mode benchmark completes and all evidence checks pass.

## Prerequisites

Use Ubuntu 22.04/24.04 with Docker Engine and Docker Compose, `age`/`age-keygen`, OpenSSL, at least the pinned BAYORA images, and the pinned Ollama model. Private keys and model weights are local operator material and must never be committed or pasted into chat. Provisioning scripts refuse unsafe implicit key rotation.

For host preparation, authorized key placement, pinned image/model supply, and exact run order, follow [Phase 12 trusted Linux host provisioning](docs/PHASE12_LINUX_PROVISIONING.md).

Run the readiness gate before any benchmark:

```bash
make phase12-preflight
```

The gate is fail-closed. It checks tools, private-key presence and permissions, Audit/Gateway public-private key correspondence, encrypted bundle hashes, the Ollama model directory, Compose, and required images on the same sudo-managed daemon used by runtime Make targets. If daemon access is unavailable, images are reported as uninspected rather than missing. It does not decrypt or print any secret.

## Phase-gated commands

```bash
make config-check          # syntax, JSON, and Compose configuration
make test-phase12-unit     # deterministic tests; no benchmark
make phase12-preflight     # runtime readiness; no services started
make test-phase12          # 200 samples in each A/B/C mode, only when ready
make replay                # independent signed-evidence replay of the latest run set
make verify-audit          # verify Audit hash chain, signatures, and checkpoints
make report                # replay plus aggregate report existence check
```

The benchmark uses the same encrypted, pinned 200-row source bundle and seed 42 for all modes: A has no Blue classifier, B uses rules-only Blue, and C uses full Blue. The operator controls profiles; tenants cannot select them. Every Red chunk is bounded to at most 50 records.

## Security lifecycle

A run is created, provisioned, committed, executed, sealed, reset, revealed, evaluated, replayed, and destroyed. Red payloads are committed before execution. Blue and evaluation material are revealed only after sealing. Any cross-boundary policy violation, model hash mismatch, Audit failure, or forbidden canary must invalidate the result rather than being hidden.

The network topology uses five internal Compose networks. Red, Blue, and LLM share a network only with Gateway; control-plane services use the control network. Containers run non-root with dropped capabilities, read-only roots, bounded resources, seccomp profiles, and constrained tmpfs mounts where supported by the host.

## Reports and evidence

`reports/isolation_report.md` records actual tests and limitations. `reports/phase12_evaluator.json` contains aggregate-only metrics. `reports/phase12_replay.json` records exact equality with the Evaluator after independent verification. `docs/residual_risk.md` maps guarantees and residual risks to evidence. Never treat a smoke run as a benchmark.

## Non-goals and limitations

This PoC does not provide a kernel-escape guarantee, eliminate microarchitectural timing channels, protect against a malicious trusted operator, or prove judge accuracy for every model and dataset. See `docs/residual_risk.md` before interpreting results.
