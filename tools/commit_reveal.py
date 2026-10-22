#!/usr/bin/env python3
"""Trusted-host commit/reveal coordinator. Team identities are never mounted in tenants."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / "secrets"
LOG = ROOT / "data/audit/audit.jsonl"


def run(cmd, *, input_bytes=None, timeout=60, check=True):
    result = subprocess.run(cmd, cwd=ROOT, input=input_bytes, capture_output=True, timeout=timeout)
    if check and result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace")[-500:])
    return result


def audit_verified():
    run([sys.executable, "tools/bayora_verify.py"])


def records(run_id):
    return [json.loads(line) for line in LOG.read_text().splitlines() if json.loads(line).get("run_id") == run_id]


def append(run_id, event, data):
    envs = ["sudo", "docker", "compose", "run", "--rm", "--no-deps",
            "-e", f"AUDIT_EVENT={event}", "-e", f"AUDIT_RUN_ID={run_id}",
            "-e", f"AUDIT_DATA={json.dumps(data, separators=(',', ':'))}",
            "audit-test", "/tests/phase7_audit_client.py"]
    result = run(envs, timeout=30)
    print(result.stdout.decode().strip())
    audit_verified()


def bundle_metadata():
    encrypted = (SECRETS / "red_payloads.age").read_bytes()
    source = [json.loads(line) for line in (ROOT / "data/safe_smoke.jsonl").read_text().splitlines() if line.strip()]
    hashes = [hashlib.sha256(item["text"].encode()).hexdigest() for item in source]
    level = [hashlib.sha256(b"\x00" + bytes.fromhex(item)).digest() for item in hashes]
    while len(level) > 1:
        if len(level) % 2: level.append(level[-1])
        level = [hashlib.sha256(b"\x01" + level[i] + level[i+1]).digest() for i in range(0, len(level), 2)]
    return {"bundle_sha256": hashlib.sha256(encrypted).hexdigest(),
            "merkle_root": level[0].hex() if level else hashlib.sha256(b"").hexdigest(),
            "payload_count": len(source), "dataset": "safe_smoke_fixture"}


def commit(run_id):
    if not (SECRETS / "red_payloads.age").exists():
        raise RuntimeError("run scripts/init_team_material.sh first")
    existing = records(run_id)
    if any(item["event"] == "PAYLOAD_ROOT_COMMITTED" for item in existing):
        raise RuntimeError("run already has a committed payload root")
    append(run_id, "PAYLOAD_ROOT_COMMITTED", bundle_metadata())


def require_commit(run_id):
    audit_verified()
    events = records(run_id)
    commits = [event for event in events if event["event"] == "PAYLOAD_ROOT_COMMITTED"]
    if not commits: raise RuntimeError("no signed payload commit for this run")
    metadata = bundle_metadata()
    if commits[0]["data"].get("bundle_sha256") != metadata["bundle_sha256"]:
        raise RuntimeError("encrypted bundle differs from committed digest")
    return events


def decrypt_red():
    return run(["age", "-d", "-i", str(SECRETS / "red.agekey"), str(SECRETS / "red_payloads.age")], timeout=10).stdout


def deliver(service, path, plaintext):
    code = "import sys; open(" + repr(path) + ", 'wb').write(sys.stdin.buffer.read())"
    run(["sudo", "docker", "compose", "exec", "-T", service, "python", "-c", code], input_bytes=plaintext, timeout=15)


def remove(service, path):
    code = "import os; p=" + repr(path) + "; os.path.exists(p) and os.remove(p)"
    run(["sudo", "docker", "compose", "exec", "-T", service, "python", "-c", code], timeout=15, check=False)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init")
    c = sub.add_parser("commit"); c.add_argument("--run-id", required=True)
    r = sub.add_parser("release-red"); r.add_argument("--run-id", required=True)
    s = sub.add_parser("seal"); s.add_argument("--run-id", required=True)
    b = sub.add_parser("reveal-blue"); b.add_argument("--run-id", required=True)
    cl = sub.add_parser("cleanup"); cl.add_argument("--run-id", required=True)
    args = parser.parse_args()
    try:
        if args.command == "init":
            run(["bash", "scripts/init_team_material.sh"], timeout=30)
            print("TEAM_MATERIAL_INIT_PASS: encrypted bundles created; identities host-only")
        elif args.command == "commit":
            commit(args.run_id)
        elif args.command == "release-red":
            events = require_commit(args.run_id)
            if any(event["event"] == "RUN_SEALED" for event in events): raise RuntimeError("run already sealed")
            plaintext = decrypt_red()
            deliver("red", "/tmp/payloads.jsonl", plaintext)
            del plaintext
            print("RED_RELEASE_PASS: committed bundle decrypted only into Red tmpfs")
        elif args.command == "seal":
            events = require_commit(args.run_id)
            if not any(event["event"] == "RUN_SEALED" for event in events):
                append(args.run_id, "RUN_SEALED", {"sealed": True, "bundle_sha256": bundle_metadata()["bundle_sha256"]})
            print("RUN_SEALED_PASS")
        elif args.command == "reveal-blue":
            events = require_commit(args.run_id)
            if not any(event["event"] == "RUN_SEALED" for event in events): raise RuntimeError("cannot reveal before signed RUN_SEALED")
            plaintext = decrypt_red()
            deliver("blue", "/tmp/revealed_red_payloads.jsonl", plaintext)
            del plaintext
            print("REVEAL_PASS: payloads decrypted into Blue tmpfs after seal")
        elif args.command == "cleanup":
            remove("red", "/tmp/payloads.jsonl")
            remove("red", "/tmp/attempts.jsonl")
            remove("blue", "/tmp/revealed_red_payloads.jsonl")
            print("TMPFS_CLEANUP_PASS")
        return 0
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.SubprocessError) as exc:
        print(f"COMMIT_REVEAL_FAIL: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__": raise SystemExit(main())
