#!/usr/bin/env bash
# Diffs this repo's contracts/ and domain/ against the backend repo's copies.
# Fails (exit 1) if any file differs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_CONTRACTS="$SCRIPT_DIR/../contracts"
BACKEND_CONTRACTS="$SCRIPT_DIR/../../mockup-karsa-backend/src/contracts"
FRONTEND_DOMAIN="$SCRIPT_DIR/../domain"
BACKEND_DOMAIN="$SCRIPT_DIR/../../mockup-karsa-backend/src/domain"

if [ ! -d "$BACKEND_CONTRACTS" ]; then
  echo "ERROR: Backend contracts not found at $BACKEND_CONTRACTS"
  exit 1
fi

if [ ! -d "$BACKEND_DOMAIN" ]; then
  echo "ERROR: Backend domain not found at $BACKEND_DOMAIN"
  exit 1
fi

FAILED=0

echo "=== Checking contracts/ ==="
for file in acks.ts commands.ts events.ts index.ts views.ts; do
  if ! diff -q "$FRONTEND_CONTRACTS/$file" "$BACKEND_CONTRACTS/$file" > /dev/null 2>&1; then
    echo "DIFF: contracts/$file differs between frontend and backend"
    diff "$FRONTEND_CONTRACTS/$file" "$BACKEND_CONTRACTS/$file" || true
    FAILED=1
  fi
done

echo "=== Checking domain/ ==="
for file in engine.ts model.ts quiz-config.ts quiz.ts; do
  if ! diff -q "$FRONTEND_DOMAIN/$file" "$BACKEND_DOMAIN/$file" > /dev/null 2>&1; then
    echo "DIFF: domain/$file differs between frontend and backend"
    diff "$FRONTEND_DOMAIN/$file" "$BACKEND_DOMAIN/$file" || true
    FAILED=1
  fi
done

if [ $FAILED -eq 0 ]; then
  echo "OK: contracts/ and domain/ are identical in both repos"
else
  echo "FAIL: files diverged — sync manually"
  exit 1
fi
