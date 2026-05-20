#!/usr/bin/env bash
# sync-loop.sh — Llama repetidamente a /api/drive/sync hasta que done:true
# Uso: bash sync-loop.sh <JWT_TOKEN> [base_url]

TOKEN="${1:?Uso: bash sync-loop.sh <JWT_TOKEN> [base_url]}"
BASE_URL="${2:-http://localhost:3000}"
INTERVAL=5
ITERATION=0

echo "Iniciando sync loop contra $BASE_URL"
echo "----------------------------------------"

while true; do
  ITERATION=$((ITERATION + 1))
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/drive/sync" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

  DONE=$(echo "$RESPONSE" | grep -o '"done":[a-z]*' | head -1 | cut -d: -f2)
  QUEUE=$(echo "$RESPONSE" | grep -o '"queueRemaining":[0-9]*' | cut -d: -f2)
  INDEXED=$(echo "$RESPONSE" | grep -o '"indexed":[0-9]*' | cut -d: -f2)
  echo "[Iter $ITERATION] done=$DONE | indexed=${INDEXED:-?} | queueRemaining=${QUEUE:-?} | $(date +%H:%M:%S)"

  if [ "$DONE" = "true" ]; then
    echo "----------------------------------------"
    echo "Sync completado en $ITERATION iteraciones."
    break
  fi

  sleep $INTERVAL
done
