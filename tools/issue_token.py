#!/usr/bin/env python3
"""Issue a short-lived BAYORA EdDSA test/operator token using OpenSSL."""
import argparse
import base64
import json
import secrets
import subprocess
import tempfile
import time
from pathlib import Path


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=("red", "blue", "gateway", "operator"), required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--ttl", type=int, default=900)
    parser.add_argument("--private-key", type=Path, default=Path("secrets/gateway_private.pem"))
    args = parser.parse_args()
    if not 1 <= args.ttl <= 900:
        parser.error("TTL must be between 1 and 900 seconds")
    now = int(time.time())
    header = {"alg": "EdDSA", "typ": "JWT"}
    claims = {"iss": "bayora-dev", "aud": "bayora", "sub": args.role,
              "role": args.role, "run_id": args.run_id, "jti": secrets.token_hex(16),
              "iat": now, "exp": now + args.ttl}
    message = f"{b64(json.dumps(header, separators=(',', ':')).encode())}.{b64(json.dumps(claims, separators=(',', ':')).encode())}".encode()
    with tempfile.NamedTemporaryFile() as source:
        source.write(message)
        source.flush()
        signed = subprocess.run(
            ["openssl", "pkeyutl", "-sign", "-rawin", "-inkey", str(args.private_key), "-in", source.name],
            check=True, capture_output=True,
        ).stdout
    print(message.decode() + "." + b64(signed))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
