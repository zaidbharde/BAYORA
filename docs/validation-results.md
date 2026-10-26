# Validation evidence — backend audit and owner-testing checkpoint

Validation was performed in the Manus Sandbox from `/home/ubuntu/bayora` on Node.js 22.23.4 / pnpm 11.25.0. A successful local build or Preview is not a public deployment or production-readiness claim.

## BAYORA automated checks

| Command/check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; installed lockfile was up to date. |
| `pnpm preflight` | PASS; Node 22.23.4, built-in `node:sqlite` memory DB query, pinned pnpm 11.25.0, lockfile, all seven page routes and credential-free `.env.example` verified. No cleanup or deletion performed. |
| `pnpm typecheck` | PASS; `tsc --noEmit`. |
| `pnpm lint` | PASS; `eslint .`. |
| `pnpm test` | PASS; 46 tests, 46 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo. Coverage includes Phoenix health-adapter bounds/failures, Express health/run/suite/list/get contracts, invalid/malformed/oversized input and rejection of JSON plus text/plain suite bodies, protected-data blocked/no-forwarding, rate limits, SQLite schema/reopen/capacity/atomic rollback, browser-store corruption/non-overwrite, fixed synthetic fixture semantics, Audit/Findings loading/empty/error/truncated states, brand metadata/semantics, and the Preview-host/HMR regression. |
| `pnpm build` | PASS; checks client/server TypeScript, emits `dist/server/server/index.js`, builds `dist/client` and bundled local fonts with Vite 7.3.7. |
| `pnpm production-smoke` | PASS; launched the compiled server on an isolated port with a fresh temporary SQLite file, verified production client HTML, live SQLite schema health and one server-created synthetic record, then sent SIGTERM and removed only its temporary test directory. |
| `git -c core.whitespace=cr-at-eol diff --cached --check` | PASS; preserves the package-distributed TypeScript Apache license's exact CRLF bytes while checking the staged diff. |

Node 22 prints `ExperimentalWarning: SQLite is an experimental feature` when BAYORA loads the built-in module. This warning is visible and documented; it does not invalidate the passed tests, but the SQLite module stability should be reassessed before upgrading Node or selecting a production runtime.

## Live Webdev Preview and browser flow

The current Preview server listened on `0.0.0.0:3000`. The final `GET /api/health` returned `status: ok`, `service: bayora`, `mode: synthetic-only`, SQLite `state: ready`, `count: 4`, `maxRecords: 5000`, `schemaVersion: 1`, and `protectedPhoenixData: blocked`. `GET /manus-routes.json` returned HTTP 200 and the exact seven source routes.

Through the actual Preview browser, the Overview rendered from the server API. Clicking **Run synthetic suite** created three records; `GET /api/runs?limit=10` returned source `bayora-sqlite-synthetic`, mode `synthetic-server` for all records, three `PASS` fixture outcomes and total `3`. Navigating to Security Lab and running one individual fixture created a fourth server record. The Audit page showed total `4`, SQLite synthetic provenance with unsigned, unreviewed and unevaluated labels; Findings showed a complete empty result for that same successful history load. Environment showed SQLite ready and identity/Phoenix-data blocked. The browser console had no runtime, API, React or Vite error after these workflows.

Preview testing used the isolated path `/tmp/bayora-preview-owner.sqlite`; its four synthetic test records are not project files and are not the default `data/bayora.sqlite`. Eight repeatable `node:test` component tests render Audit/Findings loading, complete-empty, error, and truncated states, including a truncated response with no rows. Those component tests are server-rendered markup checks, not browser interaction tests. The initial browser flow exercised Overview suite execution, one individual Security Lab run, Audit and Findings. After branding changes, read-only navigation also covered Security Lab, Observability, Evaluations, Audit and Environment without creating or changing runs. Responsive/mobile owner visual review and every page-state/interaction combination were not performed.

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

The production server is compiled and starts successfully under Node. Local GitHub Actions CI is defined for frozen install, preflight, typecheck, lint, tests, build and production smoke; the remote GitHub workflow for this branding branch is pending its push.

## Not verified or still blocked

- Phoenix data integration is not implemented. BAYORA calls only a server-configured `/healthz` health probe. Protected trace/project/dataset/experiment/evaluation routes return an explicit blocked response and the regression test confirms no upstream request is made.
- No authorized Phoenix instance/account or BAYORA identity provider is configured. Authentication, per-user authorization, cross-user isolation and positive identity tests are therefore **blocked**, not passes. The three fixed run endpoints are intentionally unauthenticated; they accept only built-in synthetic scenario IDs, enforce a process-local write throttle and a 5,000-row ceiling, but are not public-service abuse protection.
- SQLite is single-process/single-node application persistence. No managed database, multi-instance coordination, cloud persistent volume, migration path beyond schema v1, automated backup/restore, retention/deletion policy, HA or user ownership is set up.
- Cryptographic signatures, append-only evidence, trusted timestamp, independent evidence verification, report export, human review and acceptance remain unimplemented; the UI explicitly labels records unsigned/unreviewed/unevaluated.
- No real traces, datasets, evaluations, model calls, external targets, production data or protected credentials were used in the tests.
- GitHub-hosted CI, an owner-owned machine, public deployment, production secrets, browser automation across every route/state, exhaustive accessibility audit and owner responsive-layout review have not been verified.

This report demonstrates an integrated backend for fixed synthetic workflows only. It does not establish a complete Phoenix integration or production readiness.


## Final branding and Preview verification — 2026-10-27

### Post-change commands

The final local quality gate ran in `/home/ubuntu/bayora` on Node.js 22.23.4 / pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm preflight
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm production-smoke
git -c core.whitespace=cr-at-eol diff --cached --check -- . ':(exclude)third-party-notices/runtime/**' ':(exclude)third-party-notices/development/**' ':(exclude)third-party-notices/phoenix/**'
```

All commands passed. The staged source/documentation whitespace check excludes only the package/upstream notice directories, preserving their distributed line endings and any original trailing spaces; all 19 direct package notices and the upstream notices are separately compared byte-for-byte with their source distributions. No license wording or bytes were rewritten. The final TAP summary was **46 tests, 46 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**. This includes four branding regressions for package/page identity, logo, navigation semantics and technical route preservation, plus a Preview regression that asserts a suffix-scoped Vite host allowlist and the existing shared HTTP-server HMR configuration. The production smoke compiled/launched the server, checked client/health/schema, created one synthetic record in a fresh isolated temporary database, and cleaned only that temporary test directory. Node 22 continued to emit its documented experimental `node:sqlite` warning.

### Live Preview browser checks

A read-only isolated Sandbox browser first reproduced `Blocked request. This host ... is not allowed` on the Manus Preview HTTPS host. Vite now allows only `.sg2.manus.computer`; global host-check bypass (`allowedHosts: true`) is explicitly not used. After restarting the server on the original isolated test database, the Preview served the correct BAYORA title and UI.

Overview, Security Lab, AI Observability, Datasets & evaluations, Audit & evidence, and Environment were rendered successfully. The Overview/Audit displayed the existing four persisted fixture records. No new scenario was submitted during this post-branding inspection. Status/error text says “Upstream” rather than presenting the upstream name as BAYORA branding; the health endpoint is explicitly health-only and protected trace/dataset/evaluation access remains blocked. The manifest still returns HTTP 200 with the exact seven routes.

Accessible names were spot-checked in the rendered tree: the BAYORA wordmark link has an explicit name, the brand SVG is decorative (`alt=""`), the main navigation is labeled, and buttons have action names. Automated branding tests cover these semantics. There is **no exhaustive axe/WCAG run**, keyboard/screen-reader review, or owner responsive-device acceptance in this task.

### Dependency notices and remote status

All 19 direct dependency license files (7 runtime and 12 development/build/test) were compared byte-for-byte with their installed package copies. The dependency notice index's 22 local links resolve. Phoenix's exact verified ELv2 and Arize IP notices are unchanged; no Phoenix service, database, trace, or evaluation data was used.

Immediately before the first push, the authenticated `zaidbharde` account had admin/push permission; the public repository default branch was `main` at `642dd5f705b4a03d542bbedc6d7562f99fe8f95b`, and the same SHA was on the Manus canonical `origin/main`. The dedicated local branch `bayora/branding-cleanup` had not yet been pushed at this point. GitHub-hosted CI for this branding update and the resulting remote commit SHA remain pending; they must be added here after GitHub confirms them.
