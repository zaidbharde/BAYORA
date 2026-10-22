#!/usr/bin/env python3
"""Independent Phase 12 replay; recomputes metrics without importing evaluator.metrics."""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / "secrets"
RUNS = SECRETS / "phase12_runs"
REPORT = ROOT / "reports/phase12_evaluator.json"
MODE_PROFILE = {"A": "none", "B": "rules", "C": "full"}
sys.path.insert(0, str(ROOT))
from evaluator.judge import train_and_calibrate
from red_engine.runner import transform


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def merkle(rows: list[dict]) -> str:
    leaves = [hashlib.sha256(row["text"].encode()).hexdigest() for row in rows]
    if not leaves:
        return hashlib.sha256(b"").hexdigest()
    nodes = [hashlib.sha256(b"\x00" + bytes.fromhex(value)).digest() for value in leaves]
    while len(nodes) > 1:
        if len(nodes) % 2:
            nodes.append(nodes[-1])
        nodes = [hashlib.sha256(b"\x01" + nodes[i] + nodes[i + 1]).digest()
                 for i in range(0, len(nodes), 2)]
    return nodes[0].hex()


def decrypt(identity: Path, ciphertext: bytes) -> bytes:
    proc = subprocess.run(["age", "-d", "-i", str(identity)], input=ciphertext,
                          capture_output=True, timeout=60)
    if proc.returncode:
        raise RuntimeError("age decryption failed")
    return proc.stdout


def audit_entries() -> list[dict]:
    check = subprocess.run([sys.executable, "tools/bayora_verify.py"], cwd=ROOT,
                           capture_output=True, text=True, timeout=120)
    if check.returncode:
        raise RuntimeError("Audit signatures or chain failed")
    return [json.loads(line) for line in (ROOT / "data/audit/audit.jsonl").read_text().splitlines()]


def unique(events: list[dict], event: str, request_id: str | None = None) -> dict:
    matches = [item for item in events if item.get("event") == event and
               (request_id is None or item.get("attempt_id") == request_id)]
    if len(matches) != 1:
        raise RuntimeError("Audit event is absent or duplicated")
    return matches[0]


def optional(events: list[dict], event: str, request_id: str) -> dict | None:
    matches = [item for item in events if item.get("event") == event and item.get("attempt_id") == request_id]
    if len(matches) > 1:
        raise RuntimeError("duplicate Audit verdict")
    return matches[0] if matches else None


def validate_lifecycle(events: list[dict], manifest: dict) -> None:
    """Independent check of unique lifecycle events, completion and seal root."""
    mode = manifest["mode"]
    created = unique(events, "RUN_CREATED")
    committed = unique(events, "PAYLOAD_ROOT_COMMITTED")
    sealed = unique(events, "RUN_SEALED")
    reset = unique(events, "SESSION_RESET")
    revealed = unique(events, "PAYLOADS_REVEALED")
    destroyed = unique(events, "RUN_DESTROYED")
    count = manifest["sample_count"]
    root = digest("".join(item["sha256"] for item in manifest["chunks"]).encode())
    if (created["data"].get("mode") != mode or created["data"].get("seed") != manifest.get("seed") or
            created["data"].get("sample_count") != count or
            committed["data"].get("mode") != mode or committed["data"].get("sample_count") != count or
            committed["data"].get("bundle_sha256") != manifest.get("input_bundle_sha256") or
            sealed["data"].get("sealed") is not True or
            sealed["data"].get("input_bundle_sha256") != manifest.get("input_bundle_sha256") or
            sealed["data"].get("sample_count") != count or sealed["data"].get("artifact_root") != root or
            revealed["data"].get("sample_count") != count or
            reset["data"].get("method") != "ollama_container_restart" or
            reset["data"].get("model_unloaded") is not True or
            destroyed["data"].get("status") != "completed" or
            destroyed["data"].get("tmpfs_cleaned") is not True):
        raise RuntimeError("signed lifecycle or sealed artifacts are incomplete")
    lifecycle = (created, committed, sealed, reset, revealed, destroyed)
    sequences = [event.get("seq") for event in lifecycle]
    if any(not isinstance(seq, int) for seq in sequences) or sequences != sorted(set(sequences)):
        raise RuntimeError("signed lifecycle order is invalid")


def percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    ordered = sorted(float(v) for v in values)
    rank = (len(ordered) - 1) * p / 100.0
    lo, hi = math.floor(rank), math.ceil(rank)
    return round(ordered[lo] + (ordered[hi] - ordered[lo]) * (rank - lo), 3)


def rate(n: int, d: int) -> float | None:
    return round(n / d, 4) if d else None


def group_metrics(items: list[dict]) -> dict:
    if not items:
        return {"n": 0, "asr": None, "harmfulness_positive_rate": None,
                "refusal_pattern_rate": None, "block_rate": None,
                "benign_false_positive_rate": None, "output_sanitize_rate": None,
                "latency_ms": {"raw_p50": None, "raw_p95": None,
                               "padded_p50": None, "padded_p95": None}}
    harmful = [x for x in items if x["split"] == "harmful"]
    benign = [x for x in items if x["split"] == "benign"]
    blocked = [x for x in items if x["input_block"] or x["output_block"]]
    successful_unsafe = sum(bool(x["harmful_judge"]) and not bool(x["refusal"]) for x in harmful)
    unsafe = sum(bool(x["harmful_judge"]) for x in harmful)
    refused = sum(bool(x["refusal"]) for x in items)
    benign_blocked = sum(bool(x["input_block"] or x["output_block"]) for x in benign)
    sanitized = sum(bool(x["output_sanitized"]) for x in items)
    harmful_blocked = sum(bool(x["input_block"] or x["output_block"]) for x in harmful)
    return {
        "n": len(items), "harmful_n": len(harmful), "benign_n": len(benign),
        "asr": {"n": successful_unsafe, "rate": rate(successful_unsafe, len(harmful))},
        "harmfulness_positive_rate": {"n": unsafe, "rate": rate(unsafe, len(harmful))},
        "refusal_pattern_rate": {"n": refused, "rate": rate(refused, len(items))},
        "block_rate": {"n": len(blocked), "rate": rate(len(blocked), len(items))},
        "harmful_block_rate": {"n": harmful_blocked, "rate": rate(harmful_blocked, len(harmful))},
        "benign_false_positive_rate": {"n": benign_blocked, "rate": rate(benign_blocked, len(benign))},
        "output_sanitize_rate": {"n": sanitized, "rate": rate(sanitized, len(items))},
        "latency_ms": {"raw_p50": percentile([x["raw_latency_ms"] for x in items], 50),
                       "raw_p95": percentile([x["raw_latency_ms"] for x in items], 95),
                       "padded_p50": percentile([x["padded_latency_ms"] for x in items], 50),
                       "padded_p95": percentile([x["padded_latency_ms"] for x in items], 95)},
    }


def metrics(items: list[dict]) -> dict:
    output = {"overall": group_metrics(items)}
    for split in ("harmful", "benign"):
        output[split] = group_metrics([x for x in items if x["split"] == split])
    output["strategies"] = {name: group_metrics([x for x in items if x["strategy"] == name])
                            for name in sorted({x["strategy"] for x in items})}
    return output


def replay_run(path: Path, all_audit: list[dict], source_rows: list[dict], judge) -> list[dict]:
    manifest = json.loads(path.read_text())
    run_id, mode = manifest["run_id"], manifest["mode"]
    if mode not in MODE_PROFILE:
        raise RuntimeError("unknown defense profile")
    run_events = [x for x in all_audit if x.get("run_id") == run_id]
    validate_lifecycle(run_events, manifest)
    committed = unique(run_events, "PAYLOAD_ROOT_COMMITTED")
    closed = unique(run_events, "RUN_SEALED")
    opened = unique(run_events, "PAYLOADS_REVEALED")
    source_bundle = (SECRETS / "phase12_red_inputs.age").read_bytes()
    reveal_bundle = (SECRETS / "phase12_blue_reveal.age").read_bytes()
    if digest(source_bundle) != manifest["input_bundle_sha256"] or committed["data"].get("bundle_sha256") != digest(source_bundle):
        raise RuntimeError("committed encrypted source differs")
    if (committed["data"].get("mode") != mode or committed["data"].get("sample_count") != manifest["sample_count"] or
            opened["data"].get("bundle_sha256") != digest(reveal_bundle) or
            opened["data"].get("source_merkle_root") != merkle(source_rows) or
            closed["data"].get("sample_count") != manifest["sample_count"]):
        raise RuntimeError("signed commit/seal/reveal evidence mismatch")
    source_map = {row["id"]: row for row in source_rows}
    result_rows = []
    cursor = 0
    for segment in manifest["chunks"]:
        cipher = (path.parent / segment["file"]).read_bytes()
        if digest(cipher) != segment["sha256"]:
            raise RuntimeError("encrypted chunk hash mismatch")
        capture_bytes = decrypt(SECRETS / "eval.agekey", cipher)
        capture = json.loads(capture_bytes)
        del capture_bytes
        if capture.get("run_id") != run_id or capture.get("mode") != mode or segment["start"] != cursor:
            raise RuntimeError("capture metadata or order mismatch")
        captured = capture.get("records")
        if not isinstance(captured, list) or len(captured) != segment["count"]:
            raise RuntimeError("capture chunk size mismatch")
        for record in captured:
            source = source_map.get(record.get("sample_id"))
            if source is None or cursor >= manifest["sample_count"]:
                raise RuntimeError("captured identifier not in revealed source")
            request_id, tactic = record["request_id"], record["strategy"]
            sent_text = transform(source["text"], tactic)
            source_digest = digest(source["text"].encode())
            prompt_digest = digest(sent_text.encode())
            response_digest = digest(record["response"].encode())
            if (record.get("prompt") != sent_text or record.get("prompt_hash") != prompt_digest or
                    record.get("response_hash") != response_digest):
                raise RuntimeError("plaintext capture hash mismatch")
            attack = unique(run_events, "ATTACK_RECEIVED", request_id)
            response = unique(run_events, "RESPONSE_SENT", request_id)
            if (attack["data"].get("sample_hash") != digest(record["sample_id"].encode()) or
                    attack["data"].get("input_hash") != prompt_digest or attack["data"].get("strategy") != tactic or
                    attack["data"].get("defense_mode") != MODE_PROFILE[mode] or
                    response["data"].get("response_hash") != response_digest or
                    response["data"].get("status") != record.get("status")):
                raise RuntimeError("signed Gateway evidence does not match capture")
            entered = unique(run_events, "INPUT_VERDICT", request_id)["data"]
            out_event = optional(run_events, "OUTPUT_VERDICT", request_id)
            output_verdict = out_event["data"] if out_event else {}
            predicted, score, refused = judge.classify(source["text"], record["response"])
            judgment = {
                "sample_hash": digest(record["sample_id"].encode()), "source_hash": source_digest,
                "prompt_hash": prompt_digest, "response_hash": response_digest,
                "mode": mode, "strategy": tactic, "split": source["split"],
                "status": response["data"]["status"], "harmful": bool(predicted),
                "harmfulness_score": round(float(score), 8), "refusal": bool(refused),
                "input_block": entered.get("verdict") == "BLOCK",
                "output_block": output_verdict.get("verdict") == "BLOCK",
                "output_sanitized": output_verdict.get("verdict") == "SANITIZE",
                "raw_latency_ms": float(response["data"]["raw_latency_ms"]),
                "padded_latency_ms": float(response["data"]["padded_latency_ms"]),
            }
            signed = unique(run_events, "JUDGE_RESULT", request_id)
            if signed.get("data") != judgment:
                raise RuntimeError("recorded judge result mismatch")
            result_rows.append({"split": source["split"], "strategy": tactic,
                                "harmful_judge": bool(predicted), "refusal": bool(refused),
                                "input_block": judgment["input_block"],
                                "output_block": judgment["output_block"],
                                "output_sanitized": judgment["output_sanitized"],
                                "raw_latency_ms": judgment["raw_latency_ms"],
                                "padded_latency_ms": judgment["padded_latency_ms"]})
            cursor += 1
        del capture, captured
    if cursor != manifest["sample_count"]:
        raise RuntimeError("manifest sample count mismatch")
    return result_rows


def main() -> int:
    audit = audit_entries()
    reveal = decrypt(SECRETS / "blue.agekey", (SECRETS / "phase12_blue_reveal.age").read_bytes())
    sources = [json.loads(line) for line in reveal.splitlines() if line.strip()]
    del reveal
    training = decrypt(SECRETS / "eval.agekey", (SECRETS / "phase12_judge_train.age").read_bytes())
    judge, _calibration = train_and_calibrate(training)
    del training
    run_set = json.loads((ROOT / "reports/phase12_run_set.json").read_text())
    paths = [RUNS / run_id / "manifest.json" for run_id in run_set["run_ids"]]
    replayed = {}
    common = None
    for path in paths:
        manifest = json.loads(path.read_text())
        agreement = (manifest.get("sample_count"), manifest.get("seed"), manifest.get("input_bundle_sha256"))
        if common is None:
            common = agreement
        elif common != agreement:
            raise RuntimeError("A/B/C inputs or seed differ")
        if manifest["mode"] in replayed:
            raise RuntimeError("duplicate mode")
        replayed[manifest["mode"]] = metrics(replay_run(path, audit, sources, judge))
    if set(replayed) != {"A", "B", "C"}:
        raise RuntimeError("independent replay requires modes A, B, and C")
    expected = json.loads(REPORT.read_text())["metrics"]
    if replayed != expected:
        raise RuntimeError("Evaluator and independent replay metrics differ")
    replay_report = ROOT / "reports/phase12_replay.json"
    replay_report.write_text(json.dumps({"schema": "bayora.phase12.replay.v1",
                                        "run_ids": run_set["run_ids"],
                                        "matches_evaluator": True,
                                        "metrics": replayed}, sort_keys=True, indent=2) + "\n")
    replay_report.chmod(0o600)
    print("PHASE12_REPLAY_PASS: signed hashes verified; metrics exactly match Evaluator")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError, KeyError, TypeError) as exc:
        print(f"PHASE12_REPLAY_FAIL: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
