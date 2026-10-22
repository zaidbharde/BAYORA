#!/usr/bin/env python3
"""T15 audit append, verification, and exact-sequence tamper test."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / "data/audit/audit.jsonl"
CHECKPOINTS = ROOT / "data/audit/checkpoints.jsonl"
PUB = ROOT / "secrets/audit_public.pem"


def run(command, timeout=30):
    return subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout)


def main():
    if not PUB.exists():
        subprocess.run(["bash", "scripts/init_audit_keys.sh"], cwd=ROOT, check=True, timeout=10)
    (ROOT / "data/audit").mkdir(parents=True, exist_ok=True)
    # Preserve the current Phase 1/2/3 containers; launch only a disposable client on audit_net.
    client = run(["sudo", "docker", "compose", "run", "--rm", "--no-deps", "audit-test", "/tests/phase4_audit_client.py"], timeout=30)
    print(client.stdout, end="")
    if client.returncode:
        print(client.stderr, file=sys.stderr)
        return client.returncode
    verify_cmd = [sys.executable, "tools/bayora_verify.py", "--log", str(LOG), "--checkpoints", str(CHECKPOINTS), "--public-key", str(PUB)]
    valid = run(verify_cmd, timeout=30)
    print(valid.stdout, end="")
    if valid.returncode:
        print(valid.stderr, file=sys.stderr)
        return valid.returncode
    lines = LOG.read_text().splitlines()
    last = json.loads(lines[-1])
    seq = last["seq"]
    last["event"] = "TAMPERED_" + last["event"]
    lines[-1] = json.dumps(last, sort_keys=True, separators=(",", ":"))
    with tempfile.TemporaryDirectory() as temp:
        tampered = Path(temp) / "audit.jsonl"
        tampered.write_text("\n".join(lines) + "\n")
        bad = run([sys.executable, "tools/bayora_verify.py", "--log", str(tampered), "--checkpoints", str(CHECKPOINTS), "--public-key", str(PUB)], timeout=30)
    output = bad.stdout + bad.stderr
    if bad.returncode == 0 or f"seq={seq}" not in output:
        print(f"T15_FAIL: tampered log was not identified at seq={seq}: {output}", file=sys.stderr)
        return 1
    print(f"T15_PASS: audit verifies; tampering detected at seq={seq}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
