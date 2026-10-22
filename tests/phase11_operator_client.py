#!/usr/bin/env python3
"""Operator-only checks for active alerts and the coarse dashboard."""
from __future__ import annotations
import json
import os
import time
from urllib.request import urlopen

run_id = os.environ["BAYORA_RUN_ID"]
deadline = time.monotonic() + 50
firing = set()
page = ""
while time.monotonic() < deadline:
    try:
        with urlopen("http://prometheus:9090/api/v1/alerts", timeout=3) as response:
            alerts = json.load(response).get("data", {}).get("alerts", [])
        firing = {item.get("labels", {}).get("alertname") for item in alerts
                  if item.get("state") == "firing"}
        with urlopen("http://dashboard:8085/", timeout=4) as response:
            page = response.read().decode("utf-8")
        required = ("Policy violations recorded:", "Runs flagged for integrity review:",
                    "Signed audit entries:", "Operator alerts")
        if ("RepeatedGatewayPolicyViolations" in firing
                and "IntegrityCompromisedRun" in firing
                and all(item in page for item in required)):
            break
    except Exception:
        pass
    time.sleep(2)
else:
    raise SystemExit("operator metrics/alerts did not become ready")
if run_id in page or "oversize-probe" in page or "ordinary check" in page:
    raise SystemExit("dashboard exposed request/run data")
print(json.dumps({"repeated_violation_alert": True,
                  "integrity_alert": True,
                  "dashboard_coarse_metrics": True,
                  "run_id_absent": True}, sort_keys=True))
