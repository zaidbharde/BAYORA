.PHONY: up down test-isolation config-check phase12-preflight model-prepare test-llm gateway-keys test-gateway audit-keys test-audit verify-audit replay report run-abc tamper-demo test-blue test-red team-keys test-secrets test-hardening test-phase9 test-phase10 test-phase11 test-phase12-unit test-phase12 reset-model

# Images are prebuilt/imported; the remapped daemon cannot build with host networking.
up:
	sudo docker compose up -d --pull never

down:
	sudo docker compose down --remove-orphans

test-isolation:
	python3 tests/isolation/phase1.py

config-check:
	python3 -m py_compile app/hello.py tests/isolation/phase1.py llm_sandbox/verify_model.py llm_sandbox/client_test.py tests/phase2_llm.py gateway/app.py gateway/request_guard.py tools/issue_token.py tests/phase3_gateway.py audit_service/server.py tools/bayora_verify.py tests/phase4_audit.py tests/phase4_audit_client.py blue_engine/app.py tests/phase5_blue.py tests/phase5_blue_contract.py tests/phase9_blue_canary.py tests/phase9_red_client.py tests/phase9_control.py tests/phase9.py tests/phase10.py tests/phase10_timing_client.py tests/phase10_fairness_client.py tests/phase11.py tests/phase11_red_client.py tests/phase11_operator_client.py observability/dashboard.py red_engine/runner.py tests/phase6_red.py tests/phase6_commit_client.py tests/phase7_audit_client.py tools/commit_reveal.py tests/phase7_secrets.py tests/phase8_security.py scripts/prepare_phase12_data.py evaluator/judge.py evaluator/metrics.py red_engine/eval_runner.py tests/phase12_unit.py tests/phase12_gateway_modes.py tests/phase12_blue_profiles.py tests/phase12_audit_client.py
	python3 -m json.tool blue_engine/canaries.json >/dev/null
	python3 -m py_compile tests/phase11_blue_client.py
	python3 -m py_compile tests/phase12.py tests/phase12_orchestrator.py evaluator/phase12_evaluator.py evaluator/phase12_replay.py
	python3 -m py_compile tools/phase12_preflight.py tests/phase12_preflight.py
	docker compose config -q

# Fail-closed runtime gate. It never decrypts, prints, regenerates, or repairs secrets.
phase12-preflight:
	python3 tools/phase12_preflight.py

model-prepare:
	sudo bash scripts/prepare_model.sh

test-llm:
	python3 tests/phase2_llm.py

gateway-keys:
	bash scripts/init_gateway_keys.sh

test-gateway:
	python3 tests/phase3_gateway.py

audit-keys:
	bash scripts/init_audit_keys.sh

test-audit:
	bash scripts/init_audit_keys.sh || test -f secrets/audit_private.pem
	sudo docker compose up -d --no-deps --pull never audit
	python3 tests/phase4_audit.py

verify-audit:
	python3 tools/bayora_verify.py

replay:
	python3 evaluator/phase12_replay.py

report: replay
	test -s reports/phase12_evaluator.json
	test -s reports/phase12_replay.json
	@echo "PHASE12_REPORT_PASS: Evaluator and Replay reports are present"

run-abc: test-phase12

tamper-demo:
	python3 tests/phase4_audit.py

test-blue:
	sudo docker compose up -d --no-deps --pull never blue gateway
	python3 tests/phase5_blue.py

# Phase 6 acceptance includes the bounded 100-attempt run and post-seal model restart.
test-red:
	sudo docker compose up -d --no-deps --pull never red
	bash scripts/init_team_material.sh
	python3 tests/phase6_red.py

team-keys:
	bash scripts/init_team_material.sh

test-secrets:
	sudo docker compose up -d --no-deps --pull never red
	python3 tests/phase7_secrets.py

test-hardening:
	python3 tests/phase8_security.py

# T09/T10/T12/T13/T16; uses test-only clients and prints no canary plaintext.
test-phase9:
	sudo docker compose up -d --no-deps --pull never gateway blue audit llm red
	python3 tests/phase9.py

reset-model:
	bash scripts/reset_model.sh

# T11/T14 measured timing/fairness acceptance; no image rebuild is performed here.
test-phase10:
	sudo docker compose up -d --no-deps --pull never gateway blue audit llm red
	python3 tests/phase10.py

# T18 request bounds, signed violation records, control-network alerts, and aggregate dashboard.
test-phase11:
	sudo docker compose up -d --pull never gateway blue audit llm red prometheus dashboard
	sudo docker compose exec -T prometheus promtool check config /etc/prometheus/prometheus.yml
	sudo docker compose exec -T prometheus promtool check rules /etc/prometheus/alerts.yml
	python3 tests/phase11.py

# Phase 12 bounded unit/profile checks; no benchmark is run here.
test-phase12-unit:
	python3 tests/phase12_unit.py
	python3 tests/phase12_orchestrator.py
	python3 tests/phase12_preflight.py
	python3 tests/phase12_gateway_modes.py
	python3 tests/phase12_blue_profiles.py

# Full 200-item-per-mode benchmark; runs only after bounded Phase 12 checks pass.
test-phase12:
	$(MAKE) phase12-preflight
	sudo docker compose up -d --pull never gateway blue audit llm red
	python3 tests/phase12.py --benchmark
