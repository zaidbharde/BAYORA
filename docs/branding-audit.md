# BAYORA branding audit findings

**Audit date:** 2026-10-27

**Audited baseline:** Manus workspace `main` at `642dd5f705b4a03d542bbedc6d7562f99fe8f95b`; the public `zaidbharde/BAYORA` `main` and Manus canonical `main` matched this SHA before the cleanup. The running Preview health API returned BAYORA, `synthetic-only`, SQLite ready, and protected Phoenix data blocked.

**Scope:** Product-facing identity, source/package metadata, UI copy, API and configuration terminology, scenario/test labels, GitHub repository metadata, upstream/legal references, and direct dependency license metadata. This is a source and metadata audit, not legal advice.

This findings report was first produced by read-only source inspection before the branding and metadata changes. The resolution record below documents subsequent edits.

## Findings and actions

| Finding | Evidence and audience | Classification | Planned action |
| --- | --- | --- | --- |
| Browser title, original BAYORA SVG/favicon, app wordmark, navigation, README title, API `service` field, and most page copy already identified BAYORA. | `index.html`, `public/bayora-mark.svg`, `src/client/components/AppShell.tsx`, `src/client/pages/*`, `README.md`, `src/server/api.ts`. | Consistent product identity; the original signal-aperture mark is BAYORA artwork. | Retain the BAYORA mark and correct existing identity; do not import upstream artwork. |
| The private app package was named `bayora-phoenix` and lacked a description/repository field. | `package.json`; this is BAYORA's own package, not an upstream package dependency. | Actual product-identity inconsistency. | Rename it `bayora-ai-security-workbench`, add a synthetic-only description and the selected repository URL; leave the app private and do not assign an unrequested BAYORA license. |
| The public GitHub repository's editable description, homepage, and topics were empty. | Before metadata update, GitHub API for `zaidbharde/BAYORA` returned description/homepage `null` and no topics. | Incomplete public metadata; no product website was deployed. | Add an accurate synthetic-only description and conservative topics after the verified source push; leave homepage blank because no public product site is deployed. |
| User-visible statuses/errors named Phoenix even though the UI used only a health probe and protected-data routes were blocked. | `App.tsx`, `AppShell.tsx`, `OverviewPage.tsx`, `ObservabilityPage.tsx`, `EvaluationsPage.tsx`, `EnvironmentPage.tsx`, `AuditPage.tsx`, and `src/server/api.ts`. | Product copy should identify the service relationship without presenting Phoenix as BAYORA's identity or implying data integration. | Use neutral “upstream” service wording in user-facing labels/messages while retaining exact technical identifiers and truthful blocked states. |
| Phoenix/Arize names also appear in source-comparison, architecture, acceptance, testing, and legal records. | `plan.md`, `TODO.md`, `docs/backend-audit.md`, `docs/upstream-and-license.md`, setup/architecture/validation docs, `scripts/verify-phoenix-snapshot.py`, and `third-party-notices/phoenix/{LICENSE,IP_NOTICE}`. | Required/material technical provenance and legal attribution, not BAYORA marketing. | Retain upstream identity, source revision, ELv2 text, and Arize IP notice; link the legal record rather than hiding it. |
| No upstream product logo/inherited UI image was found in the product asset references. | `public/`, `index.html`, `app.config.ts`, and client components. | No inherited visual identity detected. | Retain the original BAYORA icon and platform logo metadata. |
| The built-in scenarios/results were already described as local synthetic fixtures rather than real traces or evaluations. | `src/shared/scenarios.ts`, Security Lab, Overview, Findings, Audit, and API tests. | Accurate bounded demonstration. | Keep synthetic-only wording and prevent demo labels from implying real upstream observations or production security outcomes. |
| Phoenix ELv2/IP notices and direct runtime dependency notices were present, but the index omitted direct build/test dependency license texts. | `third-party-notices/README.md`, `third-party-notices/phoenix/`, `third-party-notices/runtime/`, `docs/upstream-and-license.md`, and installed package metadata. | Attribution existed but developer-dependency visibility was incomplete. | Add `docs/THIRD_PARTY_NOTICES.md` covering all pinned direct runtime and development dependencies and their copied notices. |

## Direct dependency license metadata checked

License identifiers and package-distributed license files were read from the installed package manifests at the exact pinned versions in `package.json` and `pnpm-lock.yaml`.

- **Runtime:** `@fontsource-variable/geist` 5.3.0 (OFL-1.1); `@fontsource/ibm-plex-mono` 5.3.0 (OFL-1.1); `express` 5.3.0 (MIT); `lucide-react` 1.61.0 (ISC); `react` 19.3.1 (MIT); `react-dom` 19.3.1 (MIT); `react-router-dom` 7.18.4 (MIT).
- **Development/build/test:** `@eslint/js` 10.0.1 (MIT); `@types/express` 5.0.6 (MIT); `@types/node` 22.20.5 (MIT); `@types/react` 19.3.0 (MIT); `@types/react-dom` 19.3.0 (MIT); `@vitejs/plugin-react` 5.2.0 (MIT); `eslint` 10.13.0 (MIT); `globals` 17.13.0 (MIT); `tsx` 4.23.15 (MIT); `typescript` 5.9.3 (Apache-2.0); `typescript-eslint` 8.72.0 (MIT); `vite` 7.3.7 (MIT).
- **Upstream provenance:** Phoenix at `https://github.com/Arize-ai/phoenix`, exact commit `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`, Elastic License 2.0 with a separate Arize `IP_NOTICE`. No Phoenix application source is bundled.

This inventory covers direct dependencies. The lockfile pins the transitive tree; this report does not claim a human review of every transitive package or provide a legal opinion.

## Final cleanup and verification update — 2026-10-27

The browser title, meta description, original BAYORA SVG mark, favicon, app wordmark, accessible navigation label, package metadata, and README now use the BAYORA identity. `package.json` is private and named `bayora-ai-security-workbench`; its description says synthetic-only and bounded server-side fixtures. The lockfile required no package-resolution change, and frozen installation passes.

Visible health, integration, blocked-data, and empty-state copy now uses neutral upstream/service wording. The `/api/phoenix/*` routes, `PhoenixHealthStatus` code type, `PHOENIX_BASE_URL` configuration contract, API/protocol identifiers, source references in technical documentation, and legally required notices remain intact. Dynamic API error/status messages shown in the UI were also made generic without changing response fields or behavior.

The title remains `BAYORA — AI Security Workbench`; the favicon/app mark is `public/bayora-mark.svg`. The quoted platform `logoUrl` in `app.config.ts` resolves to byte-identical SVG data (SHA-256 `5452293a97affd384959c92e99725ac2abe3bd9897bf8fcba22f5439ce95bc90`).

`docs/THIRD_PARTY_NOTICES.md` indexes all 19 direct dependencies (7 runtime, 12 development/build/test), with versions, declared license, role, and full notice links. All copied license texts were byte-compared to installed distributions, and all 22 local index links resolve. The exact Phoenix ELv2 `LICENSE` and Arize `IP_NOTICE` remain unchanged. No license was assigned to original BAYORA code.

A live Preview request exposed Vite's default rejection of the dynamic Manus SG2 host. `vite.config.ts` now allows only the `.sg2.manus.computer` suffix (it does not set `allowedHosts: true`) and preserves the single-listener HMR fix. `tests/vite-preview.test.ts` asserts the bounded allowlist and HMR configuration; the browser subsequently loaded Overview, Security Lab, Observability, Evaluations, Audit, and Environment successfully.

The post-change local validation gate passed: 46/46 tests, frozen install, preflight, typecheck, lint, production build, and isolated production smoke. Read-only Preview checks used the existing `/tmp/bayora-preview-owner.sqlite` file with its four original synthetic records and did not add or modify records. The rendered brand/navigation/button names were reviewed, and automated assertions cover the wordmark and accessibility semantics; no exhaustive axe/WCAG scan or responsive-device owner review was performed.

Immediately before the first push, GitHub showed `zaidbharde/BAYORA` still on `main` at `642dd5f705b4a03d542bbedc6d7562f99fe8f95b`, public, and writable by the authenticated owner. The description/topics/homepage were blank at that point. The dedicated local branch is `bayora/branding-cleanup`; source push, metadata update, and GitHub Actions verification are pending and must be recorded only after remote confirmation.
