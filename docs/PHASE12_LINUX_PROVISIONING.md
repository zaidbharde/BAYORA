# Phase 12 trusted Linux host provisioning

This procedure prepares a trusted Ubuntu 22.04/24.04 host for the full Phase 12 run. Do not put private identities, signing keys, plaintext dataset rows, or model responses in Git, tickets, chat, or shell output. Docker daemon access is effectively host-root access; keep it limited to the authorized operator.

## 1. Install public tools

Install Docker Engine and the Compose v2 plugin from Docker's official Ubuntu repository, following the [official Engine installation steps](https://docs.docker.com/engine/install/ubuntu/). The repository instructions install `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin`. Do not use the convenience installer for this trusted host. Runtime Make targets invoke Docker through `sudo`, and preflight inspects that same privileged daemon. `make config-check` only parses Compose configuration and runs without elevated privileges. Do not add users to the `docker` group merely to avoid `sudo`.

Install age, age-keygen, and OpenSSL from trusted distribution packages:

```bash
sudo apt-get update
sudo apt-get install -y age openssl
age --version
age-keygen --version
openssl version
sudo docker version
sudo docker compose version
```

The [upstream age installation guide](https://github.com/FiloSottile/age#installation) documents supported Ubuntu packages. Confirm the executable is the encryption tool by checking that both `age` and `age-keygen` resolve from the same trusted package installation.

## 2. Stage authorized project material

Use the organization's approved secret-delivery method to place the existing, authorized files under `secrets/`. Required names are:

- `phase12_red_inputs.age`, `phase12_blue_reveal.age`, and `phase12_judge_train.age`. The repository's `.gitignore` excludes all of `secrets/`, so ciphertext bundles are not delivered by Git. Obtain the approved existing ciphertexts from the project's artifact custodian and compare their SHA-256 values with `reports/phase12_source.json`; preflight enforces those recorded hashes. Do not regenerate or replace the bundles to make a mismatch pass.
- `red.agekey`, `blue.agekey`, and `eval.agekey` (mode `0600` or stricter). These identities must be the original recipients for the approved encrypted Phase 12 bundles. Do not run key initialization or data preparation to replace a missing identity; replacement keys cannot decrypt those bundles.
- `audit_private.pem` (readable by the Audit container's UID/GID 10001, mode `0400`).
- `gateway_private.pem` (operator-readable, mode `0600`).
- Matching `audit_public.pem` and `gateway_public.pem` must correspond to the authorized private keys.

Keep `secrets/` mode `0700` and verify only metadata/permissions, never print key contents. Preflight also checks the Audit/Gateway private keys derive the public keys supplied to services; it compares derived public bytes in memory and emits only match/mismatch status:

```bash
chmod 700 secrets
chmod 600 secrets/red.agekey secrets/blue.agekey secrets/eval.agekey secrets/gateway_private.pem
sudo chown 10001:10001 secrets/audit_private.pem
sudo chmod 400 secrets/audit_private.pem
stat -c '%a %n' secrets/red.agekey secrets/blue.agekey secrets/eval.agekey secrets/audit_private.pem secrets/gateway_private.pem
```

Do not run `scripts/init_team_material.sh`, `scripts/init_audit_keys.sh`, `scripts/init_gateway_keys.sh`, or `scripts/prepare_phase12_data.py` to repair absent trusted material. Those commands create new identities/keys or bundles and do not restore the authorized recipients for existing encrypted data. Obtain the matching materials from their authorized custodians.

## 3. Stage trusted runtime images and model

Provide these local images from the project's trusted, reviewed build/release pipeline or approved image archive; do not pull BAYORA images from an unverified registry:

```text
bayora/gateway:phase3
bayora/red:phase6
bayora/blue:phase5
bayora/audit:phase4
ollama/ollama:0.6.8
```

For a trusted image archive, inspect its provenance and approved digests, then load it into the same rootful daemon used by Compose:

```bash
sudo docker load --input /approved/path/bayora-phase12-images.tar
sudo docker image inspect bayora/gateway:phase3 bayora/red:phase6 bayora/blue:phase5 bayora/audit:phase4 ollama/ollama:0.6.8
```

The local model must be `qwen2.5:0.5b` under `models/ollama/models`, mounted read-only by Compose. If the model is absent, obtain it only through the approved model supply chain. `sudo bash scripts/prepare_model.sh` uses `ollama/ollama:0.6.8` and pulls the mutable `qwen2.5:0.5b` tag, so run it only if the operator has approved that source and version, then compare against the project's approved model hashes. `python3 llm_sandbox/verify_model.py` checks blob hashes against the local Ollama manifest; that check alone does not establish model provenance.

## 4. Run the gates in order

From the repository root, using an operator session with working `sudo` access to the expected rootful Docker daemon:

```bash
make config-check
make test-phase12-unit
make phase12-preflight
```

Resolve every failed check before continuing. Preflight must pass against the same Docker daemon used by Make targets. Then run the 200-attempt-per-mode benchmark and follow with evidence verification:

```bash
make test-phase12
make verify-audit
make report
```

`make test-phase12` runs the preflight again. It executes A (Blue disabled), B (rules-only), and C (full Blue) over the same pinned 200-row payload and seed 42, in chunks of at most 50. On failure, preserve encrypted artifacts and signed Audit history, inspect the run manifest and lifecycle state, and resume only through a reviewed operator procedure; do not edit reports or mark an interrupted run complete. Accept Phase 12 only if the full run, cleanup, Audit signatures, reported metrics, 30-row label calibration, and independent Replay's exact metric equality all pass.

The Evaluator's current 30-row calibration is a deterministic holdout from already human-labeled JBB comparison rows. It is **not** a human hand-check of 30 generated benchmark attempts. The acceptance checklist separately requires an authorized reviewer to assess 30 selected run attempts under an approved protected review process and record only the review protocol, aggregate outcomes, and reviewer sign-off. The repository does not currently provide a protected plaintext review interface, so do not print or export captures to satisfy this criterion; provision that approved review process before claiming acceptance.
