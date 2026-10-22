#!/usr/bin/env python3
"""Verify BAYORA audit chain, signatures and signed Merkle checkpoints."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def verify_signature(public_key: Path, message: bytes, signature: bytes) -> bool:
    with tempfile.TemporaryDirectory() as tmp:
        msg = Path(tmp) / "message"
        sig = Path(tmp) / "signature"
        msg.write_bytes(message)
        sig.write_bytes(signature)
        result = subprocess.run(["openssl", "pkeyutl", "-verify", "-rawin", "-pubin", "-inkey", str(public_key), "-in", str(msg), "-sigfile", str(sig)], capture_output=True)
        return result.returncode == 0


def merkle_root(hashes):
    if not hashes:
        return hashlib.sha256(b"").hexdigest()
    level = [hashlib.sha256(b"\x00" + bytes.fromhex(value)).digest() for value in hashes]
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [hashlib.sha256(b"\x01" + level[i] + level[i + 1]).digest() for i in range(0, len(level), 2)]
    return level[0].hex()


def fail(seq, reason):
    raise ValueError(f"VERIFY_FAIL seq={seq} reason={reason}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--log", type=Path, default=Path("data/audit/audit.jsonl"))
    parser.add_argument("--checkpoints", type=Path, default=Path("data/audit/checkpoints.jsonl"))
    parser.add_argument("--public-key", type=Path, default=Path("secrets/audit_public.pem"))
    args = parser.parse_args()
    entries, hashes = [], []
    previous = hashlib.sha256(b"").hexdigest()
    try:
        for line_no, line in enumerate(args.log.read_text().splitlines(), 1):
            try:
                entry = json.loads(line)
                core = {k: v for k, v in entry.items() if k not in ("entry_hash", "sig")}
                if core.get("seq") != line_no or core.get("prev_hash") != previous:
                    fail(line_no, "sequence_or_prev_hash")
                expected = hashlib.sha256(canonical(core) + bytes.fromhex(previous)).hexdigest()
                if expected != entry.get("entry_hash"):
                    fail(line_no, "entry_hash")
                sig = base64.urlsafe_b64decode(entry["sig"] + "=" * (-len(entry["sig"]) % 4))
                if not verify_signature(args.public_key, bytes.fromhex(expected), sig):
                    fail(line_no, "signature")
                previous = expected
                hashes.append(expected)
                entries.append(entry)
            except (ValueError, KeyError, json.JSONDecodeError) as exc:
                if str(exc).startswith("VERIFY_FAIL"):
                    raise
                fail(line_no, str(exc))
        if args.checkpoints.exists():
            last_seq = 0
            for line_no, line in enumerate(args.checkpoints.read_text().splitlines(), 1):
                try:
                    record = json.loads(line)
                    core = {"upto_seq": record["upto_seq"], "merkle_root": record["merkle_root"]}
                    seq = core["upto_seq"]
                    if seq <= last_seq or seq > len(hashes) or merkle_root(hashes[:seq]) != core["merkle_root"]:
                        fail(seq, "checkpoint_root_or_sequence")
                    sig = base64.urlsafe_b64decode(record["sig"] + "=" * (-len(record["sig"]) % 4))
                    if not verify_signature(args.public_key, canonical(core), sig):
                        fail(seq, "checkpoint_signature")
                    last_seq = seq
                except (ValueError, KeyError, json.JSONDecodeError) as exc:
                    if str(exc).startswith("VERIFY_FAIL"):
                        raise
                    fail(line_no, str(exc))
    except (OSError, ValueError) as exc:
        print(str(exc))
        return 1
    print(f"VERIFY_PASS entries={len(entries)} checkpoints={sum(1 for _ in args.checkpoints.open()) if args.checkpoints.exists() else 0}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
