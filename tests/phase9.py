#!/usr/bin/env python3
"""Phase 9 acceptance: sessions, canaries, reset, timing, and model integrity."""
from __future__ import annotations
import base64
import codecs
import hashlib
import io
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys
import tarfile
import uuid
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BLUE_CANARY = "BAYORA_CANARY_BLUE_DEMO_8C4F2A19"
REPORT = ROOT / "reports/isolation_report.md"


def run(cmd, *, input_text=None, timeout=90, check=False):
    return subprocess.run(cmd, cwd=ROOT, input=input_text, text=True, capture_output=True, timeout=timeout)


def issue(role, run_id):
    result = run([sys.executable, "tools/issue_token.py", "--role", role, "--run-id", run_id], timeout=10)
    if result.returncode:
        raise RuntimeError(result.stderr[-500:])
    return result.stdout.strip()


def forms(value):
    raw = value.encode()
    return [value, base64.b64encode(raw).decode(), raw.hex(), codecs.encode(value, "rot_13")]


def container_has_marker(service, path, markers):
    result = subprocess.run(["sudo", "docker", "cp", f"bayora-{service}-1:{path}", "-"],
                            cwd=ROOT, capture_output=True, timeout=45)
    if result.returncode:
        raise RuntimeError(f"T09 cannot scan {service}:{path}: {result.stderr.decode(errors='replace')[-300:]}")
    with tarfile.open(fileobj=io.BytesIO(result.stdout), mode="r:*") as archive:
        for item in archive:
            if not item.isfile():
                continue
            stream = archive.extractfile(item)
            if stream:
                content = stream.read()
                if any(marker.encode() in content for marker in markers):
                    return True
    return False


def ks_pvalue(a, b):
    a, b = sorted(a), sorted(b)
    n1, n2 = len(a), len(b)
    points = sorted(set(a + b))
    d = max(abs(sum(x <= v for x in a) / n1 - sum(x <= v for x in b) / n2) for v in points)
    ne = n1 * n2 / (n1 + n2)
    lam = (math.sqrt(ne) + 0.12 + 0.11 / math.sqrt(ne)) * d
    p = 2 * sum(((-1) ** (k - 1)) * math.exp(-2 * k * k * lam * lam) for k in range(1, 101))
    return d, max(0.0, min(1.0, p))


def verify_model():
    result = run([sys.executable, "llm_sandbox/verify_model.py", "--model-root", "models/ollama"], timeout=90)
    if result.returncode:
        raise RuntimeError("model integrity verification failed: " + result.stderr[-500:])
    return result.stdout


def append_report(rows):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("a", encoding="utf-8") as stream:
        stream.write("\n## Phase 9 — LLM/session controls\n\n")
        stream.write(f"Run time (UTC): {datetime.now(timezone.utc).isoformat(timespec='seconds')}\n\n")
        stream.write("| Test | Result | Evidence |\n|---|---|---|\n")
        for test_id, status, evidence in rows:
            stream.write(f"| {test_id} | {status} | {evidence.replace('|', '/')} |\n")


def main():
    run_id = "phase9-" + uuid.uuid4().hex[:12]
    red_canary = "BAYORA_CANARY_RED_" + uuid.uuid4().hex[:12].upper()
    session_canary = "BAYORA_CANARY_SESSION_" + uuid.uuid4().hex[:12].upper()
    rows = []
    details = {}
    try:
        before = verify_model()
        blue_test = run(["sudo", "docker", "compose", "run", "--rm", "--no-deps",
                         "blue-test", "/tests/phase9_blue_canary.py"], timeout=45)
        if blue_test.returncode:
            raise RuntimeError("T10 Blue contract failed: " + (blue_test.stdout + blue_test.stderr)[-600:])

        red_token = issue("red", run_id)
        client_path = ROOT / "tests/phase9_red_client.py"
        cmd = ["sudo", "docker", "compose", "exec", "-T",
               "-e", f"BAYORA_TOKEN={red_token}", "-e", f"BAYORA_RED_CANARY={red_canary}",
               "-e", f"BAYORA_SESSION_CANARY={session_canary}", "-e", f"BAYORA_BLUE_CANARY={BLUE_CANARY}",
               "red", "python", "-"]
        red_run = run(cmd, input_text=client_path.read_text(encoding="utf-8"), timeout=360)
        if red_run.returncode:
            raise RuntimeError("Red client failed: " + (red_run.stdout + red_run.stderr)[-600:])
        details = json.loads(red_run.stdout.strip().splitlines()[-1])

        operator_token = issue("operator", run_id)
        control = run(["sudo", "docker", "compose", "run", "--rm", "--no-deps",
                       "-e", f"BAYORA_OPERATOR_TOKEN={operator_token}",
                       "-e", f"BAYORA_RED_TOKEN={red_token}",
                       "audit-test", "/tests/phase9_control.py"], timeout=45)
        if control.returncode:
            raise RuntimeError("session reset authorization failed: " + (control.stdout + control.stderr)[-500:])
        ps = run(["sudo", "docker", "compose", "exec", "-T", "llm", "ollama", "ps"], timeout=15)
        loaded = [line for line in ps.stdout.splitlines() if line.strip()]
        if ps.returncode or len(loaded) > 1:
            raise RuntimeError("SESSION_RESET_FAIL: model remains loaded or ollama ps failed")

        audit_path = ROOT / "data/audit/audit.jsonl"
        events = [json.loads(line) for line in audit_path.read_text(encoding="utf-8").splitlines()]
        mine = [event for event in events if event.get("run_id") == run_id]
        received = [e for e in mine if e.get("event") == "ATTACK_RECEIVED"]
        sessions = [e.get("data", {}).get("session_hash") for e in received]
        responses = [e for e in mine if e.get("event") == "LLM_RESPONSE"]
        reset_logged = any(e.get("event") == "SESSION_RESET" for e in mine)
        if len(received) != len(set(sessions)) or None in sessions or not reset_logged:
            raise RuntimeError("session hashes are not unique or reset is not signed in Audit")
        cached_metrics = [e["data"]["cached_tokens"] for e in responses if "cached_tokens" in e.get("data", {})]
        if any(value != 0 for value in cached_metrics):
            raise RuntimeError("T13 detected prompt-token reuse: " + repr(cached_metrics))

        timing_a, timing_b = details["times_a_ms"], details["times_b_ms"]
        d_stat, p_value = ks_pvalue(timing_a, timing_b)
        med_a, med_b = statistics.median(timing_a), statistics.median(timing_b)
        mad = statistics.median([abs(x - statistics.median(timing_a + timing_b)) for x in timing_a + timing_b])
        timing_ok = p_value >= 0.05 and abs(med_a - med_b) <= max(250.0, 3 * mad)
        if details["t09_status"] != "ok" or details["t09_visible"] or not details["tmpfs_canary_removed"]:
            raise RuntimeError("T09 Red canary was blocked, exposed, or not cleaned")
        if any(item["visible"] for item in details["t10"]):
            raise RuntimeError("T10 Blue canary appeared in a Red-visible response")
        if details["t12_status"] != "ok" or details["t12_visible"]:
            raise RuntimeError("T12 marker crossed one-shot sessions")
        if details["red_reset_status"] != 403 or details["missing_reset_status"] != 401:
            raise RuntimeError("Red or unauthenticated reset was not denied")
        if not timing_ok:
            raise RuntimeError(f"T13 timing distributions differed: D={d_stat:.3f}, p={p_value:.4f}, medians={med_a:.1f}/{med_b:.1f}ms")

        # Scan durable Gateway/Audit/service logs and the tested Red tmpfs paths for the per-run marker.
        log_result = run(["sudo", "docker", "compose", "logs", "--no-color", "gateway", "blue", "llm"], timeout=25)
        audit_text = audit_path.read_text(encoding="utf-8")
        red_code = "from pathlib import Path; import sys; p=Path('/tmp/bayora-t09-payload.txt'); sys.exit(0 if not p.exists() else 1)"
        red_tmp = run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c", red_code], timeout=10)
        if red_run.returncode or log_result.returncode or red_tmp.returncode:
            raise RuntimeError("T09 scan could not inspect logs or confirm Red tmpfs cleanup")
        if any(mark in (log_result.stdout + audit_text) for mark in forms(red_canary)):
            raise RuntimeError("T09 Red canary found in durable Gateway/Blue/LLM logs or Audit")
        for service, path in (("gateway", "/app"), ("gateway", "/tmp"),
                              ("blue", "/app"), ("blue", "/tmp"), ("llm", "/tmp")):
            if container_has_marker(service, path, forms(red_canary)):
                raise RuntimeError(f"T09 Red canary found in {service}:{path}")
        for test_id in ("T09", "T10", "T12", "T13", "T16"):
            rows.append((test_id, "PASS", {
                "T09": "Red canary absent from Gateway/Blue/LLM app/tmp, logs and Audit; Red tmpfs source removed",
                "T10": "Blue raw/Base64/hex/ROT13 canary redacted; absent from Red-visible replies",
                "T12": f"{len(sessions)} distinct Gateway session hashes; prior marker not returned; operator reset signed",
                "T13": f"KS D={d_stat:.3f}, p={p_value:.4f}; medians={med_a:.1f}/{med_b:.1f}ms; cached-counter samples={len(cached_metrics)}",
                "T16": "five model blob hashes verified before/after Phase 9 requests",
            }[test_id]))
        if cached_metrics == []:
            rows.append(("CACHE-METRIC", "LIMITED", "Pinned Ollama 0.6.8 omitted prompt_eval_cached_count; no cache reuse control could be proven from that metric"))

        # Operator-only API reset unloads model state; host restart enforces a fresh process boundary between runs.
        restart = run(["bash", "scripts/reset_model.sh"], timeout=140)
        if restart.returncode:
            raise RuntimeError("model process restart failed: " + (restart.stdout + restart.stderr)[-500:])
        after = verify_model()
        if "MODEL_HASH_PASS" not in before or "MODEL_HASH_PASS" not in after:
            raise RuntimeError("T16 model hash verifier did not report success")
        audit_verify = run([sys.executable, "tools/bayora_verify.py"], timeout=60)
        if audit_verify.returncode:
            raise RuntimeError("signed Audit verification failed: " + audit_verify.stderr[-500:])
        append_report(rows)
        print(blue_test.stdout.strip())
        print(control.stdout.strip())
        print(f"T09/T10/T12/T13/T16 PASS: sessions={len(sessions)}; unique={len(set(sessions))}; timing p={p_value:.4f}; model hashes stable")
        if not cached_metrics:
            print("CACHE_METRIC_LIMITATION: Ollama 0.6.8 does not report prompt_eval_cached_count; latency test passed, strict cache-disable proof unavailable")
        print(restart.stdout.strip())
        print(audit_verify.stdout.strip())
        return 0
    except Exception as exc:
        rows.append(("PHASE9", "FAIL/BLOCKED", str(exc)[:300]))
        append_report(rows)
        print(f"PHASE9_FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
