# Validation evidence — initial owner-testing checkpoint

## BAYORA application

Commands executed from `/home/ubuntu/bayora`:

| Command/check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; dependency tree matched the lockfile |
| `pnpm typecheck` | PASS after the review fixes; `tsc --noEmit` |
| `pnpm lint` | PASS after the review fixes; `eslint .` |
| `pnpm test` | PASS after the review fixes; 19 tests, 19 passed, 0 failed |
| `pnpm build` | PASS after the review fixes; Vite built `dist/client` (React/TypeScript bundle and local fonts) |
| `pnpm preflight` | PASS; Node 22.23.4, pinned pnpm 11.25.0, lockfile and all 7 source routes match `public/manus-routes.json`; no credential-like literal in `.env.example` |
| Live HTTP smoke on configured port 3000 | PASS; `/api/health` returned the BAYORA synthetic-only mode, `/api/phoenix/status` correctly returned `not_configured`/`health-only`, and `/manus-routes.json` returned all 7 pages. Earlier static smoke confirmed `/`, `/security` and `/bayora-mark.svg` return `200`. |
| Phoenix archive verification | PASS; all 8,447 tracked files from `phoenix-main.zip` match the official checkout byte-for-byte; 0 missing, 0 extra, 0 mismatches |

Regression coverage includes deep validation of nested stored findings/steps, unknown scenario rejection, preservation of malformed browser data without overwriting it, unavailable localStorage handling, non-followed Phoenix redirects, request-timeout cancellation and invalid Phoenix URL classification. A read-only review found these issues; fixes were followed by typecheck, lint, all 19 tests, production build, preflight and live API checks.

The first dev-server attempt failed because Node `--env-file-if-exists=.env` with `--watch` attempted to watch a nonexistent file. The implementation was changed to load `.env` safely in-process and use the `tsx` watcher. A clean no-`.env` restart and the live HTTP checks then passed.

## Phoenix upstream baseline

The official checkout is commit `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`.

**Targeted upstream test — PASS:** the exact identifier test file completed with 64 passed and 2 warnings in 0.33 seconds:

```sh
cd /home/ubuntu/bayora-research/phoenix/tests
../.tox/unit_tests/bin/pytest -q unit/db/types/test_identifier.py
```

**Full upstream unit suite — INCOMPLETE, not a pass:** an attempt used:

```sh
cd /home/ubuntu/bayora-research/phoenix
UV_NO_PROGRESS=1 uvx --python 3.12 tox run -e unit_tests -- unit/db/types/test_identifier.py
```

The checked-in `tox.ini` appends `unit/` to the supplied test path, so this ran the entire unit directory, not only the named file. Its captured log contains 1,840 `PASSED` result lines and no explicit `FAILED` or `ERROR` result lines, but the process stopped before pytest produced a final summary. Therefore the full upstream unit suite is **incomplete** and must not be reported as passing. The isolated identifier file was then run directly in the existing tox environment and did complete successfully as shown above.

These are source tests only; they do not validate BAYORA-to-Phoenix data APIs. No Phoenix server, authorized account, Docker service, trace or dataset workflow was run. BAYORA's Phoenix adapter calls only `/healthz` and remains `not_configured` in this environment.

## Not verified by this checkpoint

No owner-machine test, identity-provider flow, protected trace/dataset/evaluation API, cross-user or shared persistence, database migration, cryptographic evidence signing, protected review workflow, effective isolation test, visual device/browser acceptance, or public deployment was performed. These remain blocked or owner review items; no production-readiness claim is made.
