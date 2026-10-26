# BAYORA — AI Security Workbench

BAYORA is a source-verified, server-backed synthetic-testing prototype. Express accepts only three closed built-in scenario identifiers (or a fixed suite request), runs those deterministic fixtures server-side, and stores only the resulting synthetic records in a versioned SQLite file. This is not a production AI red-team platform: fixture runs do not call a model, execute tools or access a target. Records are not signed, independently verified, human-reviewed or accepted.
**Scope:** Synthetic-only. The backend never calls a model or target and is not a production red-team service.

Old browser-local test records are retained as separately labeled legacy history. Phoenix integration remains an upstream `/healthz` check only; trace/project/dataset/experiment/evaluation data APIs are blocked because no authorized Phoenix service and server-side identity/authorization are configured. The synthetic run APIs are unauthenticated but accept only fixed non-confidential built-in fixtures; run this project only in its intended trusted Preview/local or self-hosted single-node context. Do not expose it as a general-purpose public service.

## Quick start

```sh
pnpm install --frozen-lockfile
pnpm preflight
pnpm dev
```

The server listens on port `3000`. The SQLite file defaults to `data/bayora.sqlite`; set server-only `BAYORA_DATABASE_PATH` to override it. The `data/` directory is Git-ignored. SQLite records survive a process restart only on the same persistent filesystem. Multi-instance ephemeral hosting, cloud durability, shared ownership, automated retention and backup are not configured.

Run checks with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm production-smoke`. `pnpm production-smoke` uses and removes only its isolated temporary DB/port. For detailed backup boundaries and APIs, follow [setup and operations](docs/setup.md). Do not deploy this prototype publicly or claim production readiness.

## Documentation

- [Backend audit and capability matrix](docs/backend-audit.md)
- [Architecture and trust boundaries](docs/architecture.md)
- [Setup, SQLite persistence and operations](docs/setup.md)
- [Phoenix provenance and licensing](docs/upstream-and-license.md)
- [Third-party notices and direct dependency licenses](docs/THIRD_PARTY_NOTICES.md)
- [Branding audit findings](docs/branding-audit.md)
- [Validation evidence and limitations](docs/validation-results.md)
- [Final release report](docs/release-report.md)
- [Owner-testing checklist](docs/owner-testing-checklist.md)
- [Full acceptance/status register](TODO.md)
- [Approved plan and backend-audit implementation addendum](plan.md)

The verified Phoenix upstream source remains separate; no Phoenix application source is copied into this repository. The existing exact Phoenix ELv2 license and IP notice are retained for provenance, and complete runtime notices are in `third-party-notices/`. No independent license has been assigned to original BAYORA code; ask the owner before adding one.
