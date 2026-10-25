# BAYORA — AI Security Workbench

BAYORA is an owner-testing prototype for bounded, deterministic synthetic security fixtures and honest local evidence review. It is **not** a production AI red-team platform. Fixture runs do not call a model or external tool. Run records stay in browser localStorage and are unsigned, unverified, unreviewed and not accepted. Phoenix integration is limited to a server-side health-only probe; protected Phoenix data APIs and run forwarding are deliberately blocked pending verified identity and authorization.

## Quick start

```sh
pnpm install --frozen-lockfile
pnpm preflight
pnpm dev
```

The app listens on port `3000`. Visit the Webdev Preview supplied by the workspace; do not expose or deploy this prototype publicly. To configure the optional server-side Phoenix `/healthz` probe, copy `.env.example` to `.env` and set `PHOENIX_BASE_URL` to a base URL reachable from the BAYORA server. No credentials or protected Phoenix data are used.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.

## Documentation

- [Architecture and trust boundaries](docs/architecture.md)
- [Setup, local operation and troubleshooting](docs/setup.md)
- [Phoenix provenance and licensing](docs/upstream-and-license.md)
- [Validation evidence and limitations](docs/validation-results.md)
- [Owner-testing checklist](docs/owner-testing-checklist.md)
- [Full acceptance/status register](TODO.md)
- [Approved implementation plan](plan.md)

The verified upstream source remains separate. See `docs/upstream-and-license.md` for its commit, exact archive comparison, ELv2 conditions and third-party runtime components. No license was assigned to BAYORA original code in this prototype.
