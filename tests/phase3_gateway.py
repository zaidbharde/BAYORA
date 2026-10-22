#!/usr/bin/env python3
"""Phase 3 end-to-end and authorization tests from the Red network."""
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CODE = r'''import json, os, urllib.error, urllib.request
base = "http://gateway:8080"
def call(path, method="GET", token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=190) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()
red = os.environ["BAYORA_RED_TOKEN"]
blue = os.environ["BAYORA_BLUE_TOKEN"]
# Extra request metadata must be ignored; only text is sent to the model.
status, reply = call("/attack", "POST", red, {"text": "Reply with exactly BAYORA gateway phase three ready", "strategy": "direct", "label": "not-forwarded"})
assert status == 200 and set(reply) == {"status", "text"} and reply["status"] == "ok" and reply["text"].strip(), (status, reply)
print("PHASE3_FLOW_PASS: Red -> Gateway -> LLM -> Red; normalized two-field reply")
status, _ = call("/attack", "POST", None, {"text": "hello"})
assert status == 401, ("missing token", status)
status, _ = call("/attack", "POST", blue, {"text": "hello"})
assert status == 403, ("wrong role", status)
status, _ = call("/admin", "GET", red)
assert status == 404, ("unlisted route", status)
print("PHASE3_AUTHZ_PASS: missing token=401; wrong role=403; unlisted route=404")
'''


def issue(role: str) -> str:
    result = subprocess.run(
        [sys.executable, "tools/issue_token.py", "--role", role, "--run-id", "phase3-test"],
        cwd=ROOT, capture_output=True, text=True, timeout=5,
    )
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


def main() -> int:
    if not (ROOT / "secrets/gateway_private.pem").exists():
        subprocess.run(["bash", "scripts/init_gateway_keys.sh"], cwd=ROOT, check=True, timeout=10)
    env = os.environ.copy()
    env["BAYORA_RED_TOKEN"] = issue("red")
    env["BAYORA_BLUE_TOKEN"] = issue("blue")
    command = ["sudo", "docker", "compose", "exec", "-T", "-e", f"BAYORA_RED_TOKEN={env['BAYORA_RED_TOKEN']}", "-e", f"BAYORA_BLUE_TOKEN={env['BAYORA_BLUE_TOKEN']}", "red", "python", "-c", CODE]
    try:
        result = subprocess.run(command, cwd=ROOT, env=env, text=True, timeout=220)
    except subprocess.TimeoutExpired:
        print("PHASE3_TEST_BLOCKED: end-to-end test exceeded 220 seconds", file=sys.stderr)
        return 2
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
