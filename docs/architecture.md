# BAYORA architecture and trust boundaries

## Components and flow

The React/TypeScript client renders seven application routes. It calls a same-origin Express API; the server executes only the three closed, versioned fixtures defined in `src/shared/scenarios.ts`. The API accepts a `scenarioId` only (or a fixed no-body suite call); it rejects arbitrary prompt text, targets, tool instructions, model configuration and unknown fields. The server generates each ID, timestamp, result and provenance reference. The browser never runs a new fixture directly.

The `SqliteSyntheticRunStore` in `src/server/db.ts` creates a versioned schema (`user_version=1`) and persists the server-produced records in `data/bayora.sqlite` by default, or at server-only `BAYORA_DATABASE_PATH`. The schema stores only fixed synthetic scenario metadata and outputs. API listing returns at most 500 recent records and an explicit total/truncation signal. Writes are atomic and capped at 5,000 records; reaching the cap returns an explicit conflict, deletes no history, and requires an operator-selected storage/retention decision. A process-local rate limit reduces accidental or automated write exhaustion, but resets at restart and is not distributed abuse protection.

Old `synthetic-local` records can still be read from the existing browser storage key and are labeled `legacy browser` in the UI. The client never writes a server result over that key. Browser-store validation rejects unexpected records and prevents writes when saved data is corrupt. Server records are labeled `synthetic-server` and use a SQLite evidence-reference namespace.

The Express health endpoint performs a database query and reports schema/count/capacity or a degraded state. `/api/phoenix/status` reads `PHOENIX_BASE_URL` server-side and requests only the separately hosted Phoenix `/healthz` path, with a 3.5-second timeout and redirects disabled. It returns a sanitized health status and discards the body. `/api/phoenix/data` always returns a blocked response and never calls Phoenix.

```text
Fixed scenario ID -> bounded BAYORA API -> server-only fixture runner -> generated record
                                                        -> atomic SQLite insert -> API list/get -> client
Legacy browser records -----------------------------------------------> labeled legacy history

Server PHOENIX_BASE_URL -> health-only adapter -> Phoenix GET /healthz -> status only -> client
Protected Phoenix traces/datasets/evaluations -> blocked; no upstream request is made
```

## Persistence and deployment limits

Phoenix and BAYORA keep separate runtimes and databases. Phoenix source supports its own SQLite/PostgreSQL storage. BAYORA's current store is one-process SQLite and contains no identity or arbitrary user content. It does not provide cross-instance locking/coordination, multi-node concurrency, user-specific ownership, remote backup, high availability, automated retention or a trusted audit ledger. A hosted container with ephemeral storage must not be assumed durable. The default SQLite path is appropriate only for development or a self-hosted single-node instance with a persistent volume and controlled filesystem/backup access. No public BAYORA/Phoenix service is deployed by this project.

The synthetic write APIs have no user login because they accept only fixed, non-sensitive built-in scenarios; they are unauthenticated and still subject to resource-abuse risk. Run only in the intended trusted development/self-hosted context. The rate limiter and hard row cap are availability guardrails, not identity or authorization. Do not store confidential datasets, prompts, traces, credentials or user payloads in this database.

## Security harness scope

The fixtures are a narrow phrase detector for a built-in prompt-injection sample, a fixed allowlist decision for a synthetic tool identifier without executing a tool, and redaction of a fake `BAYORA_DEMO_SECRET_…` canary. They do not call a model, access a network target, use real secrets, execute a tool, create a sandbox/container, or prove any property of Phoenix or a deployed AI system. PASS means only that a deterministic local rule matched its expected fixture outcome.

Run records preserve scenario/version, timestamp, synthetic dataset reference, deterministic seed, no-model configuration, step outcomes and record provenance. They remain unsigned, unverified, not human-reviewed and unevaluated. SQLite persistence across restart is not cryptographic integrity, trusted time, append-only evidence, a reviewer identity, independent verification or acceptance. There is no report export, signature, or acceptance workflow.

## Protected integration gate

The audit confirmed Phoenix source at the verified commit contains APIs for traces, projects, datasets, experiments and evaluations, but BAYORA has no data client/workflow and no authorized reachable Phoenix service was available. Protected routes must not be implemented until a supported user identity provider and server-enforced per-request authorization have been designed, configured and tested. Keep credentials server-side, use verified API contracts, implement access-scoped persistence and retention, test both denial and success, and distinguish synthetic records from actual Phoenix results. Do not treat Phoenix health, an app-level service credential, a default auth setting or SQLite's existence as authorization for every viewer. Do not mark the application production-ready, the evidence accepted or Phoenix integrated until real prerequisites and end-to-end verification exist.
