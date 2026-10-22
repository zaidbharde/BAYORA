#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
sudo docker compose restart llm
for _ in $(seq 1 60); do
  state=$(sudo docker inspect -f '{{.State.Health.Status}}' bayora-llm-1 2>/dev/null || true)
  if [[ "$state" == "healthy" ]]; then
    ps_output=$(sudo docker compose exec -T llm ollama ps)
    if printf '%s\n' "$ps_output" | awk 'NR>1 && NF { found=1 } END { exit found ? 0 : 1 }'; then
      echo "MODEL_RESET_FAIL: a model remains loaded" >&2
      exit 1
    fi
    echo "MODEL_PROCESS_RESET_PASS: Ollama healthy; no model loaded"
    exit 0
  fi
  sleep 2
done
echo "MODEL_RESET_BLOCKED: Ollama health did not recover within 120s" >&2
exit 2
