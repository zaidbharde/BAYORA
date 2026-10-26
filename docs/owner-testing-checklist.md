# Owner-testing checklist — backend implementation checkpoint

Use the Webdev Preview reached from the project workspace; this is not a public deployment. The run APIs accept only fixed synthetic scenario identifiers and are unauthenticated, so use this only in the trusted Preview/local environment.

## Frontend and server workflows

1. Open Overview. The health card should reflect the BAYORA API and actual SQLite schema probe. Phoenix remains `not_configured` unless an operator intentionally provides a reachable server-only `PHOENIX_BASE_URL`; no protected data should appear.
2. Select **Run synthetic suite**. The server should create three `synthetic-server` records, return server-generated IDs/timestamps, and the UI should update with results. The success label means only a built-in local rule matched its fixed sample.
3. Open Security Lab. Inspect each threat model, procedure and expected result. Run each fixture individually and then the suite. Check that disabled/busy, history-loading, error and storage-capacity messages are visible and no model/target/tool request is issued.
4. Open Audit & Evidence. Confirm server SQLite records and any `legacy browser` records have distinct provenance labels. Records should remain unsigned, unverified, not reviewed and not evaluated. Reload and confirm server records return from SQLite. If the API is loading or fails, confirm Audit does not claim the history is empty; if it is truncated, confirm the displayed server total and warning that older records are omitted.
5. Open Findings. Confirm loading, API-error, complete-empty and truncated-history messages are distinct. Findings must be described as covering only loaded records when truncated; an API error or zero records on an incomplete page is not a no-findings result. An empty synthetic regression list is not a model/deployment assessment.
6. Open AI Observability and Environment. Phoenix is health-only; no trace, dataset, experiment or evaluation results should appear. `/api/phoenix/data` must remain blocked without making an upstream request.
7. Check route/API contracts: `GET /api/health`, `GET /api/runs?limit=100`, `GET /api/runs/<id>`, and `/manus-routes.json`. Confirm response data and the seven declared client routes.
8. Submit an unknown scenario, extra prompt/target field, unknown query, invalid body and >16 KiB JSON body to the run API. Confirm bounded 400/413 JSON errors, zero created records for invalid requests, and no outgoing target request.
9. Exercise the API throttle using a test configuration, not by generating sustained traffic against an owner's real store. Verify an explicit 429 `Retry-After` and that a rate-limited request adds no record.
10. Check responsive layout and keyboard focus at desktop and narrow mobile widths; ensure status words accompany color and server/legacy data source labels remain readable.

## Safe SQLite restart and production checks

11. On a disposable local database path, create a synthetic run, stop BAYORA cleanly with `Ctrl+C`, restart it with the same path, then confirm the run is retrievable. Keep the owner's existing DB untouched. Confirm a new temporary database reports schema version 1.
12. In a disposable test instance with a deliberately low row limit, verify overflow returns `409 storage_full` and preserves all prior rows. Do not fill the normal 5,000-record store.
13. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm production-smoke`. The production smoke uses a temporary isolated DB/port and removes only its test directory.
14. In a **throwaway browser profile only**, confirm retained malformed legacy browser data remains untouched and new writes do not overwrite it. Do not edit, clear, or replace data in the owner's regular browser profile.

## Not accepted by this checkpoint

This implementation is not proof of production-grade adversarial testing, real-model coverage, protected identity/access, a real Phoenix trace/dataset/evaluation integration, multi-instance/durable cloud persistence, shared run history, automatic backup/recovery, cryptographic evidence, signed approvals, independent review, benchmark acceptance or production readiness. The SQLite file is one-node application persistence for non-confidential synthetic outputs only; use a supported identity provider and validated authorization before exposing any protected operation.
