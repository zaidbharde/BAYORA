# BAYORA architecture and trust boundaries

## Components and flow

The React/TypeScript client renders seven routes. The synthetic test engine runs deterministic string/policy fixtures in the browser and returns typed run records; the browser writes those synthetic records to one localStorage key. A record is labeled local, unsigned, unverified, not human-reviewed and not evaluated. Browser storage is user-editable; it is not a trustworthy audit store. Nested records are validated before rendering. Malformed or unreadable storage is left untouched and further writes are disabled; any new runs stay in memory only for that tab.

The Express server exposes `/api/health` and `/api/phoenix/status`. The latter reads `PHOENIX_BASE_URL` only from server-side environment configuration and requests only the separately hosted Phoenix `/healthz` path, with a 3.5-second timeout and redirects disabled. It returns a sanitized status, not the response body. The browser cannot select a host or path. No trace, project, dataset, evaluation or prompt data is fetched; no test run is sent to Phoenix; no credential is accepted by the UI.

```text
Built-in synthetic fixture -> local deterministic rule -> browser run record -> browser localStorage -> UI

Server configuration PHOENIX_BASE_URL -> Express health adapter -> Phoenix GET /healthz -> status only -> UI

No BAYORA -> Phoenix data/API route exists in this checkpoint.
```

Phoenix and BAYORA keep separate runtimes and databases. Phoenix source documents SQLite and PostgreSQL; the default Phoenix SQLite file belongs to Phoenix's working directory. BAYORA has no managed database enabled. The prototype keeps only non-sensitive synthetic fixture records in the current browser. There is no shared database, backup/recovery path, cross-user history, or deletion/retention guarantee.

## Security harness scope

The only executable checks are fixed and local: a narrow instruction-override phrase match, a fixed unapproved tool identifier compared to a small allowlist without executing any tool, and redaction of a fake `BAYORA_DEMO_SECRET_…` canary string. The fixtures do not call a model, access a network target, use real secrets, run a tool, create a sandbox/container, or prove any property of Phoenix or a deployed AI system. PASS means only that a local fixture matched its expected result.

An informational finding, if any, is a harness regression caused by an unexpected synthetic fixture outcome. It is not a model vulnerability, benchmark failure, or production finding. Runs store scenario/version, timestamp, synthetic dataset reference, deterministic seed, no-model configuration, step outcomes and local evidence reference. There is no cryptographic signature, trusted timestamp, independent evidence verification, human review or acceptance decision.

## Future protected integration gate

Before enabling protected Phoenix traces, datasets, experiments, prompts, annotations or run forwarding, define the user identity provider and server-enforced per-request authorization, connect only to verified API contracts, keep Phoenix/BAYORA credentials server-side, implement access-scoped persistence and retention, audit the authorization flow, and test denial as well as success. Do not treat Phoenix health, a default auth setting, or possession of an app-level service credential as authorization for every BAYORA viewer. Do not mark integration or security acceptance complete until a real authorized Phoenix service and identity are available and tested.
