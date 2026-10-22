#!/usr/bin/env python3
"""Phase 2: verify preloaded model blobs, generate once, and verify again."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
VERIFY = [sys.executable, str(ROOT / "llm_sandbox/verify_model.py"), "--model-root", str(ROOT / "models/ollama")]


def main() -> int:
    before = subprocess.run(VERIFY, cwd=ROOT)
    if before.returncode:
        return before.returncode
    client = ["sudo", "docker", "compose", "run", "--rm", "--no-deps", "llm-test", "/tests/client_test.py"]
    try:
        result = subprocess.run(client, cwd=ROOT, timeout=210)
    except subprocess.TimeoutExpired:
        print("LLM_TEST_BLOCKED: temporary client exceeded 210 seconds", file=sys.stderr)
        return 2
    if result.returncode:
        return result.returncode
    after = subprocess.run(VERIFY, cwd=ROOT)
    if after.returncode:
        return after.returncode
    print("PHASE2_ACCEPTANCE_PASS: completion returned; model blob hashes verified before and after")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
