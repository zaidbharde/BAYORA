#!/usr/bin/env python3
"""Fetch pinned JBB inputs in memory and persist only age-encrypted bundles."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
from pathlib import Path
import random
import subprocess
import sys
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / "secrets"
REVISION = "886acc352a31533ffbcf4ef22c744658688086fc"
BASE = f"https://huggingface.co/datasets/JailbreakBench/JBB-Behaviors/resolve/{REVISION}/data/"
EXPECTED = {
    "harmful-behaviors.csv": "4a8ec6832056b631eb092dccc60d37a61c3d441268268888b3d006288afeffa1",
    "benign-behaviors.csv": "3cda234d21a991fa309bbfea4b6d9dae31ccdf8e9d452424b6a983e4fdc33468",
    "judge-comparison.csv": "dacaf76a1057785f11b0fc6aa07b9a73cdab588319ddfc5e8cef2909e5b112a5",
}
TARGETS = (
    "phase12_red_inputs.age", "phase12_blue_reveal.age", "phase12_judge_train.age",
)


def fetch(name: str) -> bytes:
    request = urllib.request.Request(BASE + name, headers={"User-Agent": "BAYORA-eval/1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != EXPECTED[name]:
        raise RuntimeError(f"pinned dataset hash mismatch for {name}")
    return raw


def age_encrypt(recipient: str, plaintext: bytes) -> bytes:
    result = subprocess.run(["age", "-r", recipient], input=plaintext,
                            capture_output=True, timeout=60, check=True)
    return result.stdout


def atomic_private_write(path: Path, data: bytes) -> None:
    fd, name = tempfile.mkstemp(prefix=".phase12-", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
        os.chmod(path, 0o600)
    except BaseException:
        try:
            os.unlink(name)
        except FileNotFoundError:
            pass
        raise


def parse_goals(name: str, raw: bytes, split: str) -> list[dict]:
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
    if len(rows) != 100 or not rows or not {"Index", "Goal", "Category"}.issubset(rows[0]):
        raise RuntimeError(f"unexpected JBB schema or row count for {name}")
    parsed = []
    for row in rows:
        goal = row.get("Goal", "").strip()
        if not goal:
            raise RuntimeError(f"empty goal in {name}")
        parsed.append({"split": split, "text": goal, "category": row.get("Category", "unknown")})
    return parsed


def main() -> int:
    if not (SECRETS / "red.agekey").is_file() or not (SECRETS / "blue.agekey").is_file():
        raise RuntimeError("run `make team-keys` first; team private keys must remain host-only")
    eval_key = SECRETS / "eval.agekey"
    if not eval_key.exists():
        subprocess.run(["age-keygen", "-o", str(eval_key)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        os.chmod(eval_key, 0o600)
    for name in TARGETS:
        if (SECRETS / name).exists():
            raise RuntimeError(f"refusing to overwrite existing {name}; inspect artifacts before retry")

    red_pub = subprocess.check_output(["age-keygen", "-y", str(SECRETS / "red.agekey")], text=True, timeout=10).strip()
    blue_pub = subprocess.check_output(["age-keygen", "-y", str(SECRETS / "blue.agekey")], text=True, timeout=10).strip()
    eval_pub = subprocess.check_output(["age-keygen", "-y", str(eval_key)], text=True, timeout=10).strip()

    harmful_raw = fetch("harmful-behaviors.csv")
    benign_raw = fetch("benign-behaviors.csv")
    judge_raw = fetch("judge-comparison.csv")
    samples = parse_goals("harmful-behaviors.csv", harmful_raw, "harmful")
    samples += parse_goals("benign-behaviors.csv", benign_raw, "benign")
    random.Random(42).shuffle(samples)
    for index, row in enumerate(samples):
        row["id"] = f"jbb-{index:03d}"
    red_rows = [{"id": row["id"], "text": row["text"]} for row in samples]
    reveal_rows = [{"id": row["id"], "split": row["split"], "category": row["category"], "text": row["text"]}
                   for row in samples]
    judge_rows = list(csv.DictReader(io.StringIO(judge_raw.decode("utf-8-sig"))))
    if len(judge_rows) != 300 or not judge_rows or not {"goal", "target_response", "human_majority"}.issubset(judge_rows[0]):
        raise RuntimeError("unexpected JBB judge-comparison schema or row count")

    encrypted = {
        TARGETS[0]: age_encrypt(red_pub, ("\n".join(json.dumps(row, ensure_ascii=False, separators=(",", ":"))
                                               for row in red_rows) + "\n").encode()),
        TARGETS[1]: age_encrypt(blue_pub, ("\n".join(json.dumps(row, ensure_ascii=False, separators=(",", ":"))
                                                for row in reveal_rows) + "\n").encode()),
        TARGETS[2]: age_encrypt(eval_pub, judge_raw),
    }
    SECRETS.mkdir(mode=0o700, parents=True, exist_ok=True)
    for name, content in encrypted.items():
        atomic_private_write(SECRETS / name, content)

    meta = {
        "dataset": "JailbreakBench/JBB-Behaviors",
        "revision": REVISION,
        "license": "MIT",
        "doi": "10.57967/hf/2540",
        "seed": 42,
        "harmful_rows": 100,
        "benign_rows": 100,
        "judge_comparison_rows": len(judge_rows),
        "source_sha256": {name: EXPECTED[name] for name in EXPECTED},
        "encrypted_bundle_sha256": {name: hashlib.sha256(content).hexdigest()
                                     for name, content in encrypted.items()},
    }
    report = ROOT / "reports" / "phase12_source.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    rendered = (json.dumps(meta, sort_keys=True, indent=2) + "\n").encode()
    if report.exists() and report.read_bytes() != rendered:
        raise RuntimeError("refusing to replace a different Phase 12 source manifest")
    if not report.exists():
        report.write_bytes(rendered)
    print("PHASE12_DATA_READY: harmful=100 benign=100 judge_rows=300; encrypted bundles created; plaintext not written")
    print("source_manifest=reports/phase12_source.json")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        print(f"PHASE12_DATA_FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
