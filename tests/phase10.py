#!/usr/bin/env python3
"""Phase 10: T11 timing distributions and T14 noisy-neighbor fairness."""
from __future__ import annotations
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports/isolation_report.md"
SAMPLES = 10
BUCKET_MS = 5000


def run(cmd, *, timeout=90, input_text=None):
    return subprocess.run(cmd, cwd=ROOT, input=input_text, text=True, capture_output=True, timeout=timeout)


def issue(role, run_id):
    result = run([sys.executable, "tools/issue_token.py", "--role", role, "--run-id", run_id], timeout=10)
    if result.returncode:
        raise RuntimeError(result.stderr[-400:])
    return result.stdout.strip()


def ks_pvalue(a, b):
    a, b = sorted(a), sorted(b)
    n1, n2 = len(a), len(b)
    points = sorted(set(a + b))
    d = max(abs(sum(x <= v for x in a) / n1 - sum(x <= v for x in b) / n2) for v in points)
    ne = n1 * n2 / (n1 + n2)
    lam = (math.sqrt(ne) + 0.12 + 0.11 / math.sqrt(ne)) * d
    p = 2 * sum(((-1) ** (k - 1)) * math.exp(-2 * k * k * lam * lam) for k in range(1, 101))
    return d, max(0.0, min(1.0, p))


def percentile(values, percent):
    values = sorted(values)
    index = min(len(values) - 1, max(0, math.ceil(percent * len(values)) - 1))
    return values[index]


def client_run(script, env, timeout=180):
    cmd = ["sudo", "docker", "compose", "run", "--rm", "--no-deps"]
    for key, value in env.items():
        cmd.extend(["-e", f"{key}={value}"])
    cmd.extend(["audit-test", script])
    result = run(cmd, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f"{script} failed: {(result.stdout + result.stderr)[-500:]}")
    return json.loads(result.stdout.strip().splitlines()[-1])


def audit_events(run_ids):
    path = ROOT / "data/audit/audit.jsonl"
    events = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
    return {rid: [e for e in events if e.get("run_id") == rid] for rid in run_ids}


def attack_groups(events, expected, output_only=False):
    by_attempt = {}
    for event in events:
        if event.get("attempt_id"):
            by_attempt.setdefault(event["attempt_id"], []).append(event)
    groups = {"allow": [], "rule": [], "classifier": [], "output": []}
    timings = {key: [] for key in groups}
    for attempt, items in by_attempt.items():
        inp = next((e.get("data", {}) for e in items if e.get("event") == "INPUT_VERDICT"), {})
        out = next((e.get("data", {}) for e in items if e.get("event") == "OUTPUT_VERDICT"), {})
        sent = next((e.get("data", {}) for e in items if e.get("event") == "RESPONSE_SENT"), {})
        if not sent or not {"raw_latency_ms", "padded_latency_ms", "bucket_ms"} <= set(sent):
            raise RuntimeError(f"missing raw/padded timing Audit fields for {attempt}")
        if sent["bucket_ms"] != BUCKET_MS:
            raise RuntimeError(f"unexpected timing bucket: {sent}")
        reason = inp.get("reason_code")
        if reason == "R01": group = "rule"
        elif reason == "R02": group = "classifier"
        elif out.get("reason_code") == "R03": group = "output"
        elif reason == "R04" and out.get("reason_code") == "R04": group = "allow"
        else: continue
        groups[group].append(sent)
        timings[group].append(float(sent["padded_latency_ms"]))
    for key, amount in expected.items():
        if len(groups[key]) < amount:
            raise RuntimeError(f"T11 {key}: only {len(groups[key])} audited samples, expected {amount}")
    return groups, timings


def append_report(rows):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("a", encoding="utf-8") as stream:
        stream.write("\n## Phase 10 — timing and fairness\n\n")
        stream.write(f"Run time (UTC): {datetime.now(timezone.utc).isoformat(timespec='seconds')}\n\n")
        stream.write("| Test | Result | Evidence |\n|---|---|---|\n")
        for test_id, result, evidence in rows:
            stream.write(f"| {test_id} | {result} | {evidence.replace('|', '/')} |\n")


def stop_noise():
    code = "import os,signal; p='/tmp/bayora-phase10-noise.pid'; pid=int(open(p).read()); os.kill(pid,signal.SIGTERM); os.unlink(p); print('NOISE_STOPPED')"
    return run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c", code], timeout=15)


def main():
    rows = []
    timing_ids = {name: f"phase10-t11-{name}-" + uuid.uuid4().hex[:8]
                  for name in ("allow", "rule", "classifier", "output")}
    try:
        tokens = {name: issue("red", rid) for name, rid in timing_ids.items()}
        env = {"BAYORA_SAMPLES": str(SAMPLES)}
        for name, token in tokens.items():
            env[f"BAYORA_{name.upper()}_TOKEN"] = token
        measured = client_run("/tests/phase10_timing_client.py", env, timeout=240)
        events_by_run = audit_events(set(timing_ids.values()))
        observed = {name: [] for name in timing_ids}
        audited_pads = {name: [] for name in timing_ids}
        for name, rid in timing_ids.items():
            attempts, _ = attack_groups(events_by_run[rid], {name: SAMPLES})
            observed[name] = measured[name]["elapsed_ms"]
            if len(observed[name]) != SAMPLES:
                raise RuntimeError(f"T11 client sample count mismatch: {name}")
            # Validate expected decision source, and use only the accepted output-filter samples.
            if name == "rule" and any(e.get("data", {}).get("reason_code") != "R01" for e in events_by_run[rid] if e.get("event") == "INPUT_VERDICT"):
                raise RuntimeError("T11 rule sample was not R01")
            if name == "classifier" and any(e.get("data", {}).get("reason_code") != "R02" for e in events_by_run[rid] if e.get("event") == "INPUT_VERDICT"):
                raise RuntimeError("T11 classifier sample was not R02")
            if name == "allow" and (sum(e.get("event") == "INPUT_VERDICT" and e.get("data", {}).get("reason_code") == "R04" for e in events_by_run[rid]) < SAMPLES):
                raise RuntimeError("T11 allowed requests did not pass Blue input")
            if name == "output":
                output_passes = [e for e in events_by_run[rid] if e.get("event") == "OUTPUT_VERDICT" and e.get("data", {}).get("reason_code") == "R03"]
                if len(output_passes) < SAMPLES:
                    raise RuntimeError("T11 output canary did not produce enough R03 samples")
            sent = [e["data"] for e in events_by_run[rid] if e.get("event") == "RESPONSE_SENT"]
            audited_pads[name] = [float(item["padded_latency_ms"]) for item in sent]

        comparisons = {}
        for name in ("rule", "classifier", "output"):
            d, p = ks_pvalue(observed["allow"], observed[name])
            comparisons[name] = {"D": d, "p": p}
        if any(value["p"] <= 0.05 for value in comparisons.values()):
            raise RuntimeError("T11 response-time distributions differ after bucketing: " + repr(comparisons))
        if any(len(set(values[:SAMPLES])) != 1 for values in audited_pads.values() if values):
            raise RuntimeError("T11 samples within a decision group landed in different padded buckets")
        pad_values = sorted({v for values in audited_pads.values() for v in values})
        if pad_values != [float(BUCKET_MS)]:
            raise RuntimeError(f"T11 did not hold all classes to the same bucket: {pad_values}")
        ks_evidence = ", ".join("{}:{:.3f}".format(key, value["p"])
                                 for key, value in comparisons.items())
        rows.append(("T11", "PASS", f"10 each: allow/rule/classifier/output; all padded={BUCKET_MS}ms; KS p={ks_evidence}"))

        fairness_id = "phase10-t14-" + uuid.uuid4().hex[:10]
        fairness_token = issue("red", fairness_id)
        base = client_run("/tests/phase10_fairness_client.py",
                          {"BAYORA_TOKEN": fairness_token, "BAYORA_SAMPLES": "6"}, timeout=75)["elapsed_ms"]
        start_code = ("import subprocess,sys; p=subprocess.Popen([sys.executable,'-c','while True: pass'],"
                      "stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True); "
                      "open('/tmp/bayora-phase10-noise.pid','w').write(str(p.pid)); print('NOISE_STARTED')")
        start = run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c", start_code], timeout=15)
        if start.returncode or "NOISE_STARTED" not in start.stdout:
            raise RuntimeError("T14 could not start bounded CPU-noise worker")
        try:
            time.sleep(0.5)
            noisy = client_run("/tests/phase10_fairness_client.py",
                               {"BAYORA_TOKEN": fairness_token, "BAYORA_SAMPLES": "6"}, timeout=75)["elapsed_ms"]
        finally:
            stopped = stop_noise()
            if stopped.returncode:
                raise RuntimeError("T14 noisy worker cleanup failed: " + stopped.stderr[-300:])
        d, p = ks_pvalue(base, noisy)
        delta = abs(statistics.median(base) - statistics.median(noisy))
        p95_delta = abs(percentile(base, .95) - percentile(noisy, .95))
        if p <= 0.05 or delta > 500 or p95_delta > 750:
            raise RuntimeError(f"T14 fairness outside tolerance: KS p={p:.4f}, median Δ={delta:.1f}ms, p95 Δ={p95_delta:.1f}ms")
        rows.append(("T14", "PASS", f"Red CPU worker isolated; n=6/6; KS p={p:.3f}; median Δ={delta:.1f}ms; p95 Δ={p95_delta:.1f}ms"))

        final = run([sys.executable, "tools/bayora_verify.py"], timeout=90)
        if final.returncode:
            raise RuntimeError("Audit verification failed: " + final.stderr[-400:])
        append_report(rows)
        print(f"T11_PASS: all decision classes padded to {BUCKET_MS}ms; KS={comparisons}")
        print(f"T14_PASS: n=6/6; p={p:.3f}; median_delta={delta:.1f}ms; p95_delta={p95_delta:.1f}ms")
        print(final.stdout.strip())
        return 0
    except Exception as exc:
        rows.append(("PHASE10", "FAIL/BLOCKED", str(exc)[:300]))
        append_report(rows)
        print(f"PHASE10_FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
