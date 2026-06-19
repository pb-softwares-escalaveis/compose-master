#!/bin/sh
set -e

CONNECT_URL="http://kafka-connect:8083"
MAX_RETRIES="${CONNECT_WAIT_RETRIES:-30}"
RETRY_INTERVAL="${CONNECT_WAIT_INTERVAL:-10}"

echo "Waiting for Kafka Connect at ${CONNECT_URL} to be ready..."

attempt=0
while [ $attempt -lt $MAX_RETRIES ]; do
  attempt=$((attempt + 1))
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${CONNECT_URL}/connectors" 2>/dev/null || echo "000")
  
  if [ "$STATUS" = "200" ]; then
    echo "Kafka Connect is ready (attempt ${attempt}/${MAX_RETRIES})"
    break
  fi
  
  echo "Kafka Connect not ready yet (HTTP ${STATUS}), retrying in ${RETRY_INTERVAL}s... (${attempt}/${MAX_RETRIES})"
  sleep "$RETRY_INTERVAL"
done

if [ "$STATUS" != "200" ]; then
  echo "ERROR: Kafka Connect did not become ready after ${MAX_RETRIES} attempts"
  exit 1
fi

sleep 5

echo "Registering Postgres source connector..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d @/config/postgres_config.json \
  "${CONNECT_URL}/connectors")

HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "Connector registered successfully (HTTP ${HTTP_CODE})"
  echo "$HTTP_BODY"
elif [ "$HTTP_CODE" = "409" ]; then
  echo "Connector already exists (HTTP 409), skipping."
  echo "$HTTP_BODY"
else
  echo "ERROR: Failed to register connector (HTTP ${HTTP_CODE})"
  echo "$HTTP_BODY"
  exit 1
fi
