# BAYORA implementation plan

## Verified starting point

- Official source: `https://github.com/Arize-ai/phoenix`, default branch `main`, fetched at `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`.
- The uploaded `phoenix-main.zip` contains 8,447 tracked files; every tracked file was compared byte-for-byte with that checkout, with 0 missing files and 0 mismatches. The ZIP is therefore an exact source snapshot of this commit (Git history itself is not present in the ZIP).
- The verified root `LICENSE` is Elastic License 2.0 (ELv2); `pyproject.toml` also declares `Elastic-2.0` and includes `LICENSE` and `IP_NOTICE`. No Phoenix code is planned to be copied into BAYORA; Phoenix remains a separate checkout at `/home/ubuntu/bayora-research/phoenix` and will be consumed as a separately run service through supported interfaces.
- Phoenix's app is FastAPI (`src/phoenix/server/app.py`, `create_app`); its CLI entry point is `phoenix.server.main:main`. The source includes an OTLP HTTP trace route at `/v1/traces`, a REST API under `/v1` (including `GET /v1/projects`), GraphQL at `/graphql`, and health/readiness routes `/healthz` and `/readyz`. The source documents SQLite and PostgreSQL; `PHOENIX_SQL_DATABASE_URL` selects the DB and the default is a SQLite file under Phoenix's working directory. In this exact revision `PHOENIX_ENABLE_AUTH` defaults to `False`; BAYORA will not silently change or bypass that setting.
- The source development guide uses `uv sync --all-extras --all-packages`, the pinned Node/pnpm workspace, and `pnpm dev`; Phoenix tests are managed by tox (`tox run -e unit_tests`, SQLite by default). Docker is absent in this sandbox. The guide describes non-containerized operation, but Phoenix dependencies/services have not yet been installed or started.
- The source/repository facts above are dated planning-baseline observations. A later, task-specific GitHub recheck on 2026-10-27 found the user-selected public `zaidbharde/BAYORA` repository empty, on default branch `main`, with push/admin permission for the authenticated account; the latest task explicitly directs source publication there. The active Webdev project remains on its Manus-managed canonical repository; the user GitHub repo is a separate source destination, not a canonical switch.
- At the start of the backend-audit work, Manus `main` was `66ae102e53bf42bd8db0f6d746f84fd3f59f97b1`; this task's code was developed on `bayora/full-backend-audit`. These are historical branch facts, not a claim that the current worktree is clean on `main`.

## Original approved implementation approach and scope (baseline; superseded where expanded by the backend-audit addendum below)

Build an original TypeScript/React single-page security workbench, served by a small Node/Express application on the initialized project's port 3000. The app's server boundary will expose only explicit BAYORA APIs. The first owner-testing checkpoint is a prototype, not a production security-testing service:

1. **Synthetic security harness:** deterministic, bounded, local test scenarios (for example, a prompt-injection fixture, disallowed-tool fixture, and sensitive-output fixture). Execution operates only on built-in synthetic inputs; there is no arbitrary target URL, external model invocation, real tool execution, or real red-team/blue-team access. A result is a synthetic harness outcome, not a claim about a model or production control.
2. **Run records and evidence:** generate run identifiers, timestamps, scenario/version, deterministic input references, outcomes, findings, and reproducibility metadata. Store only synthetic run records in the current browser's `localStorage`. Show an explicit `synthetic / local / unsigned / unverified` label; any checksum is only a client-generated integrity hint, not a trusted signature or audit proof. Metrics are computed only from recorded local runs; empty state is zero/empty rather than invented.
3. **Phoenix connection boundary:** read `PHOENIX_BASE_URL` only from server-side configuration, never from arbitrary browser input. A server-side, time-bounded request may probe the verified, non-data health endpoint `/healthz`; display disconnected, healthy, unavailable, or error with the observed status. The prototype will not fetch protected traces, projects, datasets, evaluations, or reports; will not forward harness runs to Phoenix; and will not expose Phoenix credentials. Those operations stay blocked until a supported server-side identity/authorization design exists and has been verified. Do not disable Phoenix authentication to make a demo pass. An unconfigured Phoenix service is an honest blocked state, not a fixture masquerading as real data.
4. **Dashboard:** original pages for Overview (`/`), Security Lab (`/security`), Observability (`/observability`), Findings (`/findings`), Evaluations (`/evaluations`), Audit (`/audit`), and Environment (`/environment`). Each page uses real local state or the actual health probe; unsupported/inaccessible functions explain the blocker. Include useful loading, empty, success, error, and blocked states. No authentication, persistence, protected-data access, cryptographic evidence signing, or real benchmark acceptance is claimed in this checkpoint.
5. **Data and trust boundaries:** Phoenix stays a separately launched upstream process and owns its own configured SQLite/PostgreSQL database. BAYORA has no managed database enabled; its prototype records remain in the browser and do not share Phoenix's DB. The express API holds no credentials in source or client bundles. No Phoenix dataset or trace content is read into the demo. A future protected integration must add server-enforced user identity and authorization before any trace/result endpoint is exposed; it must define retention, persistence, backup/recovery, redaction, and separate signed evidence before claiming those controls.
6. **Licensing and release:** preserve the upstream checkout and notices unmodified. Document the exact SHA, ELv2 restriction (including the restriction on offering Phoenix as a hosted/managed service), database/auth behavior, and original-versus-upstream code boundary. Keep the prototype private/unpublished during this work; do not deploy a hosted Phoenix service. Create/connect the separate `BAYORA-Phoenix` GitHub destination only through the supported, owner-confirmed Webdev GitHub flow, using its private-repository default. Do not create it using a parallel CLI path or alter `zaidbharde/BAYORA`. Develop on a dedicated BAYORA work branch and produce the required platform-recorded checkpoint on `main` only after implementation and checks are reviewed; verify the exact remote/checkpoint SHA.

## Project structure

- `src/client/` — React application shell, navigation, pages, visual system, status and run components.
- `src/server/` — Express startup, explicit health endpoint, Phoenix health adapter, URL validation, timeouts, and safe error shaping.
- `src/shared/` — typed scenario/run models, synthetic runner, finding classification and result serialization shared by client/server where appropriate.
- `public/` — static route manifest and local icon/favicon assets.
- `tests/` — unit/API tests for scenario behavior, result labels, Phoenix health states, and failure handling.
- `scripts/` — repeatable preflight and local start/check helpers without destructive cleanup.
- `docs/` — architecture/data flow, verified upstream and license notes, setup/integration guide, limitations, test evidence, and owner checklist.
- `plan.md` — this approved implementation/design plan; `TODO.md` — complete status register based on the specification after plan approval.

## Design direction

Three low-probability directions sampled for selection: maritime signal-station instrument panel (0.0233); museum-grade Swiss field notebook (0.0381); electro-industrial threat observatory (0.0247). Selected: **electro-industrial threat observatory**.

- **Design movement:** contemporary industrial instrumentation with editorial control-room typography, not a copy of Phoenix's UI.
- **Core principles:** explicit evidence provenance; compact high-signal hierarchy; restrained alarm color; clear separation between local simulation and connected services.
- **Color philosophy:** near-black graphite grounds the workbench; cool mineral white carries readable analysis; a distinctive electric-lime signal marks active local actions; amber and coral appear only for caution and findings. Color never substitutes for text status.
- **Layout paradigm:** a persistent narrow left instrument rail, an asymmetrical evidence workspace, and a contextual right-side detail panel where space permits; on mobile, the rail collapses and details stack below content rather than shrinking dense tables.
- **Signature elements:** small numbered test/run IDs; thin contour-line dividers; a lime “pulse” indicator used only for a live, real health response or a currently executing local scenario.
- **Interaction philosophy:** every action identifies its scope before running; synthetic actions say “Run synthetic suite”; blocked service actions state the missing prerequisite; success does not imply security acceptance.
- **Animation:** brief 120–180 ms state transitions, no continuous ambient motion except a reduced-motion-aware health probe indicator; honor `prefers-reduced-motion`.
- **Typography system:** Geist Sans for interface hierarchy and IBM Plex Mono for identifiers, timestamps, status codes, and evidence digests; tabular numerals for counts; body copy stays comfortably readable.
- **Brand essence:** “A controlled workbench for testing AI security behavior with evidence you can classify—not overclaim.” Personality: precise, candid, vigilant.
- **Brand voice:** headlines are direct, scope-aware, and calm. Examples: “Test the boundary. Keep the evidence.” and “Synthetic run only — no model or external tool was invoked.”
- **Wordmark & logo:** custom BAYORA wordmark paired with a segmented signal aperture/shield mark; use original inline SVG geometry, not an upstream Phoenix mark.
- **Signature brand color:** electric signal lime `#C8F36A`.

## Original startup and integration plan (historical baseline; current commands are in `docs/setup.md`)

Use a pinned Node/package-manager toolchain, Vite/React/TypeScript and Express. One dev command listens on `0.0.0.0:3000` for Webdev Preview and serves the SPA plus `/api/health` and `/api/phoenix/status`; `/manus-routes.json` is a static file reflecting the seven page routes. Example environment files contain placeholders only. Local run history is browser-scoped, and no database is configured. Setup/preflight commands must be idempotent and must not delete user data. The first checkpoint will remain unpublished; an owner-facing GitHub connection confirmation is required before a new private repository can become canonical.

## Original first-checkpoint limits (historical baseline; current limits are in the backend-audit addendum)

This sandbox has no Docker and no authorized Phoenix service URL/account configured. Phoenix cannot yet be demonstrated with real traces, datasets, experiments, or evaluations here. The first version will not expose protected Phoenix data or claim auth, effective isolation, trusted audit integrity, signed approvals, regression acceptance, or production readiness. The plan leaves those requirements open rather than weakening them. A later increment must first settle supported server-side identity and authorized access, then connect and test the corresponding real Phoenix APIs and persistence before exposing those features.


## Backend-audit implementation addendum — 2026-10-27

The new owner request supersedes the original checkpoint's prototype-only implementation limits where it asks for a real BAYORA backend. The original plan remains the source of the visual direction and Phoenix/source/license baseline. The current app was audited directly: it previously had only `/api/health` and a health-only Phoenix probe; scenarios executed in browser code, runs were stored in browser `localStorage`, no database or auth existed, and no Phoenix data APIs were called. The audit found a `MAX_STORED_RUNS` read/write mismatch and an unverified production start path (`tsx` was dev-only).

### Implementation boundary and data flow

- Add Express endpoints for listing and retrieving synthetic BAYORA runs and for executing one built-in synthetic scenario or the fixed full suite. Accept only the closed scenario-ID set; accept no arbitrary prompt text, target URL, shell command, model configuration, tool name, or user-supplied fixture. The server is the sole runner for these API actions and produces the result record itself.
- Persist these strictly synthetic records in a versioned SQLite schema using Node's supported built-in `node:sqlite` module, with an explicit configurable file path and a single-process, single-instance scope. Keep Phoenix's database separate. Do not enable the project-managed MySQL database because it is currently disabled and is a one-way resource change whose development and production data are shared. The SQLite file is for a self-hosted persistent local/single-node deployment only; ephemeral managed containers and multi-instance deployments are not durable/shared and must remain unclaimed until a supported durable database/ownership design is selected and tested.
- The records contain only built-in fixture outputs and server-created IDs/timestamps; do not accept or store confidential evaluation data, credentials, personal prompts, or arbitrary user content. Cap the database at 5,000 records and reject additional writes rather than silently deleting history. Keep old browser-local records readable and explicitly distinguish legacy local history from server SQLite records; never erase the user's browser data as part of migration.
- Change the Security Lab's current supported fixture actions to use the BAYORA HTTP API and render server-derived outcomes. Show backend loading, error, storage-full and empty states. Derived counts must identify their source and remain synthetic, not production-security metrics.
- Keep Phoenix data operations unavailable. Phoenix source at `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1` supports health/readiness, traces, projects, datasets and experiments/evaluations, but no authorized Phoenix service or caller identity is configured here. Do not call protected data routes, disable Phoenix authentication, or represent health as full integration. Use the exact upstream route/schema only after identity, authorization and reachable service are supplied and verified.
- Do not add an unauthenticated protected data or evidence endpoint. Current server-run operations are restricted to public, fixed synthetic fixtures and no arbitrary caller data; Phoenix traces/datasets/evaluations, confidential results, signing, human review and acceptance remain blocked until an actual server-validated identity, role/policy and protected data access are available. Follow Manus OAuth as the default if login is later added; do not treat the first visitor as owner or accept browser assertions as identity.
- Keep audit/evidence labels unsigned, unverified, unreviewed and unevaluated. SQLite JSON persistence is an application record store, not a cryptographic chain of custody or trusted audit system. Keep sanitizing health/configuration failures and never include credentials or protected data in logs.

### Repository, CI and release path

- At the start of this task, Manus `main` was `66ae102e53bf42bd8db0f6d746f84fd3f59f97b1`; this implementation was developed on `bayora/full-backend-audit`. The user explicitly authorized source publication to the existing public `zaidbharde/BAYORA` repository. A read-only GitHub check on 2026-10-27 found it empty (no branches, commits, or files), with authenticated `zaidbharde` push/admin permission. This is a historical pre-push state; record the resulting local/remote SHAs and any later destination changes in the final delivery note. Preserve the Manus canonical remote separately and never push BAYORA changes to `Arize-ai/phoenix`.
- A GitHub Actions workflow now runs frozen install, preflight, typecheck, lint, tests, client/server build, and isolated production smoke. Local checks pass, and GitHub run `40393471040` passed on source commit `d63bf45381c01626366dde89204fdbc2a412262d`. A documentation/status refresh, its follow-up CI, and final GitHub/canonical `main` promotion remain. Do not claim production readiness from CI or Preview checks.
- Retain Phoenix ELv2/IP notices and original-versus-upstream provenance. The requested GitHub repository is public; its source publication is distinct from operating a public hosted Phoenix service. Do not deploy/host substantial Phoenix functionality under this audit task.

### Project structure updates

- `src/server/db.ts` — versioned SQLite schema migration and synchronous repository for fixed synthetic run records.
- `src/server/api.ts` — health, explicit capability/readiness, synthetic-run list/create/get contracts and the existing health-only Phoenix probe; protected Phoenix-data operations stay unimplemented/blocked.
- `src/shared/` — closed request/result and provenance types plus the bounded fixture engine reused only within BAYORA.
- `src/client/services/` — typed same-origin BAYORA API client; local legacy records remain separately labeled and are not authoritative.
- `tests/` — API/persistence contract tests, database restart durability, capacity/validation and security boundary regressions.
- `.github/workflows/` — repeatable CI for the checked-in lockfile.
- `data/` — runtime SQLite files, ignored by Git and never committed.

### Unresolved acceptance boundaries

This increment can establish a functional BAYORA synthetic backend and SQLite restart persistence, but cannot establish authorized live Phoenix data integration, per-user protected access, shared cloud persistence, cryptographic evidence, reviewer acceptance, production deployment, or production security testing without their external service, identity, key/reviewer, and deployment prerequisites. Report those as blocked or unverified rather than lowering the acceptance bar.


## Backend delivery update — 2026-10-27

The user-approved backend-audit request supersedes the original front-end/localStorage-only limitation. BAYORA now exposes typed, same-origin APIs for its three closed synthetic fixtures, stores server-generated synthetic records in versioned single-node SQLite, and updates the Overview/Security/Audit/Findings/Environment workflow from actual API responses. Only built-in synthetic IDs are accepted; no model, tool, caller prompt, target URL or protected Phoenix data is involved. SQLite data is separate from Phoenix and from Webdev's managed MySQL; the latter remains disabled. Schema v1 can be reopened across process lifetime in tests, has atomic suite writes, a hard 5,000-record limit and an explicit process-local write limiter. Audit/Findings state components are regression-tested for loading, error, complete-empty and truncated history. The full local suite has 41 passing tests. This is not a shared cloud store or trusted audit ledger.

The API surfaces that remain unavailable are deliberate: there is no BAYORA login/server identity or per-user authorization, no authorized Phoenix instance/caller identity, no Phoenix traces/datasets/experiments/evaluations integration, no report-signing or acceptance workflow. The run routes are not identity-gated but accept only fixed built-in fixture identifiers and are intended only for trusted local/Preview/single-node use; never deploy them publicly as a general-purpose service. The Phoenix route remains health-only.

The production server is compiled by `tsc -p tsconfig.server.json`, serves `dist/client` from `dist/server/server/index.js`, and passed a temporary-database production smoke. A GitHub Actions validation workflow is present; remote execution remains to be observed after push. Full local test/Preview evidence and exact limitations are in `docs/validation-results.md` and `docs/backend-audit.md`.

The user later explicitly selected the existing public `zaidbharde/BAYORA` repository for code delivery; that repository was rechecked empty with admin/push permission. This source-copy destination does not switch the Webdev project's canonical Manus-managed repository and is separate from public Phoenix hosting. Preserve the source repo's history and never force-push. Original BAYORA code has no owner-selected license; no license is inferred from the repo's public visibility.


## Branding cleanup and Preview compatibility update — 2026-10-27

Reuse the approved electro-industrial BAYORA design and original signal-aperture mark; do not import upstream artwork or assign a new license. Keep BAYORA as the only user-facing product identity across title, wordmark, package description, README and GitHub description. Present service state as “upstream” in user-visible copy, while retaining exact internal `/api/phoenix/*` routes, `PhoenixHealthStatus` types, `PHOENIX_BASE_URL` configuration, protocol/API identifiers, source documentation, and legally required notices. Do not alter standard upstream metadata to hide a dependency.

Extend the readable third-party notice index to all pinned direct runtime and development/build/test packages, with exact copied package notices and version/license roles. Keep the source-only BAYORA repository separate from Phoenix hosting; leave original BAYORA code without a license until the owner selects one.

For Webdev Preview, preserve the shared HTTP-listener HMR fix and allow only the Manus SG2 proxy suffix in Vite's host check (`.sg2.manus.computer`); do not disable host validation globally. This is a Preview-compatibility setting, not a new backend integration. The live source, API, and browser evidence is recorded in `docs/branding-audit.md`, `docs/backend-audit.md`, and `docs/validation-results.md`. GitHub CI and final remote SHAs remain pending until a successful dedicated-branch push.


### Source-branch verification update — 2026-10-27

The reviewed implementation commit `d63bf45381c01626366dde89204fdbc2a412262d` is on the dedicated GitHub branch `bayora/branding-cleanup`; GitHub Actions run `40393471040` passed every configured step on that SHA. The user repository now has a synthetic-only, access-boundary-aware description and conservative technical topics; its homepage remains unset because no deployed product site exists, and its BAYORA license remains unassigned pending owner choice. Remaining release steps are a documentation/status refresh after CI, another passing run on that final branch head, and a verified fast-forward to GitHub `main` and the Webdev canonical `origin/main`. Webdev auto-publish is off, so the canonical checkpoint push will not publish a public service.
