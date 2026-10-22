#!/usr/bin/env python3
"""T14 client; run from a test-only container outside the Red cgroup."""
import json
import os
import time
import urllib.request

BASE = "http://gateway:8080"
TOKEN = os.environ["BAYORA_TOKEN"]
SAMPLES = int(os.getenv("BAYORA_SAMPLES", "6"))
results = []
for _ in range(SAMPLES):
    payload = json.dumps({"text": "Write a friendly greeting for a meeting invitation."}).encode()
    request = urllib.request.Request(BASE + "/attack", data=payload,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN}, method="POST")
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=30) as response:
        reply = json.load(response)
    elapsed = (time.perf_counter() - started) * 1000
    assert reply.get("status") == "ok" and reply.get("text"), "fairness probe request failed"
    results.append(elapsed)
print(json.dumps({"elapsed_ms": results}, sort_keys=True))
