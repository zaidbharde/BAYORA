#!/usr/bin/env python3
"""T10: Blue redacts its rule canary in raw and common encoded forms."""
import base64
import codecs
import json
import urllib.request

CANARY = "BAYORA_CANARY_BLUE_DEMO_8C4F2A19"
raw = CANARY.encode()
variants = {
    "raw": CANARY,
    "base64": base64.b64encode(raw).decode(),
    "hex": raw.hex(),
    "rot13": codecs.encode(CANARY, "rot_13"),
}
for label, value in variants.items():
    body = json.dumps({"request_id": "a" * 32, "text": "model output: " + value,
                       "direction": "output"}).encode()
    req = urllib.request.Request("http://blue:8082/check_output", data=body,
                                 headers={"Content-Type": "application/json"})
    result = json.load(urllib.request.urlopen(req, timeout=5))
    assert result["verdict"] == "SANITIZE" and "[REDACTED]" in result["sanitized_text"], (label, result)
    assert value.lower() not in result["sanitized_text"].lower(), (label, result)
print("T10_PASS: Blue rule canary redacted in raw, Base64, hex, and ROT13 forms")
