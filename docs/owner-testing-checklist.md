# Owner-testing checklist — prototype checkpoint

Use the Webdev Preview reached from the project workspace; do not treat this local preview as a public deployment.

## Current prototype behavior

1. Open Overview. With an empty browser store, the run and pass counts begin at zero, the fixture catalog reports three available local fixtures, and the Phoenix card reflects the live server status or says it is not configured.
2. Select **Run synthetic suite**. The recorded-run count should rise by three and the fixture-pass count should reflect the actual local outcomes. Each new record has `synthetic-local` mode, the deterministic fixture-engine configuration, a browser-local evidence reference, and `UNSIGNED_UNVERIFIED`, `NOT_REVIEWED`, and `NOT_EVALUATED` statuses.
3. Open Security Lab. Review the threat model, procedure and expected behavior on each fixture. Run one fixture and confirm that the result appears as a local record; no external model or tool should be called.
4. Open Findings. A clean synthetic suite should produce an empty finding state. That empty state is not proof that an AI model or production system is safe.
5. Open Audit & Evidence. Confirm that the run definition/version, timestamp, synthetic dataset reference, seed and no-model configuration are shown, along with unsigned/unreviewed/unaccepted warnings. Change pages or reload to confirm browser-local persistence; a different browser profile will not share the records.
6. Open AI Observability and Environment. Without `PHOENIX_BASE_URL`, the app should report “not configured.” With it set to a reachable Phoenix server, a successful `/healthz` response should be described as health-only. No trace or dataset contents should appear. A 401/403 should stay blocked; an invalid URL should be shown as a configuration error.
7. Inspect `GET /api/health` and `GET /manus-routes.json`; the former should return a BAYORA health response and the latter should return the seven current app page routes as JSON.
8. Check responsive layout and keyboard focus at desktop and narrow mobile widths. Verify that blocked controls are not presented as functioning data operations and that status words accompany color.
9. In a **throwaway browser profile only**, test storage recovery by saving malformed JSON under `bayora.synthetic-runs.v1` with a nested value such as `findings: [null]`, then reload. The app should show a storage warning without crashing. Running a fixture should remain in memory only, and the original malformed value should remain unchanged. Do not edit, clear or replace data in the owner's regular browser profile.

## Explicitly not accepted by this checkpoint

This build is not proof of production-grade adversarial testing, live model coverage, protected identity/access, isolation, real benchmark acceptance, persistent shared run history, cryptographic audit evidence, signed approvals, backup/recovery, or production readiness. Do not treat Phoenix health as those claims. Those gates stay open in `TODO.md` until the exact relevant service, identity and evidence workflows are available and verified.
