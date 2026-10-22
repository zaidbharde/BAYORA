# BAYORA residual risk report

## Scope

BAYORA is a single Linux host proof of concept. Red and Blue are treated as untrusted tenants; the Client LLM may emit untrusted text; the host, kernel, Docker runtime, and operator are trusted. Public research datasets are replayed and transformed; BAYORA does not author new harmful content.

## What is protected and how it is evidenced

| Property | Control | Evidence |
|---|---|---|
| Red cannot directly reach Blue or LLM | Internal networks and Gateway-only routing | T01–T04 in `reports/isolation_report.md` |
| Tenant filesystem and privilege exposure is bounded | Non-root, read-only roots, dropped capabilities, seccomp, tmpfs and limits | T05–T08, T17 |
| Prompt/reply plaintext is not placed in Audit | Hash-only signed events and encrypted capture lifecycle | Phase 12 unit/orchestrator tests and evaluator validation |
| Red payloads remain committed before execution and reveal is post-seal | Commit/reveal lifecycle and signed events | Phase 12 evaluator/replay checks |
| Session carry-over is reduced and reset is evidenced | Per-request sessions, nonce/context controls, model reset | T09, T12, T13, T16 and Phase 12 `SESSION_RESET` evidence |
| Timing and noisy-neighbor leakage is measured, not assumed absent | Response buckets and bounded resource experiments | T11 and T14 |
| Audit tampering is detectable | Hash chain, signatures, Merkle checkpoints, verifier | T15 and `make verify-audit` |
| Evaluator results are reproducible | Independent Replay recomputes evidence and compares exact metrics | Phase 12 Replay requirement |

A guarantee is valid only for the exact configuration and test evidence recorded in the reports. The current packaged archive cannot establish new runtime evidence because Docker, `age`, private identities, model weights, and images are absent.

## Residual risks

| Risk | Likelihood | Impact | Current mitigation | Next step |
|---|---:|---:|---|---|
| Shared kernel or runtime escape | Low–medium | Critical | seccomp, user remapping, dropped caps, non-root, limits | gVisor/Kata or dedicated host |
| CPU cache and microarchitectural channels | Low | Medium | bucketed timing and noisy-neighbor measurements | cpuset pinning or confidential hardware |
| Blue sees the in-flight prompt | Certain by design | Medium | blind inline processing, no persistence, enum-only output | document limitation; consider enclaves |
| Gateway compromise | Low | Critical | small policy point, auth, rate limits, signed events | formal review and split proxies |
| Trusted operator reads secrets | N/A in PoC | High | separate keys and append-only evidence | split custody or TEE |
| Residual timing channel | Low | Low–medium | fixed response buckets | tune and repeat T11 |
| Judge inaccuracy | Medium | Medium | deterministic judge, calibration, holdout evidence | multiple judges and manual review |
| Small model not representative | Medium | Medium | pinned model hash and documented scope | test larger models |
| Gateway denial of service | Medium | Low | size/rate limits and bounded resources | capacity testing/autoscaling |

## Invalid-result conditions

Treat a run as invalid when a cross-boundary `POLICY_VIOLATION`, model hash mismatch, Audit chain/signature failure, encrypted-capture hash mismatch, Evaluator/Replay mismatch, incomplete cleanup, or forbidden canary is observed. The system must report the failure rather than silently continue.

## Roadmap

The next approved milestone is completion and verification of Phase 12. Only after exact Replay equality and all full-run evidence pass should Phase 13 begin. Longer-term work includes TEE-backed Red/Blue enclaves with remote attestation, per-tenant microVMs, stronger timing isolation, formal Gateway policy verification, and independent judge ensembles.
