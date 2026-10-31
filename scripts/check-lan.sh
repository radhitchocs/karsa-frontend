#!/usr/bin/env bash
# check-lan.sh — verify the app is reachable over LAN HTTP
#
# Usage:
#   bash scripts/check-lan.sh               # auto-detect LAN IP
#   bash scripts/check-lan.sh 192.168.1.50  # explicit LAN IP
#
# Requires: curl, node (for join API call)
# Frontend expected on :3000, backend on :3001
set -euo pipefail

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-3001}"

# ── Detect LAN IP ──────────────────────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
  LAN_IP="$1"
else
  # macOS: en0 (WiFi) or en1
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
fi

if [[ -z "$LAN_IP" ]]; then
  echo "❌ Could not detect LAN IP. Pass it explicitly: bash scripts/check-lan.sh <IP>"
  exit 1
fi

FRONTEND="http://${LAN_IP}:${FRONTEND_PORT}"
BACKEND="http://${LAN_IP}:${BACKEND_PORT}"

echo "🔍 LAN IP: $LAN_IP"
echo "   Frontend: $FRONTEND"
echo "   Backend:  $BACKEND"
echo ""

# ── 1. Frontend /join loads ────────────────────────────────────────────────────
echo -n "1. GET $FRONTEND/join ... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$FRONTEND/join")
if [[ "$STATUS" == "200" ]]; then
  echo "✓ $STATUS"
else
  echo "❌ HTTP $STATUS"
  exit 1
fi

# ── 2. Backend /health responds ───────────────────────────────────────────────
echo -n "2. GET $BACKEND/health ... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BACKEND/health")
if [[ "$STATUS" == "200" ]]; then
  echo "✓ $STATUS"
else
  echo "❌ HTTP $STATUS"
  exit 1
fi

# ── 3. Register + login + create session + join via LAN ───────────────────────
echo "3. Full join flow via LAN API..."

RUN="$(date +%s)"
EMAIL="lan-check-${RUN}@test.karsa"
PASS="Test1234!"

reg=$(curl -s -X POST "$BACKEND/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

login=$(curl -s -X POST "$BACKEND/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$login" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).accessToken))")

pres=$(curl -s -X POST "$BACKEND/api/presentations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"LAN check"}')
PRES_ID=$(echo "$pres" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")

sess=$(curl -s -X POST "$BACKEND/api/presentations/$PRES_ID/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')
CODE=$(echo "$sess" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).code))")

join=$(curl -s -X POST "$BACKEND/api/sessions/join" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"name\":\"LAN-Tester\"}")
JOIN_ID=$(echo "$join" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).participantId))")

if [[ -n "$JOIN_ID" && "$JOIN_ID" != "undefined" && "$JOIN_ID" != "null" ]]; then
  echo "   ✓ Joined session (code=$CODE, participantId=$JOIN_ID)"
else
  echo "   ❌ Join failed: $join"
  exit 1
fi

echo ""
echo "✅ All LAN checks passed. Phone can reach $FRONTEND"
echo "   QR code on the presenter lobby will encode: $FRONTEND/join?code=<code>"
