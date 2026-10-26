# Validation evidence — backend audit and owner-testing checkpoint

Validation was performed in the Manus Sandbox from `/home/ubuntu/bayora` on Node.js 22.23.4 / pnpm 11.25.0. A successful local build or Preview is not a public deployment or production-readiness claim.

## BAYORA automated checks

| Command/check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; installed lockfile was up to date. |
| `pnpm preflight` | PASS; Node 22.23.4, built-in `node:sqlite` memory DB query, pinned pnpm 11.25.0, lockfile, all seven page routes and credential-free `.env.example` verified. No cleanup or deletion performed. |
| `pnpm typecheck` | PASS; `tsc --noEmit`. |
| `pnpm lint` | PASS; `eslint .`. |
| `pnpm test` | PASS; 41 tests, 41 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo. Coverage includes Phoenix health-adapter bounds/failures, Express health/run/suite/list/get contracts, invalid/malformed/oversized input and rejection of JSON plus text/plain suite bodies, Phoenix blocked/no-forwarding, rate limits, SQLite schema/reopen/capacity/atomic rollback, browser-store corruption/non-overwrite, fixed synthetic fixture semantics, and server-rendered Audit/Findings loading/empty/error/truncated states. |
| `pnpm build` | PASS; checks client/server TypeScript, emits `dist/server/server/index.js`, builds `dist/client` and bundled local fonts with Vite 7.3.7. |
| `pnpm production-smoke` | PASS; launched the compiled server on an isolated port with a fresh temporary SQLite file, verified production client HTML, live SQLite schema health and one server-created synthetic record, then sent SIGTERM and removed only its temporary test directory. |
| `git diff --check` | To be repeated on the final staged change before commit. |

Node 22 prints `ExperimentalWarning: SQLite is an experimental feature` when BAYORA loads the built-in module. This warning is visible and documented; it does not invalidate the passed tests, but the SQLite module stability should be reassessed before upgrading Node or selecting a production runtime.

## Live Webdev Preview and browser flow

The current Preview server listened on `0.0.0.0:3000`. The final `GET /api/health` returned `status: ok`, `service: bayora`, `mode: synthetic-only`, SQLite `state: ready`, `count: 4`, `maxRecords: 5000`, `schemaVersion: 1`, and `protectedPhoenixData: blocked`. `GET /manus-routes.json` returned HTTP 200 and the exact seven source routes.

Through the actual Preview browser, the Overview rendered from the server API. Clicking **Run synthetic suite** created three records; `GET /api/runs?limit=10` returned source `bayora-sqlite-synthetic`, mode `synthetic-server` for all records, three `PASS` fixture outcomes and total `3`. Navigating to Security Lab and running one individual fixture created a fourth server record. The Audit page showed total `4`, SQLite synthetic provenance with unsigned, unreviewed and unevaluated labels; Findings showed a complete empty result for that same successful history load. Environment showed SQLite ready and identity/Phoenix-data blocked. The browser console had no runtime, API, React or Vite error after these workflows.

Preview testing used the isolated path `/tmp/bayora-preview-owner.sqlite`; its four synthetic test records are not project files and are not the default `data/bayora.sqlite`. Eight repeatable `node:test` component tests render Audit/Findings loading, complete-empty, error, and truncated states, including a truncated response with no rows. Those component tests are server-rendered markup checks, not browser interaction tests. The browser navigated to Overview, Audit and Findings; not every route/workflow was manually traversed, and responsive/mobile owner visual review was not performed.

## Vite Preview WebSocket defect

The original reported Vite error was reproduced from the Preview context. Vite middleware mode had opened HMR on an unproxied fallback port `24678`, while the Preview server listened on configured port `3000`. The server was changed to pass its existing Node HTTP server as the Vite HMR server; API-only tests run without HMR. The browser subsequently completed the authenticated Vite `vite-hmr` subprotocol handshake and received Vite's `connected` message. Listener inspection showed Node bound to `0.0.0.0:3000` with no separate Vite HMR port. The current Preview UI flow generated no browser-console errors.

## Phoenix source baseline — not BAYORA data integration

The exact official upstream baseline is `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`. The targeted upstream identifier test file completed with 64 passed and 2 warnings:

```sh
cd /home/ubuntu/bayora-research/phoenix/tests
../.tox/unit_tests/bin/pytest -q unit/db/types/test_identifier.py
```

The broader Phoenix unit suite is **incomplete, not a pass**. An earlier `tox run -e unit_tests -- unit/db/types/test_identifier.py` invocation appended its own `unit/` path and ran the full unit directory; its captured output shows 1,840 passing outcome lines and no explicit failure/error lines but ends without a pytest summary. No Phoenix service was started. The supplied Phoenix ZIP matched the exact verified source commit across all 8,447 tracked files with zero missing, extra or mismatched files.

## Implemented and verified scope

BAYORA now runs only three closed, bounded synthetic fixtures on the server; rejects arbitrary prompts, targets, tool commands and unknown fields; records server-created run metadata; and serves list/retrieval/health APIs from a versioned SQLite store. SQLite reopen persistence, schema initialization, atomic suite writes, capacity behavior and response validation have regression coverage. Historical browser-local records remain distinctly labeled; malformed local data is not overwritten. Health probes the live local database instead of reporting only process liveness, and Environment distinguishes degraded/blocked state.

The production server is compiled and starts successfully under Node. Local GitHub Actions CI is defined for frozen install, preflight, typecheck, lint, tests, build and production smoke; the remote GitHub workflow has not yet completed on GitHub.

## Not verified or still blocked

- Phoenix data integration is not implemented. BAYORA calls only a server-configured `/healthz` health probe. Protected trace/project/dataset/experiment/evaluation routes return an explicit blocked response and the regression test confirms no upstream request is made.
- No authorized Phoenix instance/account or BAYORA identity provider is configured. Authentication, per-user authorization, cross-user isolation and positive identity tests are therefore **blocked**, not passes. The three fixed run endpoints are intentionally unauthenticated; they accept only built-in synthetic scenario IDs, enforce a process-local write throttle and a 5,000-row ceiling, but are not public-service abuse protection.
- SQLite is single-process/single-node application persistence. No managed database, multi-instance coordination, cloud persistent volume, migration path beyond schema v1, automated backup/restore, retention/deletion policy, HA or user ownership is set up.
- Cryptographic signatures, append-only evidence, trusted timestamp, independent evidence verification, report export, human review and acceptance remain unimplemented; the UI explicitly labels records unsigned/unreviewed/unevaluated.
- No real traces, datasets, evaluations, model calls, external targets, production data or protected credentials were used in the tests.
- GitHub-hosted CI, an owner-owned machine, public deployment, production secrets, browser-automation across all routes, accessibility audit and owner responsive-layout review have not been verified.

This report demonstrates an integrated backend for fixed synthetic workflows only. It does not establish a complete Phoenix integration or production readiness.
