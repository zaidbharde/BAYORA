#!/usr/bin/env python3
"""T08: prove separate team keys, no key mounts, and reveal only after signed seal."""
import hashlib
from pathlib import Path
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
RUN = "phase7-t08-" + uuid.uuid4().hex[:12]


def call(args, timeout=45, check=True):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if check and result.returncode:
        raise RuntimeError((result.stderr or result.stdout)[-1200:])
    return result


def main():
    try:
        call(["python3", "tools/commit_reveal.py", "init"])
        call(["python3", "tools/commit_reveal.py", "commit", "--run-id", RUN])
        wrong_key = call(["age", "-d", "-i", "secrets/blue.agekey", "secrets/red_payloads.age"], check=False)
        assert wrong_key.returncode != 0, "Blue private key decrypted Red bundle before seal"
        call(["python3", "tools/commit_reveal.py", "release-red", "--run-id", RUN])
        red = call(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c",
                    "import hashlib,pathlib; p=pathlib.Path('/tmp/payloads.jsonl'); assert p.exists(); print(hashlib.sha256(p.read_bytes()).hexdigest())"])
        expected = hashlib.sha256((ROOT / "data/safe_smoke.jsonl").read_bytes()).hexdigest()
        assert red.stdout.strip() == expected, "Red tmpfs dataset did not match committed source"
        blue_before = call(["sudo", "docker", "compose", "exec", "-T", "blue", "python", "-c",
            "import os,pathlib; p=pathlib.Path('/tmp/revealed_red_payloads.jsonl'); assert not p.exists(); assert not any('AGE-SECRET-KEY' in v or 'red.agekey' in v for v in os.environ.values()); assert not pathlib.Path('/run/secrets/red.agekey').exists(); print('BLUE_PRESEAL_ISOLATED')"])
        assert "BLUE_PRESEAL_ISOLATED" in blue_before.stdout
        inspect = call(["sudo", "docker", "inspect", "bayora-blue-1", "bayora-red-1"])
        for secret_name in ("red.agekey", "blue.agekey", "red_payloads.age", "blue_rules.age"):
            assert secret_name not in inspect.stdout, f"tenant mount references {secret_name}"
        denied = call(["python3", "tools/commit_reveal.py", "reveal-blue", "--run-id", RUN], check=False)
        assert denied.returncode != 0 and "cannot reveal before" in denied.stderr
        call(["python3", "tools/commit_reveal.py", "seal", "--run-id", RUN])
        call(["python3", "tools/commit_reveal.py", "reveal-blue", "--run-id", RUN])
        blue = call(["sudo", "docker", "compose", "exec", "-T", "blue", "python", "-c",
                     "import hashlib,pathlib; print(hashlib.sha256(pathlib.Path('/tmp/revealed_red_payloads.jsonl').read_bytes()).hexdigest())"])
        assert blue.stdout.strip() == expected, "post-seal reveal to Blue did not match committed source"
        call(["python3", "tools/commit_reveal.py", "cleanup", "--run-id", RUN])
        call(["python3", "tools/bayora_verify.py"])
        print("T08_PASS: distinct keys; wrong-team decrypt denied; no key mounts; reveal denied pre-seal and delivered to Blue only after signed seal; tmpfs cleaned")
        return 0
    except (AssertionError, RuntimeError, subprocess.SubprocessError) as exc:
        print(f"T08_FAIL: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__": raise SystemExit(main())
