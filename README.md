# BAYORA

Secure Adversarial AI Testing Infrastructure for Hack in Hills '26, Problem Statement 04.

Bayora is planned as a controlled environment for adversarial AI security testing. Red Team workflows, Blue Team monitoring, Client LLM evaluation, security events, and audit logs will be introduced progressively. Phase 1.1 is only the project foundation and uses simulation-ready architecture instead of real isolation or attack infrastructure.

## Current Phase 1.1 Scope

- React + Vite + TypeScript frontend shell.
- Node.js + Fastify + TypeScript backend.
- `GET /api/health` endpoint.
- Shared TypeScript package for minimal contracts.
- Placeholder module boundaries for future test, red-team, blue-team, LLM, security, and audit systems.
- Environment-based configuration with safe `.env.example`.

Phase 1.1 intentionally does not include Docker isolation, Linux namespaces, seccomp, cgroups, Kubernetes, real exploit tooling, production security monitoring, real LLM adapters, or tamper-evident audit storage.

## Architecture

```text
bayora/
├── apps/
│   ├── web/          React frontend
│   └── api/          Fastify backend
├── packages/
│   ├── shared/       Shared TypeScript contracts
│   └── config/       Shared config package placeholder
├── docs/             Architecture notes
├── package.json      npm workspace root
└── tsconfig.base.json
```

The frontend talks to the backend through REST. The backend is structured so live events/WebSocket support can be added later without mixing transport logic into domain modules.

Future replacements are expected to happen behind module/service boundaries:

- Simulated Isolation Engine -> Real Docker/Linux Isolation
- Simulated Detection Engine -> Real Security Monitoring
- Mock LLM -> Real Local/Cloud LLM
- Simple Audit Logs -> Tamper-evident Audit System

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Fastify, TypeScript
- Communication: REST API
- Storage: no database in Phase 1.1
- Monorepo: npm workspaces

## Development

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm run dev:api
```

Start the frontend:

```bash
npm run dev:web
```

Run both from the workspace root:

```bash
npm run dev
```

Type-check all workspaces:

```bash
npm run typecheck
```

Build all workspaces:

```bash
npm run build
```

Health check:

```bash
curl http://127.0.0.1:4000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "bayora-api"
}
```

## Environment

Copy `.env.example` to `.env` for local overrides. Do not commit real secrets or credentials.

```bash
API_HOST=127.0.0.1
API_PORT=4000
WEB_PORT=5173
VITE_API_BASE_URL=http://127.0.0.1:4000/api
```

## Future Phases

Later phases can add simulated test orchestration, detection rules, audit persistence, WebSocket events, and eventually real isolation/security integrations. Those features should be implemented behind the existing module boundaries instead of being embedded directly in UI components.

