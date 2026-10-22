# Isolation / Hardening Report

Generated: 2026-10-10T20:07:01.020193+00:00

| Test | Result | Evidence |
|---|---|---|
| BASELINE | PASS | non-root; read-only; cap-drop ALL; no-new-privileges; bounded PID/CPU/memory; non-host namespaces |
| T01-T03 | PASS | T01 PASS: direct Blue/LLM IP access denied; T02 PASS: Blue/LLM/orchestrator names do not resolve; T03 PASS: only Gateway reachable among attached Red-network endpoints |
| T05/T07-FS | PASS | Red has no host bind mounts/docker.sock; rootfs rejects writes; only bounded /tmp tmpfs is writable |
| T04 | PASS | internal=True; bounded egress probe: OSError |
| T06 | PASS | mount/unshare/ptrace/init_module blocked with EPERM: [('unshare', -1, 1), ('mount', -1, 1), ('ptrace', -1, 1), ('init_module', -1, 1)] |
| T07 | PASS | host=pid:[4026531836]; container=pid:[4026532721] visible_pids=3 |
| T17 | PASS | tmpfs ENOSPC; pids cap reached at 61; memory probe rc=137; Red health after probe=healthy |
| USERNS | PASS | daemon security options=["name=seccomp,profile=builtin","name=userns","name=cgroupns"]; uid_map=0     100000      65536 |

## Phase 9 — LLM/session controls

Run time (UTC): 2026-10-10T20:29:26+00:00

| Test | Result | Evidence |
|---|---|---|
| T09 | PASS | Red request canary absent from durable logs/Audit; tmpfs file removed |
| T10 | PASS | Blue raw/Base64/hex/ROT13 canary redacted; absent from Red-visible replies |
| T12 | PASS | 32 distinct Gateway session hashes; prior marker not returned; operator reset signed |
| T13 | PASS | KS D=0.333, p=0.4333; medians=1506.8/1477.7ms; cached-counter samples=0 |
| T16 | PASS | five model blob hashes verified before/after Phase 9 requests |
| CACHE-METRIC | LIMITED | Pinned Ollama 0.6.8 omitted prompt_eval_cached_count; no cache reuse control could be proven from that metric |

## Phase 9 — LLM/session controls

Run time (UTC): 2026-10-10T20:31:41+00:00

| Test | Result | Evidence |
|---|---|---|
| T09 | PASS | Red canary absent from Gateway/Blue/LLM app/tmp, logs and Audit; Red tmpfs source removed |
| T10 | PASS | Blue raw/Base64/hex/ROT13 canary redacted; absent from Red-visible replies |
| T12 | PASS | 32 distinct Gateway session hashes; prior marker not returned; operator reset signed |
| T13 | PASS | KS D=0.250, p=0.7864; medians=1466.4/1491.7ms; cached-counter samples=0 |
| T16 | PASS | five model blob hashes verified before/after Phase 9 requests |
| CACHE-METRIC | LIMITED | Pinned Ollama 0.6.8 omitted prompt_eval_cached_count; no cache reuse control could be proven from that metric |

## Phase 10 — timing and fairness

Run time (UTC): 2026-10-10T20:48:29+00:00

| Test | Result | Evidence |
|---|---|---|
| PHASE10 | FAIL/BLOCKED | T11 response-time distributions differ after bucketing: {'rule': {'D': 1.0, 'p': 1.8879793657162556e-05}, 'classifier': {'D': 1.0, 'p': 1.8879793657162556e-05}, 'output': {'D': 0.20000000000000007, 'p': 0.9747892465409951}} |

## Phase 10 — timing and fairness

Run time (UTC): 2026-10-10T20:55:14+00:00

| Test | Result | Evidence |
|---|---|---|
| T11 | PASS | 10 each: allow/rule/classifier/output; all padded=5000ms; KS p=rule:0.313, classifier:0.111, output:0.675 |
| T14 | PASS | Red CPU worker isolated; n=6/6; KS p=0.810; median Δ=0.2ms; p95 Δ=0.8ms |

## Observability and violation handling

Run time (UTC): 2026-10-11T06:48:50+00:00

| Test | Result | Evidence |
|---|---|---|
| T18 | PASS | 5 rejection classes; rate-limit hits=13; 32 signed violations; Red/Blue monitoring blocked; both operator alerts firing; aggregate dashboard only |


## Phase 12 pre-build validation milestone — 2026-10-11

- `make config-check` PASS for the existing project targets; direct `python3 -m py_compile scripts/prepare_phase12_data.py evaluator/judge.py red_engine/eval_runner.py gateway/app.py` and `git diff --check` PASS. The project-wide Make target has not yet been extended to include the new Phase 12 modules.
- `python3 tests/phase12_unit.py` PASS: 5 deterministic tests covering encrypted bundle consistency/mode/ignore rules, provisioner schema guard, judge/refusal behavior and 30-row human-majority calibration, in-memory Red chunk capture, and the 50-record cap. Its first run exposed only a one-row synthetic fixture that violated the intentional 100-row source guard; the fixture was corrected to 100 rows and the complete suite then passed.
- `python3 tests/phase12_gateway_modes.py` PASS in the existing Gateway dependency image with networking disabled: operator values `none`, `rules`, and `full` import; an unsupported value is rejected; client-supplied `blue_mode` is ignored; sample/strategy validation is enforced. The test did not rebuild or restart services.
- These are focused pre-build checks only. Blue's rules-only implementation and Compose profile wiring are still pending; no A/B/C run or benchmark result exists, and Phase 12 is not accepted.


## Phase 12 operator profiles — 2026-10-11

- Added Gateway `BAYORA_BLUE_MODE` (`none`, `rules`, `full`; invalid values fail startup) and Blue `BAYORA_BLUE_PROFILE` (`rules`, `full`; invalid values fail startup). Compose defaults both to `full`; these are service-start environment settings, not tenant request fields. Rules-only still applies input regex rules and output rule/canary handling while skipping only the toy input classifier.
- `sudo docker compose config -q` — PASS. `python3 tests/phase12_gateway_modes.py` — PASS with `--network none` against the existing Gateway dependency image, including all valid modes, rejection of an unsupported mode, ignored tenant `blue_mode`, and field validation. `python3 tests/phase12_blue_profiles.py` — PASS with `--network none` against the existing Blue dependency image: rules-only regex block/classifier-only allow/output canary sanitize; full-mode classifier block; unsupported profile rejected.
- No Phase 12 image has been rebuilt and no long-running service was changed. No A/B/C benchmark has started; the profile tests are bounded code-level checks, not Phase 12 acceptance.


## Phase 12 orchestration preparation — 2026-10-11

Added `evaluator/metrics.py` for deterministic aggregate metrics and `tests/phase12_audit_client.py` for bounded hash/metadata-only Audit batches. These files are not yet compiled, tested, or Compose-mounted. The trusted host orchestrator, result encryption lifecycle, `JUDGE_RESULT` evidence, Evaluator, and independent replay are still pending. No benchmark has run; there are no A/B/C metrics to report.


## Phase 12 helper integration milestone — 2026-10-11

- Added `evaluator/metrics.py` and extended `tests/phase12_unit.py` with deterministic metric/percentile and Audit-client bounds tests. Mounted `tests/phase12_audit_client.py` in `audit-test`; added current Phase 12 modules to `make config-check` and registered `make test-phase12-unit`.
- `python3 -m py_compile evaluator/metrics.py tests/phase12_audit_client.py tests/phase12_unit.py` — PASS. `make config-check` — PASS. `make test-phase12-unit` — PASS (7 unit tests, Gateway mode checks, Blue profile checks). Actual isolated Audit batch client smoke — PASS, metadata-only `RUN_CREATED` under run ID `phase12-audit-smoke-20261011`; `python3 tools/bayora_verify.py` — PASS (`entries=2143`, `checkpoints=28`). `git diff --check` — PASS.
- No service image was rebuilt or recreated. No A/B/C benchmark started. The next milestone is a mocked/unit-tested trusted-host orchestrator, followed by Evaluator/replay.


## Phase 12 trusted-host orchestration and bounded smoke — 2026-10-11

- Implemented the trusted-host A/B/C runner, encrypted per-chunk capture, signed hash-only judging events, Evaluator, and separate Replay. Each Red invocation is limited to 1–50 rows. Captured runner stdout is held in memory and age-encrypted before any parsing or persistence. Prompts/replies were not printed or stored in plaintext. The evaluator/replay verify signed Gateway input/output hashes against the encrypted captures and post-seal revealed source rows. The Replay uses separate metric-aggregation code and compares exact JSON metric objects with the Evaluator.
- `make config-check` — PASS; `make test-phase12-unit` — PASS: seven Phase 12 unit tests, five orchestration tests, Gateway profiles `none`/`rules`/`full` and unsupported/tenant-selected rejection, Blue profiles `rules`/`full` and unsupported/tenant-selected rejection; `git diff --check` — PASS. Phase 3 Gateway and Phase 5 Blue/Gateway regressions passed after changing the Phase 3 fixture's now-invalid test strategy to valid `direct`.
- Fixed the Red runner's file-invocation import root (`/app`), rebuilt/imported the Red image using the isolated builder, and recreated only Red. The running container was healthy and its file-level probe confirmed the fix. Builder and remapped image IDs differed while rootfs layer digests matched; the ID discrepancy is recorded and no identical-ID claim is made.
- `python3 tests/phase12.py --smoke-count 1` — PASS: one item per A/B/C, seed 42; commit/release, encrypted capture, seal, model reset, reveal, judging, signed Audit append, cleanup, and independent replay all completed. Exact Evaluator/Replay metrics equality passed. `python3 tools/bayora_verify.py` — PASS (`entries=2201`, `checkpoints=32`). Gateway, Blue, Red, Audit, and Ollama were healthy after the run.
- Smoke latency only: A raw/padded p50=p95 `3762.440/5000 ms`; B `5207.616/10000 ms`; C `4516.693/5000 ms`. Each mode has n=1 and no benign item, so false-positive rate is undefined. These are **not A/B/C benchmark results** and do not support safety or comparative efficacy claims. The evaluator's 30-item calibration is a deterministic, stratified holdout from the pinned JBB `human_majority` labels (15 per class), not manual annotation.
- Two earlier Mode A smoke attempts stopped before any `ATTACK_RECEIVED`; they are signed as aborted, temporary Red/Blue files were removed, and no raw response was emitted. The failure was the import-root defect corrected above.
- Phase 12 remains **in progress and unaccepted**. The prescribed full 200-item-per-mode benchmark has not run. Phase 13 has not started. Current machine-readable smoke evidence: `reports/phase12_run_set.json`, `reports/phase12_evaluator.json`, `reports/phase12_replay.json`; encrypted captures remain under ignored `secrets/phase12_runs/`.
- Resume with `make test-phase12`; then verify full-run Audit/hash/cleanup evidence and exact replay equality before updating Phase 12 acceptance status.


## Phase 12 packaged-repository verification — 2026-10-22

- Repository re-extracted from the supplied archive. Static validation passed independently: the complete Makefile Python compile list, Phase 12 modules, and Blue canary JSON all validated successfully.
- `make config-check` was attempted and reached the final Compose check, then blocked because Docker is unavailable in this sandbox (`sudo: docker command not found`). This is an environment blocker, not a reported Compose/config defect.
- `make test-phase12-unit` initially errored in two credential-dependent tests because the `age` executable was absent. No private age identities are present in the archive, so keys were not generated or requested in chat.
- Resource inspection found no private age keys, no Ollama model files, no Docker executable/images/services, and no Git metadata. Consequently, no service startup, bounded protocol smoke, full 200-item-per-mode benchmark, Evaluator, Replay, or Audit verification was run from this environment.

## Phase 12 readiness gate and Master Prompt deliverables — 2026-10-22

- Added a fail-closed `tools/phase12_preflight.py` and two container-free tests. The tests passed and the new modules compiled successfully. The checker emits only aggregate readiness status and never decrypts or prints secrets.
- Added `README.md`, `docs/residual_risk.md`, and eight standalone Mermaid diagrams covering architecture, topology, request flow, lifecycle, commit/reveal, Audit chain, threat controls, and residual leak channels.
- Added Make targets for `phase12-preflight`, `run-abc`, `replay`, and `report`; the real benchmark target now gates service startup on the preflight.
- The actual preflight was run and correctly returned `PHASE12_PREFLIGHT_BLOCKED` (exit 2): `age`, Docker, private identities, Ollama model files, and required images/services are unavailable in this sandbox. Encrypted public bundles are present. No benchmark or new runtime security claim was made.

## Phase 12 bounded-suite portability hardening — 2026-10-22

- Credential-dependent unit checks now emit explicit `SKIP` results when local age identities or `age` are absent; Docker-dependent profile checks emit explicit `SKIP` results when Docker is absent. This prevents an archive packaging blocker from being misreported as a code failure.
- `make test-phase12-unit` completed: Phase 12 unit tests **5 passed, 2 skipped**; orchestration **5/5 passed**; preflight tests **2/2 passed**; Gateway and Blue profile checks skipped because Docker is unavailable. These are bounded/code-level results, not benchmark results.
- The full Phase 12 benchmark remains blocked by absent runtime prerequisites. No A/B/C metrics, Audit run, Evaluator run, or Replay acceptance is claimed.

## Phase 12 independent packaged-tree verification — 2026-10-22

- Confirmed the archive's project root is `bayora/`; the packaged tree has no Git metadata, so current Git status/diff cannot be established. No `AGENTS.md` was found in the packaged tree or parent scan.
- `make test-phase12-unit` — PASS, exit 0: 5 Phase 12 unit tests passed and 2 credential tests explicitly skipped; 5 orchestration tests passed; 2 preflight tests passed; Gateway/Blue Docker profile checks explicitly skipped because Docker is unavailable.
- `python3 -m py_compile $(find app audit_service blue_engine evaluator gateway llm_sandbox observability red_engine scripts tests tools -type f -name '*.py' -print)` — PASS, exit 0.
- `make config-check` — BLOCKED, exit 2 at `sudo docker compose config -q` because sudo could not authenticate without a terminal. Docker/Compose are absent per environment inspection and preflight; Compose validation therefore did not occur.
- `python3 tools/phase12_preflight.py` — BLOCKED, exit 2. Missing: `age`, `age-keygen`, Docker/Compose, Red/Blue/Evaluator identities, Audit/Gateway private keys, Ollama model files, and required images. Encrypted bundles and OpenSSL were present. No keys were created, and no protected data was printed.
- No live protocol smoke, benchmark, Audit verification, Evaluator, or Replay ran. No A/B/C metrics or acceptance claim is made. Phase 12 remains **IN PROGRESS**. Next command on a provisioned trusted Docker host with authorized project materials: `make test-phase12`.

## Phase 12 follow-up security review — 2026-10-22

- Review found tenant tmpfs releases were created with Python's default file mode. `tests/phase12.py` now uses exclusive creation with explicit mode `0600` for Red and Blue plaintext release files. Added a focused test that performs the delivery code against a temporary path and checks the exact bytes and mode. Changed files: `tests/phase12.py`, `tests/phase12_orchestrator.py`, `CHECKPOINT.md`, `reports/isolation_report.md`.
- `python3 tests/phase12_orchestrator.py` — PASS, 6/6. `make test-phase12-unit` — PASS: 5 unit tests passed, 2 skipped for missing `age`/identities; 6 orchestration tests passed; 2 preflight tests passed; Gateway and Blue profile checks skipped because Docker is unavailable. `python3 -m py_compile tests/phase12.py tests/phase12_orchestrator.py` — PASS.
- `make config-check` passed static Python compilation and JSON parsing, then was BLOCKED at Compose validation: Docker is absent, and sudo could not authenticate noninteractively. `make phase12-preflight` — BLOCKED, exit 2 for missing age tools, Docker/Compose, authorized private material, Ollama model files, and required images.
- `make verify-audit` — PASS: `VERIFY_PASS entries=2201 checkpoints=32`.
- `make report` — BLOCKED, exit 2: independent Replay exited with `PHASE12_REPLAY_FAIL: FileNotFoundError` because age and authorized private identities are absent. The packaged smoke reports are not full benchmark evidence.
- No A/B/C benchmark was run; no new metrics or replay equality claim is made. Phase 12 remains **IN PROGRESS**. Provision the trusted host with the pinned runtime and authorized project material, run `make config-check`, `make test-phase12-unit`, and `make phase12-preflight`; run `make test-phase12` only after those gates pass.

## Phase 12 lifecycle and host-readiness hardening — 2026-10-22

- Security review found Evaluator and Replay treated any cleanup record with `tmpfs_cleaned=true` as success, including an aborted run, and did not verify the signed `RUN_SEALED.artifact_root` against encrypted chunk hashes. Both independent paths now require unique, ordered lifecycle evidence, a completed cleanup status, matching mode/seed/count, a valid model reset, and a seal root derived from manifest chunk digests. New unit coverage rejects aborted cleanup, incomplete lifecycle evidence, and tampered roots in each path.
- Preflight now checks Docker through the same sudo-managed daemon used by Make. This closes a daemon-context mismatch that could falsely report pinned images missing on hosts where only privileged Docker access is configured. Added mocked regression coverage. Related Make recipe indentation was normalized.
- Added and linked `docs/PHASE12_LINUX_PROVISIONING.md` with reproducible host setup, approved key/image/model sourcing requirements, secure permissions, and gate/run order. It explicitly forbids replacing missing authorized identities or trusting unreviewed image/model sources.
- `make test-phase12-unit` — PASS: 8 unit tests passed, 2 credential tests skipped (age tool/authorized identities absent); 6 orchestration tests passed; 3 preflight tests passed; Gateway/Blue profile suites skipped because Docker is unavailable. Full Python tree compilation via `python3 -m py_compile $(find app audit_service blue_engine evaluator gateway llm_sandbox observability red_engine scripts tests tools -type f -name '*.py' -print)` — PASS.
- `make config-check` — static compilation and JSON parsing PASS, Compose validation BLOCKED (Docker absent; sudo cannot authenticate without a terminal). `make phase12-preflight` — BLOCKED, exit 2: missing age tools, Docker/Compose, authorized identities/private keys, model files, and required images. Make dry-runs for `test-phase12` and `report` resolved to the intended command sequences.
- The packaged Audit chain was last verified `VERIFY_PASS entries=2201 checkpoints=32`; it was not modified during this milestone. No full benchmark was run. No benchmark metrics or successful Replay equality claim is made. Phase 12 remains **IN PROGRESS**.
- Next action on the trusted provisioned host: follow `docs/PHASE12_LINUX_PROVISIONING.md`, run `make config-check`, `make test-phase12-unit`, and `make phase12-preflight`; only if those pass, run `make test-phase12`, then `make verify-audit` and `make report`.

## Phase 12 final validation attempt — 2026-10-22

- Re-read the checkpoint, README, provisioning instructions, Make/Compose wiring, Phase 12 orchestration, Evaluator, Replay, Audit client, and tests. Confirmed current code contains lifecycle/seal-root validation, private tmpfs file creation, and preflight Docker daemon alignment. This packaged repository has no Git metadata.
- `make config-check` — Python compilation and JSON parsing PASS; Compose check BLOCKED, exit 2 (`sudo docker compose config -q`: Docker absent; sudo cannot authenticate without a terminal).
- `make test-phase12-unit` — PASS, exit 0: unit 8 passed / 2 skipped for missing age tooling/authorized identities; orchestration 6/6 passed; preflight tests 3/3 passed; Gateway/Blue profile suites SKIPPED because Docker is unavailable.
- `make phase12-preflight` — BLOCKED, exit 2: Docker/Compose, `age`/`age-keygen`, authorized Red/Blue/Evaluator age identities, Audit/Gateway private keys, Ollama model files, and required local images are missing. OpenSSL and encrypted source bundles are present. No credentials were generated or printed.
- Full Python source-tree compile — PASS. Ruff, Bandit, and mypy are unavailable; no results from those tools are claimed.
- Added fail-closed lifecycle checks in Evaluator and independent Replay for commit/seal input-digest binding, signed `sealed=true`, unique records, lifecycle order, successful cleanup, and chunk-derived artifact root. Tests exercise valid, aborted, tampered, incomplete, reordered, duplicate, and improperly sealed evidence.
- Provisioning notes now distinguish the 30-row labeled JBB holdout calibration from the required human review of 30 generated attempts. The repository lacks an approved protected review interface; this manual acceptance evidence remains outstanding.
- No benchmark or live profile checks ran because preflight failed. No benchmark metrics or successful Replay equality are claimed. Audit was last verified earlier in this session at `VERIFY_PASS entries=2201 checkpoints=32`; the Audit file and verifier were not changed. `make report` was not run because the prerequisite gate did not pass.
- Phase 12 remains **IN PROGRESS and NOT ACCEPTED**. Next: provision authorized host material and runtime per `docs/PHASE12_LINUX_PROVISIONING.md`, rerun the three gates, and proceed only after preflight passes. Then run the benchmark, Audit verification, Replay, and approved protected human review before any acceptance decision.

## Phase 12 trusted-host readiness recheck — 2026-10-22

Fresh observations from the current working tree (status only; no private values or capture plaintext accessed):

- Present executables: Python 3, Make, OpenSSL. Missing executables: Docker CLI, standalone Compose, `age`, `age-keygen`, Ollama. Since Docker CLI is absent, no rootful daemon or local image inspect can run. Make's expected daemon remains `sudo docker`; preflight uses that same daemon for non-root execution. No context switch or sudo bypass was attempted.
- Missing authorized files: Red/Blue/Evaluator `.agekey` identities and Audit/Gateway private signing keys. Public signing keys and encrypted source bundles are present. `secrets/` is mode `0700`; inspected encrypted run manifests/chunks and source bundles are mode `0600`. Ollama model directory has zero files.
- `make config-check` — BLOCKED, exit 2. Python compilation and Blue canary JSON validation passed; Compose validation could not run at `sudo docker compose config -q` (`sudo: A terminal is required to authenticate`; Docker CLI absent).
- `make test-phase12-unit` — PASS, exit 0: unit suite 8 tests, 6 passed and 2 skipped because age/authorized identities are unavailable; orchestration 6/6 passed; preflight regression tests 3/3 passed. Gateway and Blue runtime profile suites explicitly SKIPPED because Docker is unavailable.
- `make phase12-preflight` — BLOCKED, exit 2. It reported missing `age`, `age-keygen`, Docker/Compose, all three authorized age identities, Audit/Gateway private keys, model files, and five pinned local images. It reported OpenSSL and the encrypted Red input, Blue reveal, and judge-training bundles present.
- Review of implementation and docs found no daemon mismatch: Make uses rootful `sudo docker compose`, and preflight uses `sudo docker` for non-root, failing closed if the expected tools/daemon are unusable. The guide's model pull helper uses a mutable tag and is expressly conditional on approval and hash comparison; the approved supply chain remains authoritative. The guide correctly says the 30-row labeled JBB holdout is not a protected manual review of 30 generated attempts.

| Prerequisite | Observed status | Remediation | Resolvable here? |
|---|---|---|---|
| Docker Engine/Compose, rootful daemon | CLI/Compose missing; daemon unavailable | Install Docker Engine and Compose v2 per `docs/PHASE12_LINUX_PROVISIONING.md`; use documented rootful daemon | No |
| `age` / `age-keygen` | Missing | Install from trusted distribution package per guide | No |
| Authorized Red/Blue/Evaluator identities | All absent | Obtain original matching identities from authorized custodian; do not regenerate | No |
| Audit/Gateway signing keys | Private keys absent; public keys present | Obtain matching authorized private keys via approved secret delivery and apply guide permissions | No |
| Approved local images | Five required images reported missing | Load reviewed, approved archives into same rootful daemon per guide | No |
| Pinned Ollama model files | Model directory empty | Stage approved `qwen2.5:0.5b`; validate provenance and approved hashes | No |
| Encrypted capture access and Replay | Encrypted captures exist at mode 0600; age tool and Evaluator identity absent | Provision authorized tool/identity and run Replay only inside trusted workflow | No |
| Protected review of 30 generated attempts | No approved protected procedure/interface or reviewer sign-off | Authorized owner provides protected review workflow; obtain actual reviewer sign-off after benchmark | No |

No live benchmark was started because preflight failed. No A/B/C metrics, refusal/harmfulness benchmark results, protected manual review, full-run Replay equality, or new Audit verification are claimed. The last recorded Audit verification remains `VERIFY_PASS entries=2201 checkpoints=32` from the prior milestone. No Phase 12 code was changed in this recheck; documentation now records the latest observed statuses. Phase 12 remains **IN PROGRESS and NOT ACCEPTED**.

**Next action:** an authorized Linux host owner provisions original project identities/signing keys and approved runtime assets by following `docs/PHASE12_LINUX_PROVISIONING.md`, then runs `make config-check`, `make test-phase12-unit`, and `make phase12-preflight`. Continue to `make test-phase12` only if all three gates pass. Git metadata is absent; no Git diff or cleanliness status is asserted.

## Phase 12 repository audit and GitHub preparation — 2026-10-22

- GitHub source check: [`zaidbharde/BAYORA`](https://github.com/zaidbharde/BAYORA) is empty; `git ls-remote --symref ... HEAD refs/heads/*` returned no refs. Local project has no Git metadata. No existing branch/history will be overwritten.
- Runtime tool probe: Docker 29.1.3, Compose 2.40.3, age/age-keygen 1.2.1, OpenSSL 3.5.5. `sudo -n docker compose version` — BLOCKED, exit 1 (`sudo: interactive authentication is required`). Thus the expected rootful daemon and claimed existing BAYORA images could not be independently inspected. Current preflight correctly reports image checks as uninspected.
- Audit uncovered a preflight reliability defect: it previously converted every failed privileged `docker image inspect` into “missing,” including sudo-authentication failures. Fixed it to test Compose and daemon access first, sanitize command failures into allowlisted detail strings, and skip image inspection until the expected daemon is reachable. Added tests for auth denial and confirmed missing-image behavior.
- Preflight now checks encrypted bundle SHA-256 values against `reports/phase12_source.json`, verifies Audit/Gateway public-private key correspondence using captured derived public bytes only, and checks the documented Audit private-key UID/mode. Test fixtures use placeholder text and mocked derived bytes; no key material was generated.
- `make config-check` no longer uses sudo for `docker compose config -q`; Compose config parsing is local and does not interact with the daemon. Runtime targets and image preflight continue to use the sudo-managed daemon. Provisioning docs now state that `secrets/` is gitignored and encrypted bundle files must be obtained from approved project artifact storage and hash-checked, not fetched via Git or regenerated.
- Gateway/Blue profile test scripts now explicitly SKIP when the expected sudo-managed daemon is unavailable. This prevents an auth-context failure being reported as a profile code failure.
- `make config-check` — PASS, exit 0. `make test-phase12-unit` — PASS, exit 0: Phase 12 unit tests 8 total (6 passed, 2 skipped for missing authorized age identities); orchestration 6/6; preflight tests 7/7; Gateway/Blue profile checks SKIPPED (expected sudo daemon inaccessible). The initial unit target attempt before the skip fix failed at Gateway import because sudo could not access the daemon; the final complete target passed with the environment skip shown.
- `make phase12-preflight` — BLOCKED, exit 2: age/age-keygen/Docker/OpenSSL pass; all three encrypted bundle hash checks pass; three authorized age identities and two private signing keys missing; both keypair checks not performed because private keys are missing; model directory empty; sudo authorization unavailable; daemon not checked; all required images not inspected. No image absence claim is made.
- Audit scope and remaining findings are in `docs/PHASE12_REPOSITORY_AUDIT.md`. It records the absent approved model digest/provenance, absent human-review process/sign-off, ciphertext distribution dependency, and limited proof scope of `verify_model.py`.
- `make test-phase12`, `make verify-audit`, and `make report` were not run because preflight is blocked. No A/B/C metrics, full Replay equality, or acceptance is claimed. Phase 12 remains **IN PROGRESS and NOT ACCEPTED**.
