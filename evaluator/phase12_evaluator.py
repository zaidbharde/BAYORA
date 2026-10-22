#!/usr/bin/env python3
"""Trusted-host Phase 12 evaluator. Plaintext is held in memory only."""
from __future__ import annotations

import hashlib
import json
import os
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
from evaluator.metrics import summarize
from red_engine.runner import transform


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def merkle_root(items: list[dict]) -> str:
    hashes = [hashlib.sha256(item["text"].encode()).hexdigest() for item in items]
    if not hashes:
        return hashlib.sha256(b"").hexdigest()
    level = [hashlib.sha256(b"\x00" + bytes.fromhex(value)).digest() for value in hashes]
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [hashlib.sha256(b"\x01" + level[i] + level[i + 1]).digest()
                 for i in range(0, len(level), 2)]
    return level[0].hex()


def age_decrypt(identity: Path, ciphertext: bytes) -> bytes:
    result = subprocess.run(["age", "-d", "-i", str(identity)], input=ciphertext,
                            capture_output=True, timeout=60)
    if result.returncode:
        raise RuntimeError("encrypted artifact could not be decrypted")
    return result.stdout


def read_jsonl(raw: bytes) -> list[dict]:
    try:
        return [json.loads(line) for line in raw.splitlines() if line.strip()]
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("invalid encrypted JSONL artifact") from exc


def verify_audit() -> None:
    result = subprocess.run([sys.executable, "tools/bayora_verify.py"], cwd=ROOT,
                            capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise RuntimeError("signed Audit verification failed")


def load_audit() -> list[dict]:
    path = ROOT / "data/audit/audit.jsonl"
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _one(events: list[dict], kind: str, request_id: str | None = None) -> dict:
    found = [entry for entry in events if entry.get("event") == kind and
             (request_id is None or entry.get("attempt_id") == request_id)]
    if len(found) != 1:
        raise RuntimeError("signed Audit event cardinality mismatch")
    return found[0]


def _event(events: list[dict], kind: str, request_id: str) -> dict | None:
    found = [entry for entry in events if entry.get("event") == kind and
             entry.get("attempt_id") == request_id]
    if len(found) > 1:
        raise RuntimeError("duplicate request Audit event")
    return found[0] if found else None


def validate_lifecycle(events: list[dict], manifest: dict) -> None:
    """Require one ordered, successfully completed and fully sealed run."""
    mode = manifest["mode"]
    created = _one(events, "RUN_CREATED")
    commit = _one(events, "PAYLOAD_ROOT_COMMITTED")
    sealed = _one(events, "RUN_SEALED")
    reset = _one(events, "SESSION_RESET")
    revealed = _one(events, "PAYLOADS_REVEALED")
    destroyed = _one(events, "RUN_DESTROYED")
    count = manifest["sample_count"]
    artifact_root = sha("".join(chunk["sha256"] for chunk in manifest["chunks"]).encode())
    if (created["data"].get("mode") != mode or created["data"].get("seed") != manifest.get("seed") or
            created["data"].get("sample_count") != count or
            commit["data"].get("mode") != mode or commit["data"].get("sample_count") != count or
            commit["data"].get("bundle_sha256") != manifest.get("input_bundle_sha256") or
            sealed["data"].get("sealed") is not True or
            sealed["data"].get("input_bundle_sha256") != manifest.get("input_bundle_sha256") or
            sealed["data"].get("sample_count") != count or
            sealed["data"].get("artifact_root") != artifact_root or
            revealed["data"].get("sample_count") != count or
            reset["data"].get("method") != "ollama_container_restart" or
            reset["data"].get("model_unloaded") is not True or
            destroyed["data"].get("status") != "completed" or
            destroyed["data"].get("tmpfs_cleaned") is not True):
        raise RuntimeError("signed run lifecycle or seal metadata mismatch")
    ordered = (created, commit, sealed, reset, revealed, destroyed)
    sequences = [entry.get("seq") for entry in ordered]
    if any(not isinstance(seq, int) for seq in sequences) or sequences != sorted(set(sequences)):
        raise RuntimeError("signed run lifecycle order is invalid")


def load_manifest(path: Path) -> dict:
    try:
        manifest = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("invalid Phase 12 run manifest") from exc
    required = {"run_id", "mode", "sample_count", "input_bundle_sha256", "chunks"}
    if not required.issubset(manifest) or manifest["mode"] not in MODE_PROFILE:
        raise RuntimeError("incomplete Phase 12 run manifest")
    return manifest


def prepare_run(manifest_path: Path, judge, audit_entries: list[dict],
                reveal_rows: list[dict]) -> tuple[list[dict], list[dict]]:
    manifest = load_manifest(manifest_path)
    run_id, mode = manifest["run_id"], manifest["mode"]
    source_bundle = (SECRETS / "phase12_red_inputs.age").read_bytes()
    reveal_bundle = (SECRETS / "phase12_blue_reveal.age").read_bytes()
    if sha(source_bundle) != manifest["input_bundle_sha256"]:
        raise RuntimeError("committed input bundle digest mismatch")
    events = [e for e in audit_entries if e.get("run_id") == run_id]
    validate_lifecycle(events, manifest)
    commit = _one(events, "PAYLOAD_ROOT_COMMITTED")
    sealed = _one(events, "RUN_SEALED")
    revealed = _one(events, "PAYLOADS_REVEALED")
    if commit["data"].get("bundle_sha256") != sha(source_bundle):
        raise RuntimeError("signed input commitment mismatch")
    if commit["data"].get("mode") != mode or commit["data"].get("sample_count") != manifest["sample_count"]:
        raise RuntimeError("signed run metadata mismatch")
    if revealed["data"].get("bundle_sha256") != sha(reveal_bundle):
        raise RuntimeError("signed reveal bundle digest mismatch")
    if revealed["data"].get("source_merkle_root") != merkle_root(reveal_rows):
        raise RuntimeError("revealed source Merkle root mismatch")
    if sealed["data"].get("sample_count") != manifest["sample_count"]:
        raise RuntimeError("signed seal sample count mismatch")
    actual = []
    judge_events = []
    expected_index = 0
    source_by_id = {item["id"]: item for item in reveal_rows}
    for chunk in manifest["chunks"]:
        encrypted = (manifest_path.parent / chunk["file"]).read_bytes()
        if sha(encrypted) != chunk["sha256"]:
            raise RuntimeError("encrypted capture digest mismatch")
        raw = age_decrypt(SECRETS / "eval.agekey", encrypted)
        captured = json.loads(raw)
        del raw
        if captured.get("run_id") != run_id or captured.get("mode") != mode:
            raise RuntimeError("encrypted capture run binding mismatch")
        rows = captured.get("records")
        if not isinstance(rows, list) or len(rows) != chunk["count"] or chunk["start"] != expected_index:
            raise RuntimeError("encrypted capture chunk range mismatch")
        for record in rows:
            if expected_index >= manifest["sample_count"]:
                raise RuntimeError("capture exceeded committed sample count")
            sample = source_by_id.get(record.get("sample_id"))
            if sample is None or record.get("mode") != mode:
                raise RuntimeError("captured sample absent from revealed artifact")
            strategy = record["strategy"]
            expected_prompt = transform(sample["text"], strategy)
            source_hash = sha(sample["text"].encode())
            prompt_hash = sha(expected_prompt.encode())
            response_hash = sha(record["response"].encode())
            if (record.get("prompt") != expected_prompt or record.get("prompt_hash") != prompt_hash or
                    record.get("response_hash") != response_hash):
                raise RuntimeError("captured source or response hash mismatch")
            request_id = record.get("request_id")
            if not isinstance(request_id, str) or len(request_id) != 32:
                raise RuntimeError("invalid Gateway request correlation")
            attack = _one(events, "ATTACK_RECEIVED", request_id)
            response = _one(events, "RESPONSE_SENT", request_id)
            if (attack["data"].get("input_hash") != prompt_hash or
                    attack["data"].get("sample_hash") != sha(record["sample_id"].encode()) or
                    attack["data"].get("strategy") != strategy or
                    attack["data"].get("defense_mode") != MODE_PROFILE[mode] or
                    response["data"].get("response_hash") != response_hash or
                    response["data"].get("status") != record.get("status")):
                raise RuntimeError("Gateway signed request/reply evidence mismatch")
            input_verdict = _one(events, "INPUT_VERDICT", request_id)["data"]
            output_entry = _event(events, "OUTPUT_VERDICT", request_id)
            output_verdict = output_entry["data"] if output_entry else {}
            harmful, probability, refused = judge.classify(sample["text"], record["response"])
            judge_data = {
                "sample_hash": sha(record["sample_id"].encode()),
                "source_hash": source_hash,
                "prompt_hash": prompt_hash,
                "response_hash": response_hash,
                "mode": mode,
                "strategy": strategy,
                "split": sample["split"],
                "status": response["data"]["status"],
                "harmful": bool(harmful),
                "harmfulness_score": round(float(probability), 8),
                "refusal": bool(refused),
                "input_block": input_verdict.get("verdict") == "BLOCK",
                "output_block": output_verdict.get("verdict") == "BLOCK",
                "output_sanitized": output_verdict.get("verdict") == "SANITIZE",
                "raw_latency_ms": float(response["data"]["raw_latency_ms"]),
                "padded_latency_ms": float(response["data"]["padded_latency_ms"]),
            }
            signed_judge = _one(events, "JUDGE_RESULT", request_id)
            if signed_judge["data"] != judge_data:
                raise RuntimeError("signed judge result differs from independent judging")
            judge_events.append(signed_judge)
            actual.append({
                "split": sample["split"], "strategy": strategy,
                "harmful_judge": bool(harmful), "refusal": bool(refused),
                "input_block": judge_data["input_block"], "output_block": judge_data["output_block"],
                "output_sanitized": judge_data["output_sanitized"],
                "raw_latency_ms": judge_data["raw_latency_ms"],
                "padded_latency_ms": judge_data["padded_latency_ms"],
            })
            expected_index += 1
        del captured, rows
    if expected_index != manifest["sample_count"]:
        raise RuntimeError("captured sample count differs from commitment")
    if len(judge_events) != manifest["sample_count"]:
        raise RuntimeError("signed JUDGE_RESULT count mismatch")
    return actual, judge_events


def evaluate_manifests(manifest_paths: list[Path]) -> dict:
    if not manifest_paths:
        raise ValueError("no Phase 12 runs supplied")
    verify_audit()
    audit_entries = load_audit()
    reveal_raw = age_decrypt(SECRETS / "blue.agekey", (SECRETS / "phase12_blue_reveal.age").read_bytes())
    reveal_rows = read_jsonl(reveal_raw)
    del reveal_raw
    if len(reveal_rows) != 200 or len({row.get("id") for row in reveal_rows}) != 200:
        raise RuntimeError("revealed dataset schema/count mismatch")
    if sum(row.get("split") == "harmful" for row in reveal_rows) != 100 or sum(
            row.get("split") == "benign" for row in reveal_rows) != 100:
        raise RuntimeError("revealed benchmark class counts mismatch")
    judge_raw = age_decrypt(SECRETS / "eval.agekey", (SECRETS / "phase12_judge_train.age").read_bytes())
    judge, calibration = train_and_calibrate(judge_raw)
    del judge_raw

    modes: dict[str, dict] = {}
    shared = None
    for path in sorted(manifest_paths, key=lambda item: item.name):
        manifest = load_manifest(path)
        mode = manifest["mode"]
        if mode in modes:
            raise RuntimeError("duplicate defense mode in evaluator input")
        agreement = (manifest.get("sample_count"), manifest.get("seed"), manifest.get("input_bundle_sha256"))
        if shared is None:
            shared = agreement
        elif shared != agreement:
            raise RuntimeError("A/B/C payload, count, or seed differs")
        records, _ = prepare_run(path, judge, audit_entries, reveal_rows)
        modes[mode] = {"run_id": manifest["run_id"], "metrics": summarize(records),
                       "sample_count": manifest["sample_count"], "seed": manifest["seed"],
                       "input_bundle_sha256": manifest["input_bundle_sha256"],
                       "source_merkle_root": merkle_root(reveal_rows),
                       "artifact_sha256": [chunk["sha256"] for chunk in manifest["chunks"]]}
        del records
    if set(modes) != {"A", "B", "C"}:
        raise RuntimeError("Evaluator requires exactly modes A, B, and C")
    report = {
        "schema": "bayora.phase12.evaluator.v1",
        "dataset": "JailbreakBench/JBB-Behaviors",
        "dataset_revision": "886acc352a31533ffbcf4ef22c744658688086fc",
        "seed": shared[1], "sample_count_per_mode": shared[0],
        "calibration": calibration,
        "modes": modes,
        "metrics": {mode: modes[mode]["metrics"] for mode in ("A", "B", "C")},
    }
    return report


def write_report(report: dict, path: Path = REPORT) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = (json.dumps(report, sort_keys=True, indent=2) + "\n").encode()
    temporary = path.with_suffix(path.suffix + ".tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(rendered)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    os.chmod(path, 0o600)


def main() -> int:
    run_set = json.loads((ROOT / "reports/phase12_run_set.json").read_text())
    paths = [RUNS / run_id / "manifest.json" for run_id in run_set["run_ids"]]
    report = evaluate_manifests(paths)
    write_report(report)
    print("PHASE12_EVALUATOR_PASS: aggregate-only report written; no response plaintext emitted")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError, KeyError, TypeError) as exc:
        print(f"PHASE12_EVALUATOR_FAIL: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
