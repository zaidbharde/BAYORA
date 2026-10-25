# Setup and operations

## BAYORA prototype

Prerequisites are Node.js 22.13 or later and pnpm 11.25.0. The manifest pins the package manager and direct dependency versions; the lockfile pins resolved dependencies. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm preflight
pnpm dev
```

The development server listens on `0.0.0.0:3000` for Webdev Preview. Express and Vite share the same Node HTTP server in development, so Vite's HMR WebSocket is reachable through the configured Preview port instead of a separate unproxied port. When `createApplication` is used without an existing HTTP server (such as API-only tests), Vite HMR is disabled rather than opening a fallback socket that the test server cannot accept. Copy `.env.example` to an ignored `.env` file only if you want to set a server-side Phoenix base URL; the Node startup command loads this file. Leave `PHOENIX_BASE_URL` blank to keep the upstream probe unconfigured. For a separate local Phoenix instance, use `PHOENIX_BASE_URL=http://127.0.0.1:6006`. BAYORA does not accept a Phoenix URL or credential from the browser and does not forward fixture runs.

The server provides `GET /api/health` and `GET /api/phoenix/status`; the latter requests only Phoenix `GET /healthz`. A healthy response confirms only that endpoint responded, not that authentication is active or trace APIs/data are authorized. The static `GET /manus-routes.json` route manifest declares the seven page routes.

Run checks from the repository root:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm build` runs TypeScript checking and creates the client bundle under `dist/client`. A local built-mode smoke test can be started with `NODE_ENV=production pnpm start` after building, then checked at `http://127.0.0.1:3000/api/health`. This prototype is not configured or approved for public deployment. Stop a local server with `Ctrl+C`; no cleanup command deletes run data. Browser-local synthetic runs persist only in the current browser profile and may be cleared or edited by that browser's user.

## Phoenix upstream (separate service)

Use only a distinct clone of the verified Phoenix checkout. The source's non-containerized development path is available; Docker is not required for local development. In that checkout, follow the pinned workspace's setup and run `uv sync --all-extras --all-packages`, then `uv run phoenix serve`. The source documents the default local listener at port `6006`; verify its health using `curl -i http://127.0.0.1:6006/healthz`. BAYORA itself neither installs nor starts Phoenix, initializes Phoenix's schema, nor shares its database.

Phoenix documents SQLite and PostgreSQL. Its SQLite default is stored under its own Phoenix working directory; `PHOENIX_SQL_DATABASE_URL` selects a SQLite or PostgreSQL URL. A real service owner is responsible for its migrations, storage, backup and recovery using the upstream guidance. Keep that store separate from any future BAYORA database.

For this exact Phoenix revision, `PHOENIX_ENABLE_AUTH` defaults to `False`. Review and configure upstream authentication before exposing Phoenix on a network; do not turn authentication off just to obtain a green BAYORA health card. Never paste credentials into source control or chat. No credential is currently configured here, and all protected data routes remain blocked.

## Troubleshooting

- If the app does not start, run `node --version`, `pnpm --version`, `pnpm install --frozen-lockfile`, then inspect the first server error. Do not delete the lockfile or installed dependencies as a first-line fix.
- If Preview stays on its placeholder, confirm the server reports port `3000` and request `GET /api/health` on the Preview origin.
- If Vite reports `WebSocket closed without opened`, keep the Express listener on the configured port and ensure Vite middleware receives that same Node HTTP server for HMR. Do not expose or proxy Vite's separate fallback port; restart `pnpm dev` after changing this wiring.
- If Phoenix shows `Not configured`, set `PHOENIX_BASE_URL` in the server-side `.env` and restart BAYORA. If it shows `unavailable`, check Phoenix reachability from this server environment and inspect the local Phoenix log. A `blocked` result records a 401/403 from the health endpoint; no protected data was requested.
- If routes do not load in Preview, compare `public/manus-routes.json` with `src/client/App.tsx`, then run `pnpm preflight` and request `/manus-routes.json` directly.
- If synthetic records cannot be stored, the UI reports the browser storage issue and retains the current run only in memory. Nothing is silently truncated or overwritten.
