#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_DIR="$ROOT/models/ollama"
CONTAINER="bayora-model-preload"
IMAGE="ollama/ollama:0.6.8"
mkdir -p "$MODEL_DIR"
if sudo docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Refusing to reuse existing container $CONTAINER" >&2
  exit 1
fi
cleanup() { sudo docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
sudo docker run -d --name "$CONTAINER" --network host \
  -v "$MODEL_DIR:/root/.ollama" "$IMAGE" >/dev/null
ready=0
for _ in $(seq 1 60); do
  if sudo docker exec "$CONTAINER" ollama list >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then echo "Ollama preload server did not become ready" >&2; exit 1; fi
sudo docker exec "$CONTAINER" ollama pull qwen2.5:0.5b
