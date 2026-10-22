"""Short-lived Phase 12 runner; host captures stdout and immediately age-encrypts it.

Never invoke this script interactively or attach its stdout to a terminal: the JSON
stream contains prompts and model replies. It does not write plaintext results to disk.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from red_engine.runner import STRATEGIES, load_dataset, transform


def request_gateway(url: str, token: str, sample_id: str, strategy: str,
                    prompt: str) -> dict:
    body = json.dumps({"text": prompt, "sample_id": sample_id, "strategy": strategy}).encode()
    request = urllib.request.Request(
        url.rstrip("/") + "/attack", data=body,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
        method="POST",
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=190) as response:
            result = json.load(response)
            request_id = response.headers.get("X-BAYORA-Request-ID", "")
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return {"status": "error", "request_id": "", "response": "",
                "client_latency_ms": round((time.monotonic() - started) * 1000, 3)}
    if set(result) != {"status", "text"} or not request_id:
        return {"status": "error", "request_id": "", "response": "",
                "client_latency_ms": round((time.monotonic() - started) * 1000, 3)}
    return {"status": result["status"], "request_id": request_id,
            "response": result["text"],
            "client_latency_ms": round((time.monotonic() - started) * 1000, 3)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--count", type=int, required=True)
    parser.add_argument("--gateway", default="http://gateway:8080")
    parser.add_argument("--mode", choices=("A", "B", "C"), required=True)
    args = parser.parse_args()
    token = os.getenv("BAYORA_TOKEN", "")
    run_id = os.getenv("BAYORA_RUN_ID", "")
    if os.getenv("BAYORA_EVAL_EXPORT") != "capture-encrypt" or not token or not run_id:
        parser.error("trusted host capture mode, BAYORA_TOKEN, and BAYORA_RUN_ID are required")
    if args.start < 0 or not 1 <= args.count <= 50:
        parser.error("start must be nonnegative and count must be 1..50")
    rows = load_dataset(args.dataset)
    if args.start + args.count > len(rows):
        parser.error("requested range exceeds the committed input bundle")

    records = []
    for index in range(args.start, args.start + args.count):
        row = rows[index]
        strategy = STRATEGIES[index % len(STRATEGIES)]
        prompt = transform(row["text"], strategy)
        result = request_gateway(args.gateway, token, row["id"], strategy, prompt)
        records.append({
            "sample_id": row["id"],
            "strategy": strategy,
            "mode": args.mode,
            "request_id": result["request_id"],
            "prompt_hash": hashlib.sha256(prompt.encode()).hexdigest(),
            "response_hash": hashlib.sha256(result["response"].encode()).hexdigest(),
            "status": result["status"],
            "client_latency_ms": result["client_latency_ms"],
            "prompt": prompt,
            "response": result["response"],
        })
    # This raw stream is captured by the trusted host script and immediately
    # encrypted; do not print diagnostics or per-record content.
    sys.stdout.write(json.dumps({"run_id": run_id, "mode": args.mode,
                                 "records": records}, ensure_ascii=False,
                                separators=(",", ":")))
    sys.stdout.flush()
    return 0 if all(item["status"] in {"ok", "refused"} for item in records) else 2


if __name__ == "__main__":
    raise SystemExit(main())
