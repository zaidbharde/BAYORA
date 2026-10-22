#!/usr/bin/env python3
"""Fail-closed readiness gate for the real Phase 12 benchmark.

This checker only reports presence, permissions, and tool/image readiness. It
never decrypts, prints, regenerates, or repairs credentials or model artifacts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / "secrets"
REQUIRED_FILES = {
    "encrypted_red_inputs": SECRETS / "phase12_red_inputs.age",
    "encrypted_blue_reveal": SECRETS / "phase12_blue_reveal.age",
    "encrypted_judge_training": SECRETS / "phase12_judge_train.age",
    "red_identity": SECRETS / "red.agekey",
    "blue_identity": SECRETS / "blue.agekey",
    "evaluator_identity": SECRETS / "eval.agekey",
    "audit_private_key": SECRETS / "audit_private.pem",
    "gateway_private_key": SECRETS / "gateway_private.pem",
}
REQUIRED_IMAGES = (
    "bayora/gateway:phase3",
    "bayora/red:phase6",
    "bayora/blue:phase5",
    "bayora/audit:phase4",
    "ollama/ollama:0.6.8",
)
ENCRYPTED_BUNDLE_NAMES = {
    "encrypted_red_inputs": "phase12_red_inputs.age",
    "encrypted_blue_reveal": "phase12_blue_reveal.age",
    "encrypted_judge_training": "phase12_judge_train.age",
}
SIGNING_KEY_PAIRS = {
    "audit": (SECRETS / "audit_private.pem", SECRETS / "audit_public.pem"),
    "gateway": (SECRETS / "gateway_private.pem", SECRETS / "gateway_public.pem"),
}


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def docker_command(*args: str) -> list[str]:
    """Use the daemon context used by Make's `sudo docker compose` commands."""
    prefix = [] if os.geteuid() == 0 else ["sudo"]
    return [*prefix, "docker", *args]


def run_docker(*args: str) -> subprocess.CompletedProcess | None:
    """Run against Make's daemon while retaining stderr only for safe classification."""
    try:
        return subprocess.run(
            docker_command(*args), cwd=ROOT, stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True,
            timeout=15,
        )
    except (OSError, subprocess.SubprocessError):
        return None


def docker_failure_detail(result: subprocess.CompletedProcess | None) -> str:
    """Return a small allowlisted diagnosis; never expose raw daemon output."""
    if result is None:
        return "command could not be executed"
    error = (result.stderr or "").lower()
    if any(marker in error for marker in (
        "interactive authentication", "terminal is required", "a password is required",
    )):
        return "sudo authorization unavailable"
    if "cannot connect to the docker daemon" in error or "is the docker daemon running" in error:
        return "Docker daemon unavailable"
    if "docker: 'compose' is not a docker command" in error or "compose is not a docker command" in error:
        return "Compose v2 plugin unavailable"
    return "command failed"


def expected_bundle_hashes() -> dict[str, str]:
    try:
        data = json.loads((ROOT / "reports/phase12_source.json").read_text())
        hashes = data["encrypted_bundle_sha256"]
        return hashes if isinstance(hashes, dict) else {}
    except (OSError, KeyError, TypeError, json.JSONDecodeError):
        return {}


def bundle_hash_status(path: Path, expected: str | None) -> str:
    if (not isinstance(expected, str) or len(expected) != 64 or
            any(c not in "0123456789abcdef" for c in expected)):
        return "expected bundle hash unavailable"
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return "verified" if digest == expected else "hash mismatch"


def signing_key_pair_matches(private_key: Path, public_key: Path) -> bool:
    """Compare derived public key bytes without displaying private material."""
    if not private_key.is_file() or not public_key.is_file() or not command_exists("openssl"):
        return False
    try:
        private_public = subprocess.run(
            ["openssl", "pkey", "-in", str(private_key), "-pubout", "-outform", "DER"],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=10,
        )
        configured_public = subprocess.run(
            ["openssl", "pkey", "-pubin", "-in", str(public_key), "-outform", "DER"],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=10,
        )
        return (private_public.returncode == 0 and configured_public.returncode == 0 and
                private_public.stdout == configured_public.stdout)
    except (OSError, subprocess.SubprocessError):
        return False


def check() -> tuple[bool, dict]:
    checks: list[dict] = []

    for tool in ("age", "age-keygen", "docker", "openssl"):
        present = command_exists(tool)
        checks.append({"name": f"tool:{tool}", "ok": present,
                       "detail": "present" if present else "missing"})

    expected_hashes = expected_bundle_hashes()
    for name, path in REQUIRED_FILES.items():
        present = path.is_file()
        mode = stat.S_IMODE(path.stat().st_mode) if present else 0
        private = path.name.endswith(".agekey") or "private" in path.name
        mode_ok = True
        if present and private:
            mode_ok = (mode & 0o077) == 0
            if path.name == "audit_private.pem":
                mode_ok = mode == 0o400 and path.stat().st_uid == 10001
        detail = "present" if present and mode_ok else (
            "insecure permissions" if present else "missing"
        )
        ok = present and mode_ok
        if ok and name in ENCRYPTED_BUNDLE_NAMES:
            try:
                detail = bundle_hash_status(path, expected_hashes.get(path.name))
            except OSError:
                detail = "unreadable"
            ok = detail == "verified"
        checks.append({"name": f"file:{name}", "ok": ok, "detail": detail})

    for service, (private_key, public_key) in SIGNING_KEY_PAIRS.items():
        if not private_key.is_file() or not public_key.is_file():
            ok = False
            detail = "not checked: key file missing"
        else:
            ok = signing_key_pair_matches(private_key, public_key)
            detail = "match" if ok else "public/private key mismatch or invalid key"
        checks.append({"name": f"keypair:{service}", "ok": ok, "detail": detail})

    model_dir = ROOT / "models/ollama/models"
    model_present = model_dir.is_dir() and any(model_dir.iterdir())
    checks.append({"name": "model:ollama", "ok": model_present,
                   "detail": "present" if model_present else "missing or empty"})

    docker_ready = command_exists("docker")
    compose_result = run_docker("compose", "version") if docker_ready else None
    compose_ready = compose_result is not None and compose_result.returncode == 0
    checks.append({"name": "docker:compose", "ok": compose_ready,
                   "detail": "available" if compose_ready else
                             (docker_failure_detail(compose_result) if docker_ready else "Docker CLI missing")})

    daemon_result = run_docker("info") if compose_ready else None
    daemon_ready = daemon_result is not None and daemon_result.returncode == 0
    checks.append({"name": "docker:daemon", "ok": daemon_ready,
                   "detail": "available" if daemon_ready else
                             (docker_failure_detail(daemon_result) if compose_ready else "not checked: Compose unavailable")})

    for image in REQUIRED_IMAGES:
        if not daemon_ready:
            ok = False
            detail = "not checked: Docker daemon unavailable"
        else:
            result = run_docker("image", "inspect", image)
            ok = result is not None and result.returncode == 0
            error = (result.stderr or "").lower() if result is not None else ""
            detail = "present" if ok else (
                "missing" if "no such image" in error or "not found" in error else
                (docker_failure_detail(result) if result is None or error else "image inspect failed")
            )
        checks.append({"name": f"image:{image}", "ok": ok,
                       "detail": detail})

    ok = all(item["ok"] for item in checks)
    return ok, {"schema": "bayora.phase12.preflight.v1", "ok": ok, "checks": checks}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Phase 12 benchmark prerequisites")
    parser.add_argument("--json", action="store_true", help="emit aggregate JSON without paths or secret values")
    args = parser.parse_args()
    ok, report = check()
    if args.json:
        print(json.dumps(report, sort_keys=True))
    else:
        for item in report["checks"]:
            print(f"{'PASS' if item['ok'] else 'BLOCK'} {item['name']}: {item['detail']}")
        print("PHASE12_PREFLIGHT_PASS" if ok else "PHASE12_PREFLIGHT_BLOCKED")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
