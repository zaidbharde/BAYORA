# BAYORA task register

> Acceptance clauses below are copied from the approved master specification. Statuses describe evidence available in this sandbox only; skipped or blocked work is not counted as passed. Update statuses as verified outcomes are delivered.

## Source specification

### Phoenix-Based AI Security Testing Platform

## 1. YOUR ROLE

**Status: PASS.** Role and constraints were applied; original implementation and available validation are complete to the current owner-testing scope.


Act as the Principal Software Architect, Senior Full-Stack Engineer, AI Security Engineer, DevSecOps Engineer, QA Lead, and Release Engineer for BAYORA.

You are starting a fresh implementation effort. Assume no previous planning document or implementation is authoritative until you have inspected and verified the actual source.

Your responsibility is to fetch the upstream source, understand its architecture, create a safe project structure, implement BAYORA-specific functionality, validate the integrated application, and deliver a working browser-based prototype.

Do not stop after producing an audit or design plan. Continue through implementation, testing, documentation, and verified GitHub checkpoints within the capabilities and permissions available to you.

---

## 2. PROJECT OBJECTIVE

**Status: IN PROGRESS.** Separate BAYORA web prototype is runnable and tested; private GitHub transfer and verified owner-testing checkpoint remain pending. Real Phoenix-data integration remains blocked.


Build BAYORA as a professional, browser-based AI security testing and evaluation platform.

Official upstream source:
https://github.com/Arize-ai/phoenix

New project repository:
`BAYORA-Phoenix`

Project goals:

1. Reuse the actual Phoenix backend for the capabilities it already provides and that may legally be reused.
2. Build a distinctive BAYORA frontend.
3. Add BAYORA-specific security-testing and evaluation workflows.
4. Integrate the frontend and backend so that supported actions actually work.
5. Make the application runnable and testable through documented commands.
6. Deliver a verified GitHub checkpoint for owner testing.
7. Continue improving the project after owner feedback.

The target is a functional prototype that can be evaluated in a hackathon or college project, with a path toward production readiness.

Do not claim production readiness until the required security, deployment, and acceptance criteria have been verified.

---

## 3. FETCH AND VERIFY THE ACTUAL UPSTREAM SOURCE

**Status: PASS.** Official main `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1` fetched; a reproducible comparison confirms all 8,447 tracked files match the supplied ZIP byte-for-byte with no missing or extra files. Source architecture and API/auth/database/runtime details are recorded; upstream test execution is tracked separately.


First, obtain the real Phoenix repository from GitHub.

Repository:
https://github.com/Arize-ai/phoenix

If the owner supplies a ZIP archive, inspect its contents and compare its source identity with the official repository where possible.

Do not assume the ZIP is current or complete.

Record:

- Repository URL.
- Default branch.
- Exact starting commit SHA.
- License files.
- Repository structure.
- Required runtimes and dependencies.
- Build and test commands.
- Backend entry points.
- API contracts.
- Database configuration.
- Authentication mechanisms.
- Frontend architecture.
- Existing security controls.
- Relevant upstream tests.

Use the source code as the primary evidence. Documentation is useful, but do not assume an API or feature exists until its implementation or official contract has been verified.

Keep the upstream source separate from the new BAYORA project.

Never push BAYORA changes to the upstream Phoenix repository.

---

## 4. LICENSE, ATTRIBUTION, AND ORIGINALITY

**Status: PASS.** Exact ELv2/IP_NOTICE copies and direct runtime license texts are included; source boundary and hosting limits are documented. No Phoenix application source is copied, and no public Phoenix service is being hosted.


Before copying, modifying, redistributing, or exposing Phoenix-derived functionality, inspect the actual upstream license and relevant third-party licenses.

Phoenix currently identifies its license as Elastic License 2.0. Verify the license in the exact source revision you fetch.

Review the applicable conditions for:

- Self-hosting.
- Modification.
- Redistribution.
- Public source publication.
- Hosted or managed service use.
- Copyright and license notices.
- Third-party components.

Preserve the notices required by the applicable licenses.

Maintain clear records of:

1. Unmodified upstream components.
2. Modified upstream components.
3. Original BAYORA code.
4. Third-party dependencies.
5. The upstream commit used as the baseline.

BAYORA should have its own identity, visual design, security workflows, documentation, and original implementation.

Do not remove upstream notices or alter attribution to make inherited code appear independently authored.

Do not assume that renaming the application or redesigning its frontend changes the licensing obligations associated with its backend.

If public hosting, redistribution, or another intended use requires additional authorization, identify the exact restriction and request the necessary authorization before proceeding with that activity.

If a license restriction blocks a particular deployment model, continue with permitted development and propose a compliant alternative.

Do not claim that permission from an individual contributor overrides the rights of the relevant copyright holder.

---

## 5. ARCHITECTURE — ACTUAL PHOENIX BACKEND

**Status: BLOCKED.** FastAPI, REST/GraphQL, OTLP and health contracts were checked against source, but no authorized Phoenix service/identity is available. BAYORA only probes `/healthz`; protected trace, project, dataset and evaluation operations remain unavailable.


Inspect the real Phoenix backend and reuse its supported functionality instead of rebuilding equivalent systems unnecessarily.

Evaluate the available backend capabilities, including:

- Trace ingestion and retrieval.
- AI execution and tool-call observability.
- Datasets and examples.
- Experiments and evaluations.
- Existing REST and GraphQL APIs.
- Supported OpenTelemetry interfaces.
- Storage and persistence.
- Existing authentication and authorization mechanisms.
- Supported deployment and configuration options.

Verify every capability against the fetched source.

Design the application around clear boundaries:

A. Phoenix backend
Provides the verified upstream observability and evaluation functionality.

B. BAYORA application backend
Provides BAYORA-specific APIs, authorization, orchestration, security-test management, and integration logic.

C. BAYORA security engine
Provides original security-testing workflows, policy checks, isolation validation, result processing, and acceptance logic.

D. BAYORA frontend
Provides the original user experience for configuring tests, monitoring runs, inspecting results, and accessing reports.

E. Audit and evidence layer
Maintains BAYORA-specific evidence and verification records separately from ordinary observability traces.

Do not assume Phoenix traces automatically prove that a security control worked or that a benchmark passed.

Do not represent ordinary application logs as cryptographically verified audit evidence.

Document the data flow between every service and the trust boundaries between them.

---

## 6. DATABASE AND SERVICE CONFIGURATION

**Status: PASS.** Phoenix SQLite/PostgreSQL configuration and separation are documented; BAYORA database remains disabled and its prototype stores only synthetic records in the current browser. Shared persistence, backup, recovery and retention guarantees are explicitly not claimed.


Inspect the actual database requirements of Phoenix and BAYORA.

Phoenix supports SQLite for simpler deployments and PostgreSQL for deployments requiring that database backend. Verify the requirements of the exact version used.

Do not assume that Phoenix can use the BAYORA database directly.

Keep database configurations separate unless a supported integration proves that sharing is appropriate.

Document:

- Database ownership.
- Connection configuration.
- Migrations.
- Persistence locations.
- Backup and recovery.
- Data retention.
- Failure behavior.
- Required environment variables.

Never place production credentials in source files.

Provide example configuration containing placeholders only.

---

## 7. AUTHENTICATION AND AUTHORIZATION

**Status: BLOCKED.** No BAYORA identity provider or authorized Phoenix identity is configured. Protected functionality will remain unavailable as required.


Design the authentication architecture before exposing integrated services.

Inspect Phoenix's actual authentication behavior and BAYORA's existing authentication implementation.

Do not assume authentication is enabled by default.

Verify:

- Who can access the application.
- Who can create and execute test runs.
- Who can inspect protected results.
- Who can access administrative functions.
- Whether identity is validated server-side.
- Whether access-control decisions are enforced on every relevant API.
- Whether sensitive data can leak through reports, traces, or errors.

Use a supported authentication flow and fail closed when required identity information is missing.

Do not treat the first visitor as the owner.

Do not bypass authentication merely to make the demo work.

Do not ask users to place passwords, session cookies, access tokens, or private credentials into chat.

If the available development environment cannot supply an authorized identity, keep protected functionality unavailable and document the blocker.

---

## 8. ORIGINAL BAYORA FRONTEND

**Status: IN PROGRESS.** Seven original responsive routes, live health/error states, honest blocked/empty pages and working local synthetic actions are implemented and smoke-tested; visual/device owner review remains.


Build a polished, responsive web interface that presents BAYORA as its own product.

Inspect the upstream frontend to understand the backend contracts and existing functionality. Reuse components only where technically and legally appropriate.

The BAYORA user experience should focus on AI security testing rather than merely reproducing Phoenix's existing screens.

Required dashboard areas, where supported by the implementation:

#### Overview
- Application and service health.
- Recent test runs.
- Verified execution summaries.
- Security findings.
- Acceptance progress.

#### AI Observability
- Traces and spans.
- Model and tool interactions.
- Execution errors.
- Latency and relevant performance information.
- Links between security tests and their observed executions.

#### Security Testing
- Supported test configurations.
- Authorized execution controls.
- Run progress.
- Results and failure explanations.

#### Red-Team and Blue-Team Workflows
- Available test scenarios.
- Defined security policies.
- Observed outcomes.
- Mitigation results.
- Clear distinction between simulated and real testing.

#### Datasets and Evaluations
- Supported datasets.
- Experiment history.
- Evaluation results.
- Reproducible comparisons.

#### Findings
- Severity.
- Evidence.
- Affected component.
- Reproduction information where safe.
- Remediation recommendations.

#### Audit and Reports
- Test history.
- Evidence integrity status.
- Verification results.
- Authorized report access.

#### Environment and Diagnostics
- Backend health.
- Database availability.
- Model readiness.
- Dependency status.
- Blocked prerequisites.

Do not invent functionality to fill a page.

Every interactive element must perform a real supported operation or clearly communicate that the operation is unavailable.

Use actual backend data where available.

Clearly label demo fixtures and synthetic results.

Do not display fabricated metrics or simulated acceptance results as genuine.

Implement proper loading, empty, error, success, and blocked states.

Ensure the UI does not expose private keys, credentials, protected evaluation artifacts, or sensitive data.

---

## 9. BAYORA-SPECIFIC SECURITY CAPABILITIES

**Status: PASS.** Three deterministic, bounded local fixtures are implemented and tested; they make no model, tool, target-network, isolation, production-security or benchmark-acceptance claim.


Implement original security functionality around the verified Phoenix capabilities.

Start with a clearly bounded synthetic test harness.

Potential capabilities include:

- Controlled adversarial test scenarios.
- Input and output policy validation.
- Prompt-injection resistance evaluation.
- Tool-use policy checks.
- Access-control tests.
- Isolation-boundary validation.
- Model-output safety evaluation.
- Reproducible test execution.
- Result classification and severity.
- Evidence collection.
- Regression comparisons.
- Audit record verification.

These are target capabilities, not claims that they already exist.

For every implemented capability, define:

- Purpose.
- Threat model.
- Inputs and outputs.
- Authorization requirements.
- Test procedure.
- Expected behavior.
- Failure conditions.
- Evidence generated.
- Verification method.

Do not describe a synthetic harness as a production-grade adversarial execution environment.

Do not claim that container configuration alone proves effective isolation.

Do not mark a security control as verified merely because its configuration file contains a corresponding setting.

---

## 10. BENCHMARKS AND EVIDENCE INTEGRITY

**Status: BLOCKED.** Trusted signing key, protected human-review process and authorized Phoenix service are unavailable; no benchmark acceptance or signed evidence will be claimed.


Design the evaluation system so that its results are reproducible and honest.

Each run should record appropriate metadata, such as:

- Run identifier.
- Test definition and version.
- Timestamp.
- Relevant model or configuration version.
- Input dataset reference.
- Random seed where applicable.
- Execution status.
- Results and metrics.
- Evidence references.
- Verification status.

Preserve the distinction between:

- Raw execution results.
- Aggregated metrics.
- Evaluator output.
- Human-review decisions.
- Cryptographic integrity checks.
- Final acceptance decisions.

If signed evidence is required, implement and test the signing and verification process using authorized keys.

Do not fabricate signatures, approval records, or trusted identities.

If a required signing key or protected review process is unavailable, mark the dependent criterion as blocked.

Do not silently lower thresholds or change expected results to make the benchmark pass.

---

## 11. TESTING REQUIREMENTS

**Status: IN PROGRESS.** BAYORA typecheck, lint, 19 tests, production client build, preflight, exact ZIP comparison and live HTTP smoke pass. The isolated Phoenix identifier test file passes 64 tests with 2 warnings. The tox full-unit invocation expanded to the entire unit directory and was interrupted after 1,840 passing outcome lines with no recorded failures/errors and no final pytest summary; the complete upstream suite remains unverified. Protected-data, identity, shared-persistence and production/device integration are not tested.


Establish the baseline for both upstream Phoenix and BAYORA-specific functionality.

Run the checks supported by the available environment.

#### Source and configuration
- Dependency validation.
- Syntax and type checks.
- Configuration validation.
- Static analysis.
- Secret scanning.

#### Frontend
- Production build.
- Type checking and linting.
- Route and component tests.
- Form validation.
- Loading and error states.
- Backend integration.
- Responsive layout checks where practical.

#### Backend
- Unit tests.
- API contract tests.
- Authentication and authorization tests.
- Persistence tests.
- Failure handling.
- Integration tests with Phoenix.

#### System integration
- Service startup.
- Health checks.
- Trace ingestion and retrieval.
- Dataset and evaluation workflows.
- Persistence across restarts.
- BAYORA test-run execution.
- Result display and evidence retrieval.

#### Security
- Unauthorized access attempts.
- Tenant and identity boundaries where applicable.
- Secret redaction.
- Protected-data handling.
- Configuration and dependency review.
- Evidence-integrity verification.

#### Deployment
- Documented setup commands.
- Repeatable startup.
- Preflight checks.
- Safe shutdown.
- Recovery from missing dependencies.
- Clean-environment verification where available.

For every check, record the exact command, result, and relevant limitations.

Do not report skipped tests as passed.

Do not claim the project has been tested on the owner's laptop unless that verification actually occurred.

---

## 12. DEPLOYMENT AND DEVELOPER EXPERIENCE

**Status: PASS.** Reproducible local setup, startup, preflight, health and troubleshooting are documented and verified in this sandbox; safe-shutdown instructions are documented but not separately exercised. Owner-machine, production and Phoenix-data verification remain outstanding.


Provide a simple, reproducible development workflow.

Where appropriate, include:

- A setup command.
- A preflight command.
- Dependency checks.
- Frontend and backend startup commands.
- Phoenix service startup instructions.
- Database initialization.
- Health checks.
- Test commands.
- Safe shutdown and cleanup.
- Troubleshooting documentation.

Reuse existing scripts and configuration where practical.

Avoid unnecessary manual edits.

Make setup idempotent where feasible.

Do not delete user data or trusted artifacts during cleanup.

If Docker is unavailable, investigate whether the required services can be run through their supported non-containerized methods.

Do not assume the sandbox has the same capabilities as the owner's computer.

Document which features work in the available environment and which require external prerequisites.

---

## 13. GITHUB REPOSITORY STRATEGY

**Status: BLOCKED.** BAYORA-Phoenix is absent. Creating/connecting it through the supported owner-confirmation flow remains pending; existing zaidbharde/BAYORA is preserved.


Create or use the separate BAYORA destination only after verifying the current GitHub state and authorized access.

Preferred destination:
`BAYORA-Phoenix`

Before creating it, check whether the repository already exists.

Never overwrite the existing `zaidbharde/BAYORA` repository.

Keep the Phoenix upstream separate.

Choose and document a maintainable upstream strategy, such as a fork, an upstream remote, or an appropriate source integration.

Use a dedicated BAYORA working branch.

For each meaningful change:

1. Implement the change.
2. Run relevant tests.
3. Inspect the diff.
4. Check for secrets and accidental artifacts.
5. Commit with a meaningful message.
6. Push to the authorized BAYORA branch.
7. Verify the remote commit.
8. Update the task register.

Do not force-push or rewrite shared history.

Do not claim a successful push without remote verification.

Preserve license notices and attribution in any published source.

---

## 14. CONTINUOUS IMPLEMENTATION WORKFLOW

**Status: IN PROGRESS.** Continuous inspect/implement/test/review/document/checkpoint loop will be maintained.


Follow this loop continuously:

INSPECT → IMPLEMENT → TEST → REVIEW → DOCUMENT → COMMIT → PUSH → VERIFY → CONTINUE

Maintain a task register with statuses:

- READY.
- IN PROGRESS.
- PASS.
- FAIL.
- BLOCKED.
- NOT TESTED.

Prioritize tasks that unblock other work.

When a test fails:

1. Capture the actual sanitized error.
2. Reproduce it where feasible.
3. Identify the root cause.
4. Implement a justified fix.
5. Add regression coverage where appropriate.
6. Rerun relevant tests.
7. Commit and push the verified change.
8. Continue to the next actionable task.

Do not stop after the first successful build or a documentation update.

Do not fabricate results or bypass acceptance requirements.

When external authorization, protected credentials, or infrastructure is unavailable, finish independent work and document the exact remaining blocker.

---

## 15. OWNER-TESTING CHECKPOINT

**Status: READY.** Owner-testing checkpoint has not been created; requires implementation, checks, repository confirmation and remote SHA verification.


Once the initial integrated application is runnable and its available tests pass:

- Push a verified checkpoint to GitHub.
- Provide the exact commit SHA.
- Provide the browser URL and startup commands.
- List the available pages and working workflows.
- Explain which features use real backend data.
- Identify synthetic/demo data clearly.
- Report all tests run and their results.
- List known issues and blocked functionality.
- Provide a manual testing checklist.

Pause further major development and wait for the owner's feedback at this checkpoint.

After the owner approves continuation, resume from the latest verified remote commit, reproduce reported issues, fix them, run regression tests, and continue implementation.

---

## 16. FINAL DELIVERABLES

**Status: IN PROGRESS.** Baseline, original frontend, synthetic harness, architecture/setup/license documentation, regression tests, validation evidence and owner checklist are delivered; protected Phoenix-data integration and verified GitHub owner-testing checkpoint remain.


Deliver:

1. A verified Phoenix upstream baseline.
2. A separate BAYORA repository.
3. A documented architecture.
4. A working BAYORA web frontend.
5. An actual, verified Phoenix backend integration.
6. BAYORA-specific security-testing functionality.
7. Integration and regression tests.
8. Reproducible setup and deployment instructions.
9. License and attribution documentation.
10. A verified GitHub owner-testing checkpoint.
11. A list of remaining acceptance requirements and risks.

The final report must distinguish upstream functionality from original BAYORA functionality.

Never claim that the project is production-ready or fully accepted merely because the UI renders or the upstream tests pass.

---

## 17. START EXECUTION

**Status: PASS.** Execution started; official upstream fetched and verified against the supplied archive, source and GitHub state inspected, plan approved.


Start by fetching and verifying the actual Phoenix repository.

Inspect the license and backend architecture.

Establish a safe, separate BAYORA working repository.

Then proceed with implementation, integration, testing, and verified GitHub checkpoints.

Do not modify the existing BAYORA repository.

Do not stop after writing a plan.

Deliver real, testable functionality, with honest evidence and clearly documented limitations.
