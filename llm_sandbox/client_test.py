#!/usr/bin/env python3
"""Temporary client used by the Phase 2 acceptance test."""
import json
import os
import urllib.request

base_url = os.environ.get("BAYORA_LLM_URL", "http://llm:11434")
payload = {
    "model": "qwen2.5:0.5b",
    "prompt": "Reply with exactly: BAYORA phase two ready",
    "stream": False,
    "keep_alive": 0,
    "options": {"temperature": 0, "num_predict": 32},
}
request = urllib.request.Request(
    f"{base_url}/api/generate",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(request, timeout=180) as response:
    result = json.load(response)
text = result.get("response", "").strip()
if not text:
    raise SystemExit("LLM_TEST_FAIL: empty generation")
print(json.dumps({"status": "ok", "model": result.get("model"), "response": text}))
print("LLM_GENERATION_PASS")
