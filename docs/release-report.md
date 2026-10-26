# BAYORA final release report

**Report date:** 2026-10-27
**Scope:** Branding cleanup, backend audit, server-side synthetic persistence, license/dependency notices, regression verification, and GitHub delivery.
**Status:** Verified source-only prototype; not a production AI red-team service.

## Executive summary

BAYORA now has a consistent original product identity and a real Express/SQLite backend for a closed set of synthetic security scenarios. It does **not** connect to an authorized Phoenix service, retrieve real traces, evaluate a real dataset, call a model, execute tools, test a target, or verify deployed security controls. Those workflows remain blocked or unimplemented and the UI says so. No Phoenix service was deployed or hosted.

The original BAYORA source/test change is commit `d63bf45381c01626366dde89204fdbc2a412262d`. The documentation/repository-metadata follow-up is commit `1591148eea4320a795de824e77cad0ad78d83666`; it was fast-forwarded to GitHub `main` and the Webdev canonical `origin/main` after confirming both started at `642dd5f705b4a03d542bbedc6d7562f99fe8f95b`. The dedicated branch is `bayora/branding-cleanup`. This report is an additional documentation artifact; the final repository tip after that report-only update is stated in the task handoff.

GitHub Actions passed on the source and docs commits listed above: run `40393471040` passed on `d63bf45381c01626366dde89204fdbc2a412262d`; run `40394266276` passed on `1591148eea4320a795de824e77cad0ad78d83666` on the dedicated branch; run `40394483081` passed on that same SHA on `main`. No force-push was used. Webdev `publishing.auto_publish` was `false`, so no public service was deployed.

## Capability matrix

| Capability | Status | Verified behavior | Remaining limitation |
| --- | --- | --- | --- |
| BAYORA HTTP health and SQLite readiness | **Implemented and tested** | `/api/health` probes the local app/database/schema; health reports readiness rather than only process liveness. | Does not prove readiness of external services or complete application behavior. |
| Synthetic run creation and execution | **Implemented and tested** | Express runs three fixed, server-side synthetic fixtures and a fixed-suite request; arbitrary prompts, targets, tool commands, and unknown scenario fields are rejected. | No model, tool, or live target is invoked; this is a bounded harness, not production adversarial testing. |
| Run retrieval and persistence | **Implemented and tested** | API exposes stored synthetic history; schema-versioned SQLite survives a same-filesystem process restart; tests cover capacity and atomic suite behavior. | SQLite is single-process/single-node. No managed database, shared multi-instance store, backup, retention, or ownership model is configured. |
| Error handling and input limits | **Implemented and tested** | Contract, malformed/oversized body, unsupported input, rate-limit, failure, and persistence paths have tests. | Operational controls for a public multi-tenant deployment are not established. |
| Upstream health probe | **Implemented, health-only** | `/api/phoenix/status` probes the server-configured `/healthz` endpoint; adapter behaviors are tested with controlled fetchers. | No authorized live endpoint or identity was provided; a healthy response would not prove protected-data access. |
| Real traces, datasets, experiments, and evaluations | **Blocked / not integrated** | UI accurately identifies these as unavailable; protected operations fail closed. | Requires a verified service contract, server-validated identity/authorization, and owner-approved credentials. No such service/data was used in tests. |
| Authentication and authorization | **Unavailable** | No owner identity is fabricated; only fixed non-confidential synthetic endpoints are exposed. | No identity provider, owner allowlist, tenant separation, or server-side authorization for protected upstream workflows is configured. Do not expose as a general public service. |
| Audit/evidence trust | **Partially implemented** | Synthetic run records include server-side metadata, SQLite persistence, and provenance/status labels. | No cryptographic signatures, tamper-evident ledger, trusted timestamp, independent verification, report export, human review, or acceptance workflow. SQLite records are not proof of a security control. |
| Observability/evaluation UI | **Partially implemented** | Status and blocked/empty states are rendered without fabricating metrics or records. | UI capability descriptions do not imply that live trace, dataset, or evaluation APIs are connected. |
| Production hosting/readiness | **Not verified / not claimed** | Compiled Node server, local smoke test, and GitHub CI pass. | No production deployment, persistent cloud volume, managed database, HA, secrets injection, or production access review was configured. |

## Branding findings and resolution

The read-only branding audit was recorded before changing the application. The original BAYORA favicon/mark and wordmark were already present; the private app package metadata and several user-facing health/empty-state strings still named the upstream product. GitHub description/topics were blank. The full findings and file locations are in [the branding audit](branding-audit.md).

Resolved changes:

- Standardized page title, product copy, README, package name (`bayora-ai-security-workbench`), package description, wordmark, accessible navigation name, and favicon/platform logo on **BAYORA**.
- Replaced visible upstream product labels and user-facing server/client messages with accurate neutral upstream-service wording. The copy still makes clear that only health is probed and protected data is blocked.
- Kept technical contracts intact: `/api/phoenix/status`, `/api/phoenix/data`, `PHOENIX_BASE_URL`, relevant internal type/function identifiers, protocol names, and source/license references. No backend route or response schema was renamed to disguise its dependency.
- Preserved the original BAYORA SVG. The quoted platform `logoUrl` is durable HTTPS and resolves to the same SVG content used by the app.
- Corrected Vite Preview host handling to allow only `.sg2.manus.computer`; host checking is not disabled globally. Added a regression test for that suffix and the existing shared-listener HMR configuration.

GitHub repository metadata now uses the synthetic-only description: “BAYORA is a synthetic-only AI security testing workbench with bounded server-side fixtures; protected upstream data remains blocked pending identity and access controls.” Topics: `ai-security`, `express`, `observability`, `react`, `security-testing`, `sqlite`, `synthetic-testing`. Homepage remains blank because no public product website is deployed. No license was assigned to original BAYORA code because the owner has not selected one.

## License and attribution

The inspected Phoenix upstream baseline is `https://github.com/Arize-ai/phoenix` at `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`, licensed under Elastic License 2.0 with its separate Arize `IP_NOTICE`. Those exact notices and source provenance remain in the repository. Phoenix application source was not copied into the BAYORA repository, and no hosted Phoenix service was launched.

The [third-party notice index](THIRD_PARTY_NOTICES.md) covers all 19 pinned direct dependencies: 7 runtime dependencies and 12 build/test/development dependencies. Full package-distributed license texts are included and compared with the installed distributions. This is a direct-dependency license/attribution inventory, not a legal opinion or a complete human review of every transitive package or vulnerability advisory.

## Exact verification evidence

Local checks on the final application source reported:

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass; reproducible lockfile install. |
| `pnpm preflight` | Pass; pinned toolchain, `node:sqlite`, routes and credential-free environment template checks. |
| `pnpm typecheck` | Pass. |
| `pnpm lint` | Pass. |
| `pnpm test` | **46 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo.** |
| `pnpm build` | Pass; client and compiled production server build. |
| `pnpm production-smoke` | Pass; isolated production server, health/schema check, and one temporary synthetic record; only its temporary test data was removed. |
| Staged source/docs whitespace and credential-pattern checks | Pass; exact package/upstream license directories were excluded from whitespace normalization and preserved byte-for-byte. High-confidence GitHub/OpenAI/AWS token and private-key patterns were absent from the staged diff. |

The production smoke emitted Node's experimental `node:sqlite` warning. GitHub Actions emitted non-failing warnings that the pinned actions target Node 20 (being forced to Node 24) and that `ubuntu-latest` is migrating to Ubuntu 26. All workflow steps succeeded; these are maintenance caveats, not application-test failures.

Post-branding Preview review navigated Overview, Security Lab, Observability, Evaluations, Audit, and Environment using the existing isolated four-record SQLite test database without adding/changing records. The earlier interactive test run had already persisted a suite and one individual synthetic run. Accessible wordmark/navigation names were spot-checked and have source regression assertions. No exhaustive axe/WCAG scan, mobile/responsive owner review, or browser automation across every state was performed.

The GitHub workflows are CI runs on the source and docs commits listed above. The upstream Phoenix targeted identifier suite separately reported 64 passed and 2 warnings; it is **not** a BAYORA integration test. The broader upstream suite did not produce a complete summary and remains incomplete. No real Phoenix endpoint, credentials, model, external target, or protected data were used.

## Remaining blockers and run instructions

Real integration requires an authorized upstream service and server-validated identity/access policy. Production use additionally needs owner-selected identity, durable/shared database, operational secret handling, evidence controls, and a formal security review. Until those prerequisites are supplied and verified, keep protected operations unavailable; do not claim production readiness.

For trusted local/sandbox testing, use Node 22 and the pinned pnpm toolchain:

```sh
pnpm install --frozen-lockfile
pnpm preflight
pnpm dev
```

The server listens on port `3000`; open the project's Webdev Preview from the workspace. The default SQLite file is `data/bayora.sqlite` and can be overridden with server-only `BAYORA_DATABASE_PATH`. Do not expose this unauthenticated synthetic-only prototype as a general-purpose public service.

The Git push to Webdev canonical `origin/main` was accepted at the verified release SHA. The push response did not include a separate Version History/checkpoint receipt, so this report does not independently claim that a checkpoint card was recorded. The auto-publish setting was confirmed off; no public deployment was requested or triggered.
