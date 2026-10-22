#!/usr/bin/env python3
"""Audit-network client for up to 50 Phase 12 metadata-only events per invocation."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


def main() -> int:
    lines = sys.stdin.buffer.read(262145)
    if len(lines) > 262144:
        raise ValueError("batch too large")
    events = [json.loads(line) for line in lines.splitlines() if line.strip()]
    if not 1 <= len(events) <= 50:
        raise ValueError("batch must contain 1..50 events")
    for item in events:
        if not isinstance(item, dict) or not {"event", "run_id", "data"}.issubset(item):
            raise ValueError("invalid event envelope")
        body = {"run_id": item["run_id"],
                "actor": "evaluator" if item["event"] == "JUDGE_RESULT" else "orchestrator",
                "event": item["event"], "attempt_id": item.get("attempt_id"),
                "data": item["data"]}
        request = urllib.request.Request(
            "http://audit:8081/append", data=json.dumps(body, separators=(",", ":")).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                result = json.load(response)
            if response.status != 201 or not isinstance(result.get("seq"), int):
                raise RuntimeError("Audit rejected event")
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError) as exc:
            raise RuntimeError("Audit append failed") from exc
    print(f"PHASE12_AUDIT_BATCH_PASS: count={len(events)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError):
        print("PHASE12_AUDIT_BATCH_FAIL", file=sys.stderr)
        raise SystemExit(1)
