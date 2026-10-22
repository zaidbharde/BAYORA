#!/usr/bin/env python3
"""Phase 11: T18 Gateway request rejection, signed violation records, and operator metrics."""
from __future__ import annotations
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports/isolation_report.md"
FORBIDDEN = {"prompt", "response", "text", "token", "secret", "payload", "content"}


def run(cmd, timeout=90):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=timeout)


def issue(role, run_id):
    result = run([sys.executable, "tools/issue_token.py", "--role", role, "--run-id", run_id], timeout=10)
    if result.returncode:
        raise RuntimeError("token issuance failed")
    return result.stdout.strip()


def wait_healthy():
    deadline = time.monotonic() + 75
    services = ("gateway", "audit", "blue", "llm", "red")
    pending = set(services)
    while pending and time.monotonic() < deadline:
        for service in tuple(pending):
            container = run(["sudo", "docker", "compose", "ps", "-q", service], timeout=10)
            if container.returncode or not container.stdout.strip():
                continue
            status = run(["sudo", "docker", "inspect", "--format",
                          "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
                          container.stdout.strip()], timeout=10)
            if status.returncode == 0 and status.stdout.strip() == "healthy":
                pending.remove(service)
        if pending:
            time.sleep(2)
    if pending:
        raise RuntimeError("services did not become healthy: " + ",".join(sorted(pending)))


def compose_client(service, script, env, timeout=120):
    cmd = ["sudo", "docker", "compose", "run", "--rm", "--no-deps", "-T"]
    for key, value in env.items():
        cmd.extend(["-e", f"{key}={value}"])
    cmd.extend([service, script])
    result = run(cmd, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f"{service} failed: {(result.stdout + result.stderr)[-500:]}")
    return json.loads(result.stdout.strip().splitlines()[-1])


def violates(data):
    if isinstance(data, dict):
        return any(str(key).lower() in FORBIDDEN or violates(value) for key, value in data.items())
    if isinstance(data, list):
        return any(violates(value) for value in data)
    return False


def append_report(evidence):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("a", encoding="utf-8") as stream:
        stream.write("\n## Observability and violation handling\n\n")
        stream.write(f"Run time (UTC): {datetime.now(timezone.utc).isoformat(timespec='seconds')}\n\n")
        stream.write("| Test | Result | Evidence |\n|---|---|---|\n")
        stream.write(f"| T18 | PASS | {evidence} |\n")


def main():
    wait_healthy()
    run_id = "bayora-t18-" + uuid.uuid4().hex[:12]
    audit_path = ROOT / "data/audit/audit.jsonl"
    starting_seq = sum(1 for _ in audit_path.open(encoding="utf-8"))
    red = issue("red", run_id)
    blue = issue("blue", run_id)
    results = compose_client("red-test", "/tests/phase11_red_client.py",
                             {"BAYORA_RED_TOKEN": red, "BAYORA_BLUE_TOKEN": blue})
    expected = {"malformed": 422, "oversized": 413, "missing_token": 401,
                "wrong_role": 403, "unlisted_route": 404}
    for name, status in expected.items():
        if results.get(name) != status:
            raise RuntimeError(f"T18 {name} expected {status}, observed {results.get(name)}")
    if not results.get("monitoring_blocked") or results.get("rate_limited", 0) < 1:
        raise RuntimeError("tenant monitoring isolation or rate-limit test failed")

    blue_result = run(["sudo", "docker", "compose", "run", "--rm", "--no-deps", "-T",
                       "blue-test", "/tests/phase11_blue_client.py"], timeout=30)
    if blue_result.returncode:
        raise RuntimeError("Blue monitoring isolation probe failed")
    blue_result_data = json.loads(blue_result.stdout.strip().splitlines()[-1])
    if not blue_result_data.get("monitoring_blocked"):
        raise RuntimeError("Blue reached operator monitoring")

    events = [json.loads(line) for line in audit_path.read_text(encoding="utf-8").splitlines()]
    run_events = [e for e in events if e.get("run_id") == run_id and e.get("event") == "POLICY_VIOLATION"]
    codes = {e.get("data", {}).get("violation_code") for e in run_events}
    required = {"malformed_request", "oversized_request", "wrong_role",
                "unlisted_route", "rate_limit_exceeded"}
    if not required <= codes:
        raise RuntimeError(f"signed violation events missing categories: {sorted(required - codes)}")
    if not run_events or any(e.get("data", {}).get("integrity_status") != "integrity-compromised"
                             for e in run_events):
        raise RuntimeError("run was not marked integrity-compromised")
    if any(violates(e.get("data", {})) for e in run_events):
        raise RuntimeError("violation audit data contains a forbidden content field")

    unattributed = [e for e in events if e.get("run_id") == "gateway-unattributed"
                    and e.get("seq", 0) > starting_seq
                    and e.get("event") == "POLICY_VIOLATION"
                    and e.get("data", {}).get("violation_code") == "invalid_token"]
    if not unattributed:
        raise RuntimeError("missing-token request was not logged as unattributed")

    operator = compose_client("operator-test", "/tests/phase11_operator_client.py",
                              {"BAYORA_RUN_ID": run_id}, timeout=70)
    if not all(operator.get(key) for key in ("repeated_violation_alert", "integrity_alert",
                                              "dashboard_coarse_metrics", "run_id_absent")):
        raise RuntimeError("operator alert/dashboard acceptance failed")

    verified = run([sys.executable, "tools/bayora_verify.py"], timeout=90)
    if verified.returncode:
        raise RuntimeError("Audit signature/hash-chain verification failed")
    evidence = (f"5 rejection classes; rate-limit hits={results['rate_limited']}; "
                f"{len(run_events)} signed violations; Red/Blue monitoring blocked; "
                "both operator alerts firing; aggregate dashboard only")
    append_report(evidence)
    print(f"T18_PASS: {evidence}")
    print(verified.stdout.strip())
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"T18_FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
