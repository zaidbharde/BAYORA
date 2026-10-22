#!/usr/bin/env python3
"""Black-box T18 requests from the Red network; never prints bodies or tokens."""
from __future__ import annotations
import concurrent.futures
import json
import os
import socket
import urllib.error
import urllib.request

BASE = "http://gateway:8080"
RED = os.environ["BAYORA_RED_TOKEN"]
BLUE = os.environ["BAYORA_BLUE_TOKEN"]


def call(path, method="POST", token=None, raw=None, timeout=35):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=raw, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response.read()
            return response.status
    except urllib.error.HTTPError as exc:
        exc.read()
        return exc.code


malformed = call("/attack", token=RED, raw=b'{"text":')
oversized_body = b'{"text":"' + (b"oversize-probe-" * 6000) + b'"}'
oversized = call("/attack", token=RED, raw=oversized_body)
missing_token = call("/attack", token=None, raw=b'{"text":"ordinary check"}')
wrong_role = call("/attack", token=BLUE, raw=b'{"text":"ordinary check"}')
unlisted = call("/__bayora_t18_unlisted", method="GET", token=RED, raw=None)

# Concurrent safe 404 requests exercise the per-source rate limiter without invoking the model.
with concurrent.futures.ThreadPoolExecutor(max_workers=28) as pool:
    burst = list(pool.map(lambda _: call("/__bayora_t18_burst", method="GET", token=RED, raw=None), range(28)))
rate_limited = sum(status == 429 for status in burst)

# Red has no shared network path to operator monitoring or the Audit exporter.
monitoring_blocked = True
for host, port in (("prometheus", 9090), ("dashboard", 8085), ("audit", 8081)):
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        continue
    for family, socktype, proto, _, address in addresses:
        try:
            with socket.socket(family, socktype, proto) as sock:
                sock.settimeout(0.5)
                sock.connect(address)
            monitoring_blocked = False
        except OSError:
            pass

print(json.dumps({
    "malformed": malformed,
    "oversized": oversized,
    "missing_token": missing_token,
    "wrong_role": wrong_role,
    "unlisted_route": unlisted,
    "burst_404": burst.count(404),
    "rate_limited": rate_limited,
    "monitoring_blocked": monitoring_blocked,
}, sort_keys=True))
