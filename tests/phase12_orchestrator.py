#!/usr/bin/env python3
"""Deterministic, container-free tests for Phase 12 trusted-host orchestration."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))
import phase12
from red_engine.runner import transform


class FakeJudge:
    def classify(self, _goal, _response):
        return False, 0.123456789, False


class Phase12OrchestrationTests(unittest.TestCase):
    def test_batches_never_exceed_fifty(self):
        events = [phase12.make_event("JUDGE_RESULT", "unit-run", {"n": n}) for n in range(101)]
        sizes = []
        with patch.object(phase12, "append_audit", side_effect=lambda batch: sizes.append(len(batch))):
            phase12.append_batches(events)
        self.assertEqual(sizes, [50, 50, 1])

    def test_profile_switch_is_operator_controlled(self):
        calls = []
        def fake_run(command, **_kwargs):
            calls.append(command)
            return b"healthy" if "inspect" in command else b"started"
        with patch.object(phase12, "run", side_effect=fake_run):
            phase12.set_profile("B")
        self.assertIn("BAYORA_BLUE_MODE=rules", calls[0])
        self.assertIn("BAYORA_BLUE_PROFILE=rules", calls[0])
        self.assertTrue(calls[0][-2:] == ["gateway", "blue"])
        self.assertEqual(sum("inspect" in call for call in calls), 2)

    def test_runner_stdout_is_encrypted_before_file_write(self):
        raw = b'{"run_id":"unit","mode":"A","records":[]}'
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(phase12, "token", return_value="ephemeral"), \
                 patch.object(phase12.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, raw, b"")), \
                 patch.object(phase12, "age_encrypt", return_value=b"age-encrypted") as encrypt:
                metadata = phase12.run_chunk("unit-run", "A", 0, 1, 0, "age1recipient", Path(tmp))
            target = Path(tmp) / metadata["file"]
            self.assertEqual(target.read_bytes(), b"age-encrypted")
            self.assertNotIn(raw, target.read_bytes())
            encrypt.assert_called_once_with(raw, "age1recipient")
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)

    def test_judge_events_are_hash_only_and_correlated(self):
        source = {"id": "jbb-000", "split": "harmful", "text": "Example source prompt"}
        prompt = transform(source["text"], "direct")
        response = "A synthetic neutral response."
        request_id = "a" * 32
        record = {"sample_id": source["id"], "strategy": "direct", "mode": "A",
                  "request_id": request_id, "prompt": prompt,
                  "prompt_hash": hashlib.sha256(prompt.encode()).hexdigest(),
                  "response": response, "response_hash": hashlib.sha256(response.encode()).hexdigest(),
                  "status": "ok"}
        capture = json.dumps({"run_id": "unit-run", "mode": "A", "records": [record]}).encode()
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            cipher = directory / "chunk-000.age"
            cipher.write_bytes(b"cipher")
            manifest = {"run_id": "unit-run", "mode": "A", "chunks": [
                {"file": cipher.name, "sha256": hashlib.sha256(b"cipher").hexdigest()}]}
            path = directory / "manifest.json"
            path.write_text(json.dumps(manifest))
            audit = [
                {"event": "INPUT_VERDICT", "run_id": "unit-run", "attempt_id": request_id,
                 "data": {"verdict": "ALLOW"}},
                {"event": "OUTPUT_VERDICT", "run_id": "unit-run", "attempt_id": request_id,
                 "data": {"verdict": "ALLOW"}},
                {"event": "RESPONSE_SENT", "run_id": "unit-run", "attempt_id": request_id,
                 "data": {"status": "ok", "raw_latency_ms": 17.25, "padded_latency_ms": 5000}},
            ]
            with patch.object(phase12, "age_decrypt", return_value=capture), \
                 patch.object(phase12, "audit_for_run", return_value=audit):
                events = phase12.build_judge_events(path, [source], FakeJudge())
        self.assertEqual(len(events), 1)
        event = events[0]
        self.assertEqual(event["attempt_id"], request_id)
        self.assertNotIn("prompt", event["data"])
        self.assertNotIn("response", event["data"])
        self.assertEqual(event["data"]["harmfulness_score"], 0.12345679)
        self.assertEqual(event["data"]["source_hash"], hashlib.sha256(source["text"].encode()).hexdigest())

    def test_cleanup_targets_both_tenant_tmpfs_paths(self):
        commands = []
        with patch.object(phase12, "run", side_effect=lambda cmd, **_kwargs: commands.append(cmd) or b""):
            phase12.cleanup_tmpfs()
        rendered = " ".join(" ".join(command) for command in commands)
        self.assertIn("/tmp/phase12_inputs.jsonl", rendered)
        self.assertIn("/tmp/phase12_reveal.jsonl", rendered)
        self.assertEqual(len(commands), 2)

    def test_released_plaintext_files_use_private_create_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "released.jsonl"

            def execute_release(command, *, input_bytes, **_kwargs):
                code = command[command.index("-c") + 1]
                result = subprocess.run([sys.executable, "-c", code], input=input_bytes,
                                        capture_output=True, check=True)
                return result.stdout

            plaintext = b'{"id":"fixture","text":"fixture only"}\n'
            with patch.object(phase12, "run", side_effect=execute_release):
                phase12.deliver("red", str(target), plaintext)

            self.assertEqual(target.read_bytes(), plaintext)
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main(verbosity=2)
