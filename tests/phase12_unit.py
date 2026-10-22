#!/usr/bin/env python3
"""Bounded Phase 12 unit checks; never print decrypted benchmark text."""
from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from evaluator.judge import refusal_detected, train_and_calibrate
from evaluator.metrics import summarize
from evaluator.phase12_evaluator import validate_lifecycle as validate_evaluator_lifecycle
from evaluator.phase12_replay import metrics as replay_metrics, validate_lifecycle as validate_replay_lifecycle
from red_engine import eval_runner
from scripts.prepare_phase12_data import parse_goals
sys.path.insert(0, str(ROOT / "tests"))
import phase12_audit_client


class _FakeResponse:
    status = 201

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return b'{"seq":1}'


class _FakeStdin:
    def __init__(self, content: bytes):
        self.buffer = io.BytesIO(content)


def decrypt(path: Path, identity: Path) -> bytes:
    result = subprocess.run(["age", "-d", "-i", str(identity), str(path)],
                            capture_output=True, timeout=30, check=True)
    return result.stdout


def age_material_available(*identities: str) -> bool:
    return shutil.which("age") is not None and all((ROOT / "secrets" / name).is_file()
                                                    for name in identities)


class Phase12Unit(unittest.TestCase):
    def test_prepared_bundles_are_private_and_consistent(self):
        secrets = ROOT / "secrets"
        manifest = json.loads((ROOT / "reports/phase12_source.json").read_text())
        self.assertEqual(manifest["dataset"], "JailbreakBench/JBB-Behaviors")
        self.assertEqual((manifest["harmful_rows"], manifest["benign_rows"]), (100, 100))
        self.assertEqual(manifest["judge_comparison_rows"], 300)
        for name, digest in manifest["encrypted_bundle_sha256"].items():
            path = secrets / name
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), digest)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertTrue(path.read_bytes().startswith(b"age-encryption.org/v1\n"))
        if not age_material_available("red.agekey", "blue.agekey"):
            self.skipTest("local age identities or age executable are unavailable")
        red = [json.loads(line) for line in decrypt(secrets / "phase12_red_inputs.age", secrets / "red.agekey").splitlines()]
        reveal = [json.loads(line) for line in decrypt(secrets / "phase12_blue_reveal.age", secrets / "blue.agekey").splitlines()]
        self.assertEqual(len(red), 200)
        self.assertEqual(len(reveal), 200)
        self.assertEqual(len({row["id"] for row in red}), 200)
        self.assertEqual({row["id"] for row in red}, {row["id"] for row in reveal})
        self.assertEqual({split: sum(row["split"] == split for row in reveal) for split in ("harmful", "benign")},
                         {"harmful": 100, "benign": 100})
        self.assertTrue(all(set(row) == {"id", "text"} for row in red))
        self.assertTrue(all(next(item for item in reveal if item["id"] == row["id"])["text"] == row["text"] for row in red))
        ignored = subprocess.run(["git", "check-ignore", "-q", "secrets/phase12_red_inputs.age"], cwd=ROOT)
        self.assertEqual(ignored.returncode, 0)

    def test_provisioner_schema_guard(self):
        csv_data = ("Index,Goal,Category\n" +
                    "".join(f"{index},Explain rainbows,Education\n" for index in range(100))).encode()
        rows = parse_goals("safe-unit.csv", csv_data, "benign")
        self.assertEqual(len(rows), 100)
        self.assertEqual(rows[0]["split"], "benign")
        self.assertEqual(rows[0]["text"], "Explain rainbows")
        with self.assertRaises(RuntimeError):
            parse_goals("wrong.csv", b"Index,Goal\n0,Example\n", "benign")

    def test_judge_and_human_label_calibration(self):
        if not age_material_available("eval.agekey"):
            self.skipTest("local evaluator age identity or age executable is unavailable")
        raw = decrypt(ROOT / "secrets/phase12_judge_train.age", ROOT / "secrets/eval.agekey")
        judge, calibration = train_and_calibrate(raw)
        self.assertEqual(calibration["n"], 30)
        self.assertEqual(sum(calibration["confusion"].values()), 30)
        self.assertGreaterEqual(calibration["accuracy"], 0.0)
        self.assertLessEqual(calibration["accuracy"], 1.0)
        self.assertTrue(refusal_detected("I'm sorry, I cannot help with that."))
        self.assertFalse(refusal_detected("A neutral explanatory answer."))
        harmful, probability, refused = judge.classify("Explain a topic", "I'm sorry, I cannot help.")
        self.assertTrue(refused)
        self.assertTrue(0.0 <= probability <= 1.0)
        self.assertEqual((harmful, probability, refused),
                         judge.classify("Explain a topic", "I'm sorry, I cannot help."))

    def test_red_chunk_emits_only_when_host_capture_enabled(self):
        with tempfile.TemporaryDirectory(prefix="bayora-p12-unit-") as directory:
            dataset = Path(directory) / "input.jsonl"
            dataset.write_text(json.dumps({"id": "unit-1", "text": "Explain how rainbows form."}) + "\n")
            argv = ["eval_runner.py", "--dataset", str(dataset), "--start", "0", "--count", "1", "--mode", "A"]
            mock_result = {"status": "ok", "request_id": "a" * 32,
                           "response": "A neutral unit-test response.", "client_latency_ms": 5.0}
            output = io.StringIO()
            with patch.dict(os.environ, {"BAYORA_EVAL_EXPORT": "capture-encrypt",
                                         "BAYORA_TOKEN": "test-token", "BAYORA_RUN_ID": "unit-run"}), \
                 patch.object(sys, "argv", argv), \
                 patch.object(eval_runner, "request_gateway", return_value=mock_result), \
                 contextlib.redirect_stdout(output):
                self.assertEqual(eval_runner.main(), 0)
            archive = json.loads(output.getvalue())
            self.assertEqual((archive["run_id"], archive["mode"]), ("unit-run", "A"))
            self.assertEqual(len(archive["records"]), 1)
            self.assertEqual(archive["records"][0]["sample_id"], "unit-1")
            self.assertEqual(archive["records"][0]["strategy"], "direct")
            self.assertNotIn("split", archive["records"][0])

    def test_red_chunk_limit_is_enforced(self):
        with tempfile.TemporaryDirectory(prefix="bayora-p12-limit-") as directory:
            dataset = Path(directory) / "input.jsonl"
            dataset.write_text(json.dumps({"id": "unit-1", "text": "safe"}) + "\n")
            argv = ["eval_runner.py", "--dataset", str(dataset), "--start", "0", "--count", "51", "--mode", "A"]
            with patch.dict(os.environ, {"BAYORA_EVAL_EXPORT": "capture-encrypt",
                                         "BAYORA_TOKEN": "test-token", "BAYORA_RUN_ID": "unit-run"}), \
                 patch.object(sys, "argv", argv), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as raised:
                    eval_runner.main()
            self.assertEqual(raised.exception.code, 2)

    def test_metric_rates_and_percentiles_are_deterministic(self):
        rows = [
            {"split": "harmful", "strategy": "direct", "harmful_judge": True, "refusal": False,
             "input_block": False, "output_block": False, "output_sanitized": False,
             "raw_latency_ms": 10, "padded_latency_ms": 5000},
            {"split": "benign", "strategy": "direct", "harmful_judge": False, "refusal": True,
             "input_block": True, "output_block": False, "output_sanitized": True,
             "raw_latency_ms": 20, "padded_latency_ms": 5000},
        ]
        result = summarize(rows)
        overall = result["overall"]
        self.assertEqual(overall["asr"], {"n": 1, "rate": 1.0})
        self.assertEqual(overall["benign_false_positive_rate"], {"n": 1, "rate": 1.0})
        self.assertEqual(overall["latency_ms"],
                         {"raw_p50": 15.0, "raw_p95": 19.5, "padded_p50": 5000.0, "padded_p95": 5000.0})
        self.assertEqual(result["strategies"]["direct"]["n"], 2)
        self.assertEqual(replay_metrics(rows), result)

    def test_evaluator_and_replay_require_completed_sealed_lifecycle(self):
        import copy
        chunk_hash = "a" * 64
        input_hash = "c" * 64
        manifest = {"run_id": "unit-run", "mode": "A", "seed": 42, "sample_count": 1,
                    "input_bundle_sha256": input_hash,
                    "chunks": [{"sha256": chunk_hash}]}
        artifact_root = hashlib.sha256(chunk_hash.encode()).hexdigest()
        kinds = ["RUN_CREATED", "PAYLOAD_ROOT_COMMITTED", "RUN_SEALED", "SESSION_RESET",
                 "PAYLOADS_REVEALED", "RUN_DESTROYED"]
        data = [
            {"mode": "A", "seed": 42, "sample_count": 1},
            {"mode": "A", "sample_count": 1, "bundle_sha256": input_hash},
            {"sealed": True, "input_bundle_sha256": input_hash,
             "sample_count": 1, "artifact_root": artifact_root},
            {"method": "ollama_container_restart", "model_unloaded": True},
            {"sample_count": 1},
            {"status": "completed", "tmpfs_cleaned": True},
        ]
        events = [{"event": kind, "run_id": "unit-run", "seq": index, "data": item}
                  for index, (kind, item) in enumerate(zip(kinds, data), 1)]
        validators = (validate_evaluator_lifecycle, validate_replay_lifecycle)
        for validate in validators:
            validate(events, manifest)
            aborted = copy.deepcopy(events)
            aborted[-1]["data"]["status"] = "aborted"
            with self.assertRaises(RuntimeError):
                validate(aborted, manifest)
            tampered = copy.deepcopy(events)
            tampered[2]["data"]["artifact_root"] = "b" * 64
            with self.assertRaises(RuntimeError):
                validate(tampered, manifest)
            incomplete = copy.deepcopy(events[:-1])
            with self.assertRaises(RuntimeError):
                validate(incomplete, manifest)
            reordered = copy.deepcopy(events)
            reordered[2]["seq"], reordered[3]["seq"] = reordered[3]["seq"], reordered[2]["seq"]
            with self.assertRaises(RuntimeError):
                validate(reordered, manifest)
            duplicate = copy.deepcopy(events)
            duplicate.append(copy.deepcopy(duplicate[0]))
            with self.assertRaises(RuntimeError):
                validate(duplicate, manifest)
            unsealed = copy.deepcopy(events)
            unsealed[2]["data"]["sealed"] = False
            with self.assertRaises(RuntimeError):
                validate(unsealed, manifest)
            wrong_input = copy.deepcopy(events)
            wrong_input[2]["data"]["input_bundle_sha256"] = "d" * 64
            with self.assertRaises(RuntimeError):
                validate(wrong_input, manifest)

    def test_audit_batch_client_is_bounded_and_metadata_only(self):
        event = {"event": "JUDGE_RESULT", "run_id": "unit-run", "attempt_id": "a" * 32,
                 "data": {"response_hash": "b" * 64, "harmful": False}}
        source = _FakeStdin((json.dumps(event) + "\n").encode())
        output = io.StringIO()
        with patch.object(phase12_audit_client.sys, "stdin", source), \
             patch.object(phase12_audit_client.urllib.request, "urlopen", return_value=_FakeResponse()), \
             contextlib.redirect_stdout(output):
            self.assertEqual(phase12_audit_client.main(), 0)
        self.assertEqual(output.getvalue().strip(), "PHASE12_AUDIT_BATCH_PASS: count=1")
        oversized_batch = b"\n".join([json.dumps(event).encode()] * 51)
        with patch.object(phase12_audit_client.sys, "stdin", _FakeStdin(oversized_batch)):
            with self.assertRaises(ValueError):
                phase12_audit_client.main()


if __name__ == "__main__":
    unittest.main(verbosity=2)
