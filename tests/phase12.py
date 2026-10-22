#!/usr/bin/env python3
"""Trusted-host Phase 12 A/B/C benchmark coordinator.

Never invoke the Red runner outside this coordinator: stdout contains prompts and
model replies and is captured in memory, immediately age-encrypted, and never logged.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / "secrets"
RUNS = SECRETS / "phase12_runs"
RED_INPUT = SECRETS / "phase12_red_inputs.age"
BLUE_REVEAL = SECRETS / "phase12_blue_reveal.age"
JUDGE_TRAIN = SECRETS / "phase12_judge_train.age"
MAX_CHUNK = 50
TOTAL_SAMPLES = 200
SEED = 42
MODE_PROFILE = {"A": ("none", "rules"), "B": ("rules", "rules"), "C": ("full", "full")}
RED_FILE = "/tmp/phase12_inputs.jsonl"
BLUE_FILE = "/tmp/phase12_reveal.jsonl"

sys.path.insert(0, str(ROOT))
from evaluator.judge import train_and_calibrate
from evaluator.phase12_evaluator import evaluate_manifests, write_report
from red_engine.runner import transform


def run(cmd: list[str], *, input_bytes: bytes | None = None, timeout: int = 60,
        label: str = "operation") -> bytes:
    try:
        result = subprocess.run(cmd, cwd=ROOT, input=input_bytes, capture_output=True,
                                 timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        # Never print the exception: it may retain a partial raw runner stream.
        if exc.stdout:
            raw = exc.stdout if isinstance(exc.stdout, bytes) else exc.stdout.encode()
            try:
                age_store(raw, RUNS / ".failed-timeout.age")
            except Exception:
                pass
            del raw
        raise RuntimeError(label + " timed out") from None
    if result.returncode:
        raise RuntimeError(label + " failed")
    return result.stdout


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def merkle(rows: list[dict]) -> str:
    leaves = [digest(row["text"].encode()) for row in rows]
    if not leaves:
        return digest(b"")
    level = [hashlib.sha256(b"\x00" + bytes.fromhex(item)).digest() for item in leaves]
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [hashlib.sha256(b"\x01" + level[i] + level[i + 1]).digest()
                 for i in range(0, len(level), 2)]
    return level[0].hex()


def jsonl_rows(raw: bytes) -> list[dict]:
    try:
        return [json.loads(line) for line in raw.splitlines() if line.strip()]
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("invalid Phase 12 bundle") from exc


def private_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".phase12-", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
        os.chmod(path, 0o600)
    except BaseException:
        try:
            os.unlink(name)
        except FileNotFoundError:
            pass
        raise


def age_public(identity: Path) -> str:
    return run(["age-keygen", "-y", str(identity)], timeout=10, label="age public-key lookup").decode().strip()


def age_decrypt(identity: Path, ciphertext: bytes) -> bytes:
    result = subprocess.run(["age", "-d", "-i", str(identity)], input=ciphertext,
                            capture_output=True, timeout=120, cwd=ROOT)
    if result.returncode:
        raise RuntimeError("encrypted bundle decryption failed")
    return result.stdout


def age_encrypt(plaintext: bytes, recipient: str) -> bytes:
    result = subprocess.run(["age", "-r", recipient], input=plaintext,
                            capture_output=True, timeout=120, cwd=ROOT)
    if result.returncode:
        raise RuntimeError("captured output encryption failed")
    return result.stdout


def age_store(raw: bytes, target: Path) -> dict:
    encrypted = age_encrypt(raw, age_public(SECRETS / "eval.agekey"))
    metadata = {"file": target.name, "sha256": digest(encrypted), "bytes": len(encrypted)}
    private_write(target, encrypted)
    del encrypted
    return metadata


def append_audit(events: list[dict]) -> None:
    if not 1 <= len(events) <= MAX_CHUNK:
        raise ValueError("Audit batch must contain 1..50 events")
    lines = b"".join((json.dumps(event, separators=(",", ":"), ensure_ascii=False) + "\n").encode()
                    for event in events)
    run(["sudo", "docker", "compose", "run", "--rm", "--no-deps", "audit-test",
         "/tests/phase12_audit_client.py"], input_bytes=lines, timeout=180, label="Audit append")


def append_batches(events: list[dict]) -> None:
    for start in range(0, len(events), MAX_CHUNK):
        append_audit(events[start:start + MAX_CHUNK])


def verify_audit() -> None:
    run([sys.executable, "tools/bayora_verify.py"], timeout=180, label="Audit verification")


def token(role: str, run_id: str) -> str:
    return run([sys.executable, "tools/issue_token.py", "--role", role,
                "--run-id", run_id, "--ttl", "900"], timeout=10,
               label="short-lived token issuance").decode().strip()


def deliver(service: str, path: str, content: bytes) -> None:
    code = ("import os,sys; p=" + repr(path) + "; fd=os.open(p, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600); "
            "os.fchmod(fd, 0o600); f=os.fdopen(fd, 'wb'); f.write(sys.stdin.buffer.read()); f.close()")
    run(["sudo", "docker", "compose", "exec", "-T", service, "python", "-c", code],
        input_bytes=content, timeout=60, label=service + " tmpfs release")


def cleanup_tmpfs() -> None:
    for service, path in (("red", RED_FILE), ("blue", BLUE_FILE)):
        code = ("import os; p=" + repr(path) + "; os.path.exists(p) and os.remove(p); "
                "assert not os.path.exists(p)")
        run(["sudo", "docker", "compose", "exec", "-T", service, "python", "-c", code],
            timeout=30, label=service + " tmpfs cleanup")


def set_profile(mode: str) -> None:
    gateway_mode, blue_profile = MODE_PROFILE[mode]
    run(["sudo", "env", f"BAYORA_BLUE_MODE={gateway_mode}",
         f"BAYORA_BLUE_PROFILE={blue_profile}", "docker", "compose", "up", "-d",
         "--no-deps", "--no-build", "--pull", "never", "--force-recreate", "gateway", "blue"],
        timeout=180, label="operator profile switch")
    for service in ("gateway", "blue"):
        container = "bayora-" + service + "-1"
        state = ""
        for _ in range(60):
            try:
                state = run(["sudo", "docker", "inspect", "-f",
                             "{{.State.Health.Status}}", container], timeout=10,
                            label="service health check").decode().strip()
            except RuntimeError:
                state = "starting"
            if state == "healthy":
                break
            import time
            time.sleep(2)
        if state != "healthy":
            raise RuntimeError(service + " did not become healthy after profile switch")


def atomic_manifest(directory: Path, manifest: dict) -> None:
    raw = (json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n").encode()
    private_write(directory / "manifest.json", raw)


def make_event(event: str, run_id: str, data: dict, attempt_id: str | None = None) -> dict:
    item = {"event": event, "run_id": run_id, "data": data}
    if attempt_id:
        item["attempt_id"] = attempt_id
    return item


def audit_for_run(run_id: str) -> list[dict]:
    return [json.loads(line) for line in (ROOT / "data/audit/audit.jsonl").read_text().splitlines()
            if json.loads(line).get("run_id") == run_id]


def _audit_one(events: list[dict], kind: str, request_id: str) -> dict:
    found = [item for item in events if item.get("event") == kind and item.get("attempt_id") == request_id]
    if len(found) != 1:
        raise RuntimeError("Gateway request evidence is incomplete")
    return found[0]


def build_judge_events(manifest_path: Path, reveal_rows: list[dict], judge) -> list[dict]:
    manifest = json.loads(manifest_path.read_text())
    run_id, mode = manifest["run_id"], manifest["mode"]
    events = audit_for_run(run_id)
    source_by_id = {row["id"]: row for row in reveal_rows}
    output = []
    for chunk in manifest["chunks"]:
        cipher = (manifest_path.parent / chunk["file"]).read_bytes()
        if digest(cipher) != chunk["sha256"]:
            raise RuntimeError("encrypted capture hash mismatch")
        raw = age_decrypt(SECRETS / "eval.agekey", cipher)
        capture = json.loads(raw)
        del raw
        for record in capture["records"]:
            sample = source_by_id[record["sample_id"]]
            source_hash = digest(sample["text"].encode())
            prompt_hash = digest(transform(sample["text"], record["strategy"]).encode())
            response_hash = digest(record["response"].encode())
            request_id = record["request_id"]
            input_verdict = _audit_one(events, "INPUT_VERDICT", request_id)["data"]
            output_entries = [e for e in events if e.get("event") == "OUTPUT_VERDICT" and e.get("attempt_id") == request_id]
            if len(output_entries) > 1:
                raise RuntimeError("duplicate output verdict")
            output_verdict = output_entries[0]["data"] if output_entries else {}
            response = _audit_one(events, "RESPONSE_SENT", request_id)["data"]
            harmful, score, refused = judge.classify(sample["text"], record["response"])
            data = {
                "sample_hash": digest(record["sample_id"].encode()), "source_hash": source_hash,
                "prompt_hash": prompt_hash, "response_hash": response_hash,
                "mode": mode, "strategy": record["strategy"], "split": sample["split"],
                "status": response["status"], "harmful": bool(harmful),
                "harmfulness_score": round(float(score), 8), "refusal": bool(refused),
                "input_block": input_verdict.get("verdict") == "BLOCK",
                "output_block": output_verdict.get("verdict") == "BLOCK",
                "output_sanitized": output_verdict.get("verdict") == "SANITIZE",
                "raw_latency_ms": float(response["raw_latency_ms"]),
                "padded_latency_ms": float(response["padded_latency_ms"]),
            }
            output.append(make_event("JUDGE_RESULT", run_id, data, request_id))
        del capture
    return output


def run_chunk(run_id: str, mode: str, start: int, count: int, index: int,
              recipient: str, directory: Path) -> dict:
    red_token = token("red", run_id)
    command = ["sudo", "docker", "compose", "exec", "-T", "-e", f"BAYORA_TOKEN={red_token}",
               "-e", f"BAYORA_RUN_ID={run_id}", "-e", "BAYORA_EVAL_EXPORT=capture-encrypt",
               "red", "python", "/app/red_engine/eval_runner.py", "--dataset", RED_FILE,
               "--start", str(start), "--count", str(count), "--mode", mode]
    try:
        try:
            result = subprocess.run(command, cwd=ROOT, capture_output=True, timeout=1000)
        except subprocess.TimeoutExpired as exc:
            raw = exc.stdout or b""
            if isinstance(raw, str):
                raw = raw.encode()
            if raw:
                age_store(raw, directory / f"chunk-{index:03d}-partial.age")
            del raw
            raise RuntimeError("Red chunk timed out") from None
        raw = result.stdout
        raw_size = len(raw)
        stderr_size = len(result.stderr or b"")
        encrypted = age_encrypt(raw, recipient)
        del raw
        result.stdout = b""
        result.stderr = b""
        target = directory / f"chunk-{index:03d}.age"
        private_write(target, encrypted)
        metadata = {"start": start, "count": count, "file": target.name,
                    "sha256": digest(encrypted), "bytes": len(encrypted)}
        del encrypted
        if result.returncode:
            raise RuntimeError(f"Red chunk failed (exit={result.returncode}, stdout={raw_size}B, stderr={stderr_size}B)")
        return metadata
    finally:
        red_token = ""


def run_mode(mode: str, sample_count: int) -> Path:
    run_id = f"phase12-{mode.lower()}-{uuid.uuid4().hex[:12]}"
    if not re.fullmatch(r"phase12-[abc]-[0-9a-f]{12}", run_id):
        raise RuntimeError("invalid run identifier")
    directory = RUNS / run_id
    directory.mkdir(mode=0o700, parents=True, exist_ok=False)
    committed = False
    revealed = False
    manifest = {"schema": "bayora.phase12.run.v1", "run_id": run_id, "mode": mode,
                "profile": MODE_PROFILE[mode][0], "seed": SEED, "sample_count": sample_count,
                "input_bundle_sha256": digest(RED_INPUT.read_bytes()), "chunks": []}
    manifest_path = directory / "manifest.json"
    atomic_manifest(directory, manifest)
    try:
        set_profile(mode)
        append_audit([make_event("RUN_CREATED", run_id, {"mode": mode, "seed": SEED,
                                                            "sample_count": sample_count})])
        append_audit([make_event("PAYLOAD_ROOT_COMMITTED", run_id, {
            "bundle_sha256": manifest["input_bundle_sha256"], "dataset": "JailbreakBench/JBB-Behaviors",
            "revision": "886acc352a31533ffbcf4ef22c744658688086fc", "seed": SEED,
            "sample_count": sample_count, "mode": mode,
        })])
        verify_audit()
        committed = True

        red_plain = age_decrypt(SECRETS / "red.agekey", RED_INPUT.read_bytes())
        red_rows = jsonl_rows(red_plain)
        if len(red_rows) != TOTAL_SAMPLES or len({row.get("id") for row in red_rows}) != TOTAL_SAMPLES:
            raise RuntimeError("Red input bundle does not contain the pinned 200 unique samples")
        red_ids = {row["id"] for row in red_rows}
        if sample_count > len(red_rows):
            raise ValueError("requested sample count exceeds input bundle")
        deliver("red", RED_FILE, red_plain)
        del red_plain, red_rows

        eval_recipient = age_public(SECRETS / "eval.agekey")
        for chunk_index, start in enumerate(range(0, sample_count, MAX_CHUNK)):
            count = min(MAX_CHUNK, sample_count - start)
            chunk = run_chunk(run_id, mode, start, count, chunk_index, eval_recipient, directory)
            manifest["chunks"].append(chunk)
            atomic_manifest(directory, manifest)
        artifact_root = digest("".join(chunk["sha256"] for chunk in manifest["chunks"]).encode())
        append_audit([make_event("RUN_SEALED", run_id, {
            "sealed": True, "artifact_root": artifact_root, "sample_count": sample_count,
            "input_bundle_sha256": manifest["input_bundle_sha256"],
        })])
        verify_audit()
        reset_output = run(["bash", "scripts/reset_model.sh"], timeout=150, label="model reset")
        if b"MODEL_PROCESS_RESET_PASS" not in reset_output:
            raise RuntimeError("model reset did not produce a verified pass marker")
        append_audit([make_event("SESSION_RESET", run_id, {"method": "ollama_container_restart",
                                                            "model_unloaded": True})])

        reveal_cipher = BLUE_REVEAL.read_bytes()
        reveal_plain = age_decrypt(SECRETS / "blue.agekey", reveal_cipher)
        reveal_rows = jsonl_rows(reveal_plain)
        if len(reveal_rows) != TOTAL_SAMPLES or len({row.get("id") for row in reveal_rows}) != TOTAL_SAMPLES:
            raise RuntimeError("Blue reveal bundle schema/count mismatch")
        if {row["id"] for row in reveal_rows} != red_ids:
            raise RuntimeError("Red and Blue sample identifiers differ")
        deliver("blue", BLUE_FILE, reveal_plain)
        append_audit([make_event("PAYLOADS_REVEALED", run_id, {
            "bundle_sha256": digest(reveal_cipher), "source_merkle_root": merkle(reveal_rows),
            "sample_count": sample_count, "source_count": len(reveal_rows),
        })])
        revealed = True

        judge_raw = age_decrypt(SECRETS / "eval.agekey", JUDGE_TRAIN.read_bytes())
        judge, calibration = train_and_calibrate(judge_raw)
        del judge_raw
        judge_events = build_judge_events(manifest_path, reveal_rows, judge)
        if len(judge_events) != sample_count:
            raise RuntimeError("judge output count differs from run commitment")
        append_batches(judge_events)
        del judge_events, judge
        verify_audit()
        cleanup_tmpfs()
        append_audit([make_event("RUN_DESTROYED", run_id, {
            "tmpfs_cleaned": True, "status": "completed", "encrypted_chunks": len(manifest["chunks"]),
        })])
        manifest["source_merkle_root"] = merkle(reveal_rows)
        manifest["reveal_bundle_sha256"] = digest(reveal_cipher)
        manifest["calibration_n"] = calibration["n"]
        manifest["calibration"] = calibration
        atomic_manifest(directory, manifest)
        del reveal_plain, reveal_rows, reveal_cipher
        return manifest_path
    except BaseException:
        # Do not expose subprocess errors or plaintext while ensuring tenant tmpfs cleanup.
        try:
            cleanup_tmpfs()
            if committed:
                append_audit([make_event("RUN_DESTROYED", run_id, {
                    "tmpfs_cleaned": True, "status": "aborted", "revealed": revealed,
                })])
        except Exception:
            pass
        raise


def write_run_set(paths: list[Path]) -> Path:
    records = [json.loads(path.read_text()) for path in paths]
    data = {"run_ids": [item["run_id"] for item in records],
            "modes": [item["mode"] for item in records], "seed": SEED,
            "sample_count": records[0]["sample_count"]}
    target = ROOT / "reports/phase12_run_set.json"
    target.write_text(json.dumps(data, sort_keys=True, indent=2) + "\n")
    os.chmod(target, 0o600)
    return target


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Trusted-host Phase 12 A/B/C evaluation")
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--benchmark", action="store_true", help="run all 200 items in A/B/C")
    selection.add_argument("--smoke-count", type=int, help="run 1..5 samples per mode; not benchmark evidence")
    args = parser.parse_args()
    if args.smoke_count is not None and not 1 <= args.smoke_count <= 5:
        parser.error("--smoke-count must be 1..5")
    if not (SECRETS / "phase12_red_inputs.age").is_file() or not (SECRETS / "phase12_blue_reveal.age").is_file() or not (SECRETS / "phase12_judge_train.age").is_file():
        parser.error("encrypted Phase 12 bundles are missing")
    sample_count = TOTAL_SAMPLES if args.benchmark else args.smoke_count
    paths = []
    for mode in ("A", "B", "C"):
        paths.append(run_mode(mode, sample_count))
    write_run_set(paths)
    report = evaluate_manifests(paths)
    write_report(report)
    replay = run([sys.executable, "evaluator/phase12_replay.py"], timeout=300,
                 label="independent replay")
    if b"PHASE12_REPLAY_PASS" not in replay:
        raise RuntimeError("independent replay did not confirm exact metrics equality")
    print("PHASE12_BENCHMARK_PASS" if args.benchmark else "PHASE12_SMOKE_PASS")
    print("Evaluator and independent replay metrics match exactly; plaintext was not emitted")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError, KeyError, TypeError) as exc:
        # Exception text is deliberately excluded because subprocess errors can retain output.
        detail = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__
        print(f"PHASE12_ORCHESTRATION_FAIL: {detail}", file=sys.stderr)
        raise SystemExit(1)
