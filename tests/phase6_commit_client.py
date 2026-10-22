#!/usr/bin/env python3
import json
import os
import urllib.request

root = os.environ["PAYLOAD_ROOT"]
count = int(os.environ["DATASET_COUNT"])
payload = {"run_id": "phase6-safe-smoke", "actor": "orchestrator", "event": "PAYLOAD_ROOT_COMMITTED", "data": {"merkle_root": root, "payload_count": count, "dataset": "safe_smoke_fixture"}}
request = urllib.request.Request("http://audit:8081/append", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(request, timeout=10) as response:
    result = json.load(response)
assert response.status == 201 and result["seq"] > 0, result
print(f"PAYLOAD_ROOT_COMMIT_PASS: seq={result['seq']} root=sha256:{root}")
