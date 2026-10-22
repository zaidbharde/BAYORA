# Phase 12 repository audit

Audit date: 2026-10-22
Repository: `https://github.com/zaidbharde/BAYORA.git`
Status: Phase 12 remains **IN PROGRESS — NOT ACCEPTED**.

## Scope reviewed

Reviewed README/checkpoint/Make targets, Compose networks and mounts, all Dockerfiles, provisioning and model/key scripts, Phase 12 coordinator/Evaluator/Replay/Audit client/preflight and tests, `llm_sandbox/verify_model.py`, documentation and diagrams, `.gitignore`, requirements, packaged reports, and available local runtime status. The GitHub repository page reports that the remote is empty. The supplied local project has no Git metadata.

## Findings

| Severity | Finding and evidence | Disposition |
|---|---|---|
| High | Preflight treated failed `sudo docker` calls as absent images. In this environment, Docker/Compose CLIs exist but noninteractive sudo authorization to the expected daemon is unavailable, so the old output could not distinguish inaccessible from absent images. | Fixed: preflight now checks Compose and daemon access first, classifies only allowlisted error categories, and reports images as uninspected until daemon access succeeds. Added regression tests. |
| High | `make config-check` used sudo for `docker compose config -q`, a local configuration parse that needs no daemon. This made static validation depend on interactive sudo. | Fixed: the config-only check now runs as the current user. Runtime targets still use the expected sudo-managed daemon. |
| High | Local ciphertext bundles live under `secrets/`, which `.gitignore` excludes, while older provisioning text called them checked-in. A clone from GitHub will not receive them. | Fixed documentation: obtain the approved ciphertexts from the project artifact custodian and compare their hashes with the tracked source manifest. Preflight now validates the three recorded ciphertext hashes. Never regenerate them to work around a mismatch. |
| High | Authorized Red/Blue/Evaluator identities and Audit/Gateway private signing keys are absent locally. | Blocked on authorized custodian delivery. No replacement material was generated. Preflight now checks Audit/Gateway derived-public-key correspondence when both pair files exist and enforces the documented Audit key ownership/mode. |
| High | The Ollama model directory is empty, and the project has no independently approved immutable model digest in its local verification contract. `verify_model.py` proves blob hashes against the supplied Ollama manifest, not provenance. The preparation script pulls a mutable model tag. | Blocked on authorized model source/version and expected hash approval. Do not run the pull helper until approved provenance and hash comparison are supplied. |
| High | The protected review procedure/interface and reviewer sign-off for 30 generated attempts are not available. The 30-row labeled holdout is only calibration. | Acceptance blocker. Requires an approved protected review workflow and real reviewer sign-off after a benchmark; no plaintext capture was displayed or exported. |
| Medium | The expected sudo Docker daemon could not be inspected from this agent session. The previous user-reported presence of four BAYORA images is not independently verified here. | Preflight reports daemon access unavailable; an authorized interactive operator must run the runtime checks on the intended host. No alternate daemon/context was selected. |
| Medium | Compose image references are tags, and no approved immutable digest set was found in the repository. | No digest was invented or substituted. Release owner must supply approved image provenance/digests and artifacts. |

## Controls confirmed

- `.gitignore` excludes `secrets/`, Ollama model files, append-only `data/audit/`, Python caches, `.env` files, age identities, and common private-key filenames. These local artifacts are not to be staged or pushed.
- Compose config sets tenant services to non-root users, read-only roots, dropped capabilities, resource bounds, restricted internal networks, and tmpfs. Dashboard host binding is loopback-only. The pinned image tags are used with `--pull never` by runtime Make targets.
- Phase 12 orchestration captures Red output in memory and encrypts before persistence; released tenant files use exclusive mode `0600`; lifecycle validation, signed seal-root verification, chunk hashes, cleanup, and independent Replay checks have regression coverage.
- `scripts/prepare_phase12_data.py` can create an Evaluator age identity when absent. It must not be used to repair this host because that would produce an identity unrelated to the approved existing ciphertexts. Provisioning documentation explicitly forbids that recovery path.
- Public aggregate report files contain aggregate-only evaluator/replay data; no decrypted captures or private key material were included in the Git candidate set.

## Validation run for this audit

| Command | Result | Notes |
|---|---|---|
| `make config-check` | PASS, exit 0 | Python compilation, canary JSON, and unprivileged Compose config parse passed. |
| `make test-phase12-unit` | PASS, exit 0 | Unit: 8 cases, 6 passed / 2 credential-dependent skipped. Orchestration: 6 passed. Preflight tests: 7 passed. Gateway/Blue profile tests skipped because noninteractive sudo cannot access the expected daemon. |
| `make phase12-preflight` | BLOCKED, exit 2 | Tools and encrypted bundle hashes passed. Authorized identities/signing keys, model files, and expected daemon access remain unavailable. Images are correctly reported uninspected because the daemon was inaccessible. |
| `make test-phase12` | NOT RUN | Preflight is blocked. |
| `make verify-audit`, `make report` | NOT RUN in this validation sequence | Later acceptance stages were not run while required runtime prerequisites are blocked. |

The full A/B/C benchmark, runtime Gateway/Blue profile checks, human review, and full-run Replay equality remain unverified. Do not mark Phase 12 accepted.
