#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/secrets"
mkdir -p "$DIR"
chmod 700 "$DIR"
if [[ -e "$DIR/audit_private.pem" || -e "$DIR/audit_public.pem" ]]; then
  echo "Audit key exists; refusing to overwrite it" >&2
  exit 1
fi
openssl genpkey -algorithm Ed25519 -out "$DIR/audit_private.pem"
openssl pkey -in "$DIR/audit_private.pem" -pubout -out "$DIR/audit_public.pem"
sudo chown 10001:10001 "$DIR/audit_private.pem"
sudo chmod 400 "$DIR/audit_private.pem"
chmod 644 "$DIR/audit_public.pem"
