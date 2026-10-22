#!/usr/bin/env python3
"""Verify all blobs referenced by a local Ollama model manifest."""
import argparse
import hashlib
import json
from pathlib import Path
import sys


def verify(model_root: Path, manifest_rel: str) -> dict:
    manifest_path = model_root / "models" / "manifests" / manifest_rel
    manifest = json.loads(manifest_path.read_text())
    descriptors = [manifest["config"], *manifest["layers"]]
    verified = []
    for descriptor in descriptors:
        digest = descriptor["digest"]
        algorithm, expected = digest.split(":", 1)
        if algorithm != "sha256":
            raise ValueError(f"unsupported digest algorithm: {algorithm}")
        blob = model_root / "models" / "blobs" / f"sha256-{expected}"
        hasher = hashlib.sha256()
        with blob.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                hasher.update(chunk)
        actual = hasher.hexdigest()
        if actual != expected:
            raise ValueError(f"hash mismatch: {blob}: expected {expected}, got {actual}")
        verified.append({"path": str(blob), "sha256": actual, "bytes": blob.stat().st_size})
    return {"manifest": str(manifest_path), "verified_blobs": len(verified), "files": verified}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, default=Path("models/ollama"))
    parser.add_argument("--manifest", default="registry.ollama.ai/library/qwen2.5/0.5b")
    args = parser.parse_args()
    try:
        result = verify(args.model_root, args.manifest)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"MODEL_HASH_FAIL: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    print(f"MODEL_HASH_PASS: verified {result['verified_blobs']} blobs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
