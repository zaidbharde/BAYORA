#!/usr/bin/env python3
"""Test-only operator call from the Audit network; never has a Docker socket."""
import json
import os
import urllib.error
import urllib.request

BASE = "http://gateway:8080"

def call(token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(BASE + "/session/reset", data=b"{}", headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, {}

assert call(os.environ["BAYORA_RED_TOKEN"])[0] == 403
assert call()[0] == 401
status, body = call(os.environ["BAYORA_OPERATOR_TOKEN"])
assert status == 200 and body == {"status": "ok"}, (status, body)
print("SESSION_RESET_PASS: Red=403; missing=401; operator=200")
