# BAYORA implementation plan

## Verified starting point

- Official source: `https://github.com/Arize-ai/phoenix`, default branch `main`, fetched at `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`.
- The uploaded `phoenix-main.zip` contains 8,447 tracked files; every tracked file was compared byte-for-byte with that checkout, with 0 missing files and 0 mismatches. The ZIP is therefore an exact source snapshot of this commit (Git history itself is not present in the ZIP).
- The verified root `LICENSE` is Elastic License 2.0 (ELv2); `pyproject.toml` also declares `Elastic-2.0` and includes `LICENSE` and `IP_NOTICE`. No Phoenix code is planned to be copied into BAYORA; Phoenix remains a separate checkout at `/home/ubuntu/bayora-research/phoenix` and will be consumed as a separately run service through supported interfaces.
- Phoenix's app is FastAPI (`src/phoenix/server/app.py`, `create_app`); its CLI entry point is `phoenix.server.main:main`. The source includes an OTLP HTTP trace route at `/v1/traces`, a REST API under `/v1` (including `GET /v1/projects`), GraphQL at `/graphql`, and health/readiness routes `/healthz` and `/readyz`. The source documents SQLite and PostgreSQL; `PHOENIX_SQL_DATABASE_URL` selects the DB and the default is a SQLite file under Phoenix's working directory. In this exact revision `PHOENIX_ENABLE_AUTH` defaults to `False`; BAYORA will not silently change or bypass that setting.
- The source development guide uses `uv sync --all-extras --all-packages`, the pinned Node/pnpm workspace, and `pnpm dev`; Phoenix tests are managed by tox (`tox run -e unit_tests`, SQLite by default). Docker is absent in this sandbox. The guide describes non-containerized operation, but Phoenix dependencies/services have not yet been installed or started.
- GitHub checks: `zaidbharde/BAYORA-Phoenix` does not exist. `zaidbharde/BAYORA` exists, is public, and has default branch `phase12/repository-audit`; it is out of scope and will not be changed. This Webdev project currently uses a Manus-managed repository and GitHub canonical switching requires the platform's owner-confirmation flow.

## Implementation approach and scope

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

## Startup and integration shape

Use a pinned Node/package-manager toolchain, Vite/React/TypeScript and Express. One dev command listens on `0.0.0.0:3000` for Webdev Preview and serves the SPA plus `/api/health` and `/api/phoenix/status`; `/manus-routes.json` is a static file reflecting the seven page routes. Example environment files contain placeholders only. Local run history is browser-scoped, and no database is configured. Setup/preflight commands must be idempotent and must not delete user data. The first checkpoint will remain unpublished; an owner-facing GitHub connection confirmation is required before a new private repository can become canonical.

## Explicit limits at the first checkpoint

This sandbox has no Docker and no authorized Phoenix service URL/account configured. Phoenix cannot yet be demonstrated with real traces, datasets, experiments, or evaluations here. The first version will not expose protected Phoenix data or claim auth, effective isolation, trusted audit integrity, signed approvals, regression acceptance, or production readiness. The plan leaves those requirements open rather than weakening them. A later increment must first settle supported server-side identity and authorized access, then connect and test the corresponding real Phoenix APIs and persistence before exposing those features.
