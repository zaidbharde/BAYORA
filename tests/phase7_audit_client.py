#!/usr/bin/env python3
import json
import os
import urllib.request

event = os.environ["AUDIT_EVENT"]
run_id = os.environ["AUDIT_RUN_ID"]
data = json.loads(os.environ.get("AUDIT_DATA", "{}"))
payload = {"run_id": run_id, "actor": "orchestrator", "event": event, "data": data}
request = urllib.request.Request("http://audit:8081/append", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(request, timeout=10) as response:
    result = json.load(response)
assert response.status == 201 and result["seq"] > 0, result
print(f"AUDIT_EVENT_PASS: {event} run={run_id} seq={result['seq']}")
