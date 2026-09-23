# BAYORA

**Secure Adversarial AI Testing Infrastructure**

Bayora is a security-focused platform designed to provide a controlled environment for adversarial AI testing.

The platform is designed around isolated Red Team testing, Blue Team monitoring, Client LLM evaluation, security event tracking, and auditable testing workflows.

The current implementation focuses on the core platform foundation and a modular architecture that can be extended with advanced security infrastructure over time.

## Current Capabilities

- React + Vite + TypeScript frontend.
- Node.js + Fastify + TypeScript backend.
- REST API communication between frontend and backend.
- System health monitoring.
- Modular security architecture.
- Shared TypeScript contracts between applications.
- Environment-based configuration.
- Extensible module boundaries for testing, monitoring, LLM evaluation, security, and auditing.

## Architecture

```text
bayora/
├── apps/
│   ├── web/          React frontend
│   └── api/          Fastify backend
├── packages/
│   ├── shared/       Shared TypeScript contracts
│   └── config/       Shared configuration
├── docs/             Architecture documentation
├── package.json      Workspace configuration
└── tsconfig.base.json
