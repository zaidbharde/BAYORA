"""Append-only BAYORA audit service: signed hash chain + Merkle checkpoints."""
from __future__ import annotations

import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading

DATA = Path(os.getenv("BAYORA_AUDIT_DIR", "/data"))
LOG = DATA / "audit.jsonl"
CHECKPOINTS = DATA / "checkpoints.jsonl"
KEY_PATH = Path(os.getenv("BAYORA_AUDIT_PRIVATE_KEY", "/run/secrets/audit_private.pem"))
ALLOWED_EVENTS = {
    "RUN_CREATED", "MODEL_HASH_VERIFIED", "PAYLOAD_ROOT_COMMITTED", "CONTAINER_STARTED",
    "TOKEN_ISSUED", "ATTACK_RECEIVED", "INPUT_VERDICT", "LLM_REQUEST", "LLM_RESPONSE",
    "OUTPUT_VERDICT", "RESPONSE_SENT", "POLICY_VIOLATION", "RESOURCE_ALERT", "SESSION_RESET",
    "CHECKPOINT", "RUN_SEALED", "PAYLOADS_REVEALED", "JUDGE_RESULT", "MODEL_HASH_REVERIFIED", "RUN_DESTROYED",
}
FORBIDDEN_KEYS = {"prompt", "response", "text", "token", "secret", "payload", "content"}
LOCK = threading.Lock()


def canonical(value: dict) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def merkle_root(hashes: list[str]) -> str:
    if not hashes:
        return hashlib.sha256(b"").hexdigest()
    level = [hashlib.sha256(b"\x00" + bytes.fromhex(item)).digest() for item in hashes]
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [hashlib.sha256(b"\x01" + level[i] + level[i + 1]).digest() for i in range(0, len(level), 2)]
    return level[0].hex()


def forbidden(data):
    if isinstance(data, dict):
        return any(str(key).lower() in FORBIDDEN_KEYS or forbidden(value) for key, value in data.items())
    if isinstance(data, list):
        return any(forbidden(item) for item in data)
    return False


class State:
    def __init__(self):
        from cryptography.hazmat.primitives import serialization
        DATA.mkdir(parents=True, exist_ok=True)
        self.private_key = serialization.load_pem_private_key(KEY_PATH.read_bytes(), password=None)
        self.entries = []
        if LOG.exists():
            for line_number, line in enumerate(LOG.read_text().splitlines(), 1):
                entry = json.loads(line)
                self._validate_entry(entry, expected_seq=line_number)
                self.entries.append(entry)

    @staticmethod
    def _validate_entry(entry, expected_seq):
        core = {k: v for k, v in entry.items() if k not in ("entry_hash", "sig")}
        expected_prev = hashlib.sha256(b"").hexdigest() if expected_seq == 1 else State._last_hash
        if expected_seq == 1:
            expected_prev = hashlib.sha256(b"").hexdigest()
        if core.get("seq") != expected_seq or core.get("prev_hash") != expected_prev:
            raise RuntimeError(f"invalid existing audit chain at seq {expected_seq}")
        digest = hashlib.sha256(canonical(core) + bytes.fromhex(core["prev_hash"])).hexdigest()
        if digest != entry.get("entry_hash"):
            raise RuntimeError(f"invalid existing audit hash at seq {expected_seq}")
        from cryptography.hazmat.primitives import serialization
        private = serialization.load_pem_private_key(KEY_PATH.read_bytes(), password=None)
        pub = private.public_key()
        sig = base64.urlsafe_b64decode(entry["sig"] + "=" * (-len(entry["sig"]) % 4))
        try:
            pub.verify(sig, bytes.fromhex(digest))
        except Exception as exc:
            raise RuntimeError(f"invalid existing audit signature at seq {expected_seq}") from exc
        State._last_hash = digest

    def append(self, payload):
        event = payload.get("event")
        run_id = payload.get("run_id")
        data = payload.get("data", {})
        if event not in ALLOWED_EVENTS or not isinstance(run_id, str) or not run_id or len(run_id) > 128:
            raise ValueError("invalid event or run_id")
        if not isinstance(data, dict) or forbidden(data):
            raise ValueError("audit data must be metadata/hashes only")
        seq = len(self.entries) + 1
        previous = self.entries[-1]["entry_hash"] if self.entries else hashlib.sha256(b"").hexdigest()
        core = {
            "seq": seq,
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "run_id": run_id,
            "actor": str(payload.get("actor", "unknown"))[:64],
            "event": event,
            "attempt_id": str(payload.get("attempt_id", ""))[:128] or None,
            "data": data,
            "prev_hash": previous,
        }
        digest = hashlib.sha256(canonical(core) + bytes.fromhex(previous)).hexdigest()
        entry = {**core, "entry_hash": digest, "sig": b64(self.private_key.sign(bytes.fromhex(digest)))}
        with LOG.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(entry, sort_keys=True, separators=(",", ":")) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        self.entries.append(entry)
        if seq % 100 == 0 or event == "RUN_SEALED":
            self.checkpoint()
        return entry

    def checkpoint(self):
        hashes = [entry["entry_hash"] for entry in self.entries]
        core = {"upto_seq": len(hashes), "merkle_root": merkle_root(hashes)}
        record = {**core, "sig": b64(self.private_key.sign(canonical(core)))}
        with CHECKPOINTS.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        return record


STATE = State()


METRIC_CATEGORIES = (
    "malformed_request", "invalid_token", "wrong_role", "unlisted_route",
    "oversized_request", "rate_limit_exceeded", "other",
)


def prometheus_metrics() -> str:
    counts = {category: 0 for category in METRIC_CATEGORIES}
    compromised_runs = set()
    for entry in STATE.entries:
        if entry.get("event") != "POLICY_VIOLATION":
            continue
        data = entry.get("data", {})
        code = data.get("violation_code")
        if not isinstance(code, str):
            continue  # Ordinary Blue policy blocks are not boundary violations.
        category = code if code in counts else "other"
        counts[category] += 1
        if data.get("integrity_status") == "integrity-compromised":
            compromised_runs.add(entry.get("run_id"))
    lines = [
        "# HELP bayora_policy_violations_total Audited Gateway boundary violations by fixed category.",
        "# TYPE bayora_policy_violations_total counter",
    ]
    lines.extend(f'bayora_policy_violations_total{{category="{category}"}} {counts[category]}'
                 for category in METRIC_CATEGORIES)
    lines.extend([
        "# HELP bayora_integrity_compromised_runs_total Distinct runs flagged for integrity review.",
        "# TYPE bayora_integrity_compromised_runs_total gauge",
        f"bayora_integrity_compromised_runs_total {len(compromised_runs)}",
        "# HELP bayora_audit_entries_total Number of signed append-only audit entries.",
        "# TYPE bayora_audit_entries_total gauge",
        f"bayora_audit_entries_total {len(STATE.entries)}",
    ])
    return "\n".join(lines) + "\n"


class Handler(BaseHTTPRequestHandler):
    server_version = "BAYORA-Audit/1"

    def _send(self, code, body):
        raw = json.dumps(body, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _send_text(self, code, content_type, body):
        raw = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"status": "ok"})
        if self.path == "/metrics":
            with LOCK:
                return self._send_text(200, "text/plain; version=0.0.4; charset=utf-8",
                                       prometheus_metrics())
        return self._send(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/append":
            return self._send(404, {"error": "not_found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 65536:
                return self._send(413, {"error": "invalid_size"})
            payload = json.loads(self.rfile.read(length))
            with LOCK:
                entry = STATE.append(payload)
            return self._send(201, {"seq": entry["seq"], "entry_hash": entry["entry_hash"]})
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            return self._send(400, {"error": str(exc)[:120]})

    def do_PUT(self):
        return self._send(405, {"error": "method_not_allowed"})

    def do_DELETE(self):
        return self._send(405, {"error": "method_not_allowed"})

    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8081), Handler).serve_forever()
