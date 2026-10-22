#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/secrets"
mkdir -p "$DIR"
chmod 700 "$DIR"
if [[ -e "$DIR/gateway_private.pem" || -e "$DIR/gateway_public.pem" ]]; then
  echo "Gateway key exists; refusing to overwrite it" >&2
  exit 1
fi
openssl genpkey -algorithm Ed25519 -out "$DIR/gateway_private.pem"
openssl pkey -in "$DIR/gateway_private.pem" -pubout -out "$DIR/gateway_public.pem"
chmod 600 "$DIR/gateway_private.pem"
chmod 644 "$DIR/gateway_public.pem"
