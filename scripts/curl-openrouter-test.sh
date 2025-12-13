#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   OPENROUTER_API_KEY=... ./scripts/curl-openrouter-test.sh
# Optional:
#   OPENROUTER_MODEL=google/gemini-2.5-flash
#   OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1/chat/completions

endpoint="${OPENROUTER_ENDPOINT:-https://openrouter.ai/api/v1/chat/completions}"
model="${OPENROUTER_MODEL:-google/gemini-2.5-flash}"
key="${OPENROUTER_API_KEY:-}"

if [[ -z "$key" ]]; then
  echo "Missing OPENROUTER_API_KEY" >&2
  exit 1
fi

curl -i -sS -X POST "$endpoint" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $key" \
  -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}" \
  | head -120
