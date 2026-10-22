#!/usr/bin/env python3
"""Pre-build Gateway mode contract test using the existing dependency image only."""
from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "bayora/gateway:phase3"
CODE = r'''from pydantic import ValidationError
from gateway.app import Attack, BLUE_MODE
assert BLUE_MODE == EXPECTED
valid = Attack(text="safe smoke", sample_id="unit-01", strategy="direct", blue_mode="none")
assert not hasattr(valid, "blue_mode")
assert "blue_mode" not in valid.model_dump()
for field, value in (("sample_id", "bad/id"), ("strategy", "none")):
    try:
        Attack(text="safe", **{field: value})
    except ValidationError:
        pass
    else:
        raise AssertionError("invalid tenant metadata accepted")
print("GATEWAY_MODE_IMPORT_PASS")
'''


def run(mode: str, expected_ok: bool) -> None:
    code = CODE.replace("EXPECTED", repr(mode))
    command = [
        "sudo", "docker", "run", "--rm", "--network", "none", "--read-only",
        "--tmpfs", "/tmp:size=8m,noexec,nosuid,nodev",
        "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
        "--pids-limit", "32", "--memory", "512m", "--cpus", "1.0",
        "--user", "10001:10001", "-e", "PYTHONDONTWRITEBYTECODE=1",
        "-e", f"BAYORA_BLUE_MODE={mode}",
        "-e", "BAYORA_JWT_PUBLIC_KEY=/run/secrets/gateway_public.pem",
        "-v", f"{ROOT / 'gateway'}:/app/gateway:ro",
        "-v", f"{ROOT / 'secrets/gateway_public.pem'}:/run/secrets/gateway_public.pem:ro",
        "--entrypoint", "python", IMAGE, "-c", code,
    ]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=30)
    if expected_ok:
        if result.returncode or result.stdout.strip() != "GATEWAY_MODE_IMPORT_PASS":
            raise RuntimeError(f"Gateway profile import failed for {mode} (rc={result.returncode})")
    elif result.returncode == 0:
        raise RuntimeError("Gateway accepted an unsupported operator profile")
    print(f"gateway_profile={mode}: {'PASS' if expected_ok else 'reject-PASS'}")


def main() -> int:
    if shutil.which("docker") is None:
        print("PHASE12_GATEWAY_TEST_SKIP: Docker is unavailable")
        return 0
    daemon = subprocess.run(["sudo", "-n", "docker", "info"], cwd=ROOT,
                            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, timeout=15)
    if daemon.returncode:
        print("PHASE12_GATEWAY_TEST_SKIP: expected sudo Docker daemon is unavailable")
        return 0
    for mode in ("none", "rules", "full"):
        run(mode, True)
    run("tenant-selected", False)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.SubprocessError, RuntimeError) as exc:
        print(f"PHASE12_GATEWAY_TEST_FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
