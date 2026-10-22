#!/usr/bin/env python3
"""Container-free tests for the Phase 12 readiness gate."""
from __future__ import annotations

import json
import hashlib
import os
from pathlib import Path
import sys
import unittest
import subprocess
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools import phase12_preflight


class Phase12PreflightTests(unittest.TestCase):
    def test_encrypted_bundle_hash_must_match_source_manifest(self):
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "bundle.age"
            path.write_bytes(b"ciphertext fixture")
            expected = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(phase12_preflight.bundle_hash_status(path, expected), "verified")
            self.assertEqual(phase12_preflight.bundle_hash_status(path, "0" * 64), "hash mismatch")
            self.assertEqual(phase12_preflight.bundle_hash_status(path, None),
                             "expected bundle hash unavailable")

    def test_signing_key_pair_check_compares_only_derived_public_bytes(self):
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            private = Path(tmp) / "private.pem"
            public = Path(tmp) / "public.pem"
            private.write_text("fixture-private-placeholder")
            public.write_text("fixture-public-placeholder")
            calls = []

            def fake_run(command, **kwargs):
                calls.append((command, kwargs))
                return subprocess.CompletedProcess(command, 0, stdout=b"derived-public")

            with patch.object(phase12_preflight, "command_exists", return_value=True), \
                 patch.object(phase12_preflight.subprocess, "run", side_effect=fake_run):
                self.assertTrue(phase12_preflight.signing_key_pair_matches(private, public))
            self.assertEqual(len(calls), 2)
            self.assertTrue(all(call[1]["stdin"] == subprocess.DEVNULL for call in calls))
            self.assertTrue(all(call[1]["stderr"] == subprocess.DEVNULL for call in calls))

            with patch.object(phase12_preflight, "command_exists", return_value=True), \
                 patch.object(phase12_preflight.subprocess, "run", side_effect=[
                     subprocess.CompletedProcess([], 0, stdout=b"derived-a"),
                     subprocess.CompletedProcess([], 0, stdout=b"derived-b"),
                 ]):
                self.assertFalse(phase12_preflight.signing_key_pair_matches(private, public))

    def test_docker_checks_use_same_sudo_daemon_as_make_targets(self):
        calls = []

        def fake_run(command, **_kwargs):
            calls.append(command)
            return subprocess.CompletedProcess(command, 0)

        with patch.object(phase12_preflight, "command_exists", return_value=True), \
             patch.object(phase12_preflight.os, "geteuid", return_value=1000), \
             patch.object(phase12_preflight.subprocess, "run", side_effect=fake_run):
            phase12_preflight.check()

        self.assertTrue(calls)
        self.assertTrue(all(command[:2] == ["sudo", "docker"] for command in calls))
        self.assertIn(["sudo", "docker", "compose", "version"], calls)

    def test_unavailable_sudo_does_not_report_images_missing(self):
        calls = []

        def fake_run(command, **_kwargs):
            calls.append(command)
            return subprocess.CompletedProcess(
                command, 1, stderr="sudo: interactive authentication is required"
            )

        with patch.object(phase12_preflight, "command_exists", return_value=True), \
             patch.object(phase12_preflight.os, "geteuid", return_value=1000), \
             patch.object(phase12_preflight.subprocess, "run", side_effect=fake_run):
            _ok, report = phase12_preflight.check()

        checks = {item["name"]: item for item in report["checks"]}
        self.assertEqual(checks["docker:compose"]["detail"], "sudo authorization unavailable")
        self.assertEqual(checks["docker:daemon"]["detail"], "not checked: Compose unavailable")
        for image in phase12_preflight.REQUIRED_IMAGES:
            self.assertEqual(checks[f"image:{image}"]["detail"],
                             "not checked: Docker daemon unavailable")
        self.assertEqual(calls, [["sudo", "docker", "compose", "version"]])

    def test_reachable_daemon_reports_only_confirmed_missing_image(self):
        def fake_run(command, **_kwargs):
            if command[-3:-1] == ["image", "inspect"]:
                return subprocess.CompletedProcess(command, 1, stderr="Error: No such image")
            return subprocess.CompletedProcess(command, 0, stderr="")

        with patch.object(phase12_preflight, "command_exists", return_value=True), \
             patch.object(phase12_preflight.os, "geteuid", return_value=0), \
             patch.object(phase12_preflight.subprocess, "run", side_effect=fake_run):
            _ok, report = phase12_preflight.check()

        checks = {item["name"]: item for item in report["checks"]}
        self.assertEqual(checks["docker:daemon"]["detail"], "available")
        image_status = [checks[f"image:{image}"]["detail"]
                        for image in phase12_preflight.REQUIRED_IMAGES]
        self.assertEqual(image_status, ["missing"] * len(phase12_preflight.REQUIRED_IMAGES))

    def test_missing_runtime_is_blocked_without_secret_output(self):
        with patch.object(phase12_preflight, "command_exists", return_value=False):
            ok, report = phase12_preflight.check()
        self.assertFalse(ok)
        rendered = json.dumps(report, sort_keys=True)
        self.assertIn("schema", rendered)
        self.assertNotIn("BEGIN PRIVATE KEY", rendered)
        self.assertNotIn("age-secret", rendered)
        self.assertTrue(any(item["name"] == "tool:age" and not item["ok"]
                            for item in report["checks"]))

    def test_report_is_aggregate_only(self):
        with patch.object(phase12_preflight, "command_exists", return_value=False):
            _ok, report = phase12_preflight.check()
        for item in report["checks"]:
            self.assertEqual(set(item), {"name", "ok", "detail"})
            self.assertNotIn("path", item)
            self.assertNotIn("value", item)


if __name__ == "__main__":
    unittest.main(verbosity=2)
