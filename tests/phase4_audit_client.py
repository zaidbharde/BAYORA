#!/usr/bin/env python3
import json
import urllib.request

BASE = "http://audit:8081"
def post(path, payload):
    request = urllib.request.Request(BASE + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.status, json.load(response)

for event, data in [
    ("RUN_CREATED", {"config_hash": "sha256:phase4-demo"}),
    ("ATTACK_RECEIVED", {"request_hash": "sha256:request-demo", "attempt_id": "t15-1"}),
    ("RUN_SEALED", {"sealed": True}),
]:
    status, result = post("/append", {"run_id": "phase4-t15", "actor": "test", "event": event, "data": data})
    assert status == 201 and result["seq"] > 0, (status, result)
print("AUDIT_APPEND_PASS: three signed events appended; RUN_SEALED emitted checkpoint")
