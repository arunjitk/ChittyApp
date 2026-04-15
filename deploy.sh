#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — One-command production deploy for ChittyLoanApp
#
# Run on the VPS:
#   ./deploy.sh
#
# Or trigger remotely from your Mac:
#   ssh root@YOUR_VPS_IP "cd /var/www/chitty && ./deploy.sh"
#
# Or set a local alias in ~/.zshrc:
#   alias deploy-chitty='git push origin main && ssh root@YOUR_VPS_IP "cd /var/www/chitty && ./deploy.sh"'
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/var/www/chitty"
COMPOSE="docker compose"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀  ChittyLoanApp — Production Deploy"
echo "  📅  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

# ── 1. Pull latest code from GitHub ─────────────────────────────────────────
echo ""
echo "📥  Pulling latest code..."
git pull origin main

# ── 2. Validate .env exists ──────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo ""
  echo "❌  ERROR: .env not found at $APP_DIR/.env"
  echo "   Run: cp .env.example .env && nano .env"
  exit 1
fi

# ── 3. Build changed containers (Docker layer cache makes this fast) ──────────
echo ""
echo "🐳  Building containers (unchanged layers are cached)..."
$COMPOSE build --parallel

# ── 4. Start / rolling-restart all services ──────────────────────────────────
echo ""
echo "♻️   Starting services..."
$COMPOSE up -d --remove-orphans

# ── 5. Wait for backend health check ─────────────────────────────────────────
echo ""
echo "⏳  Waiting for backend to become healthy..."
RETRIES=30
for i in $(seq 1 $RETRIES); do
  if $COMPOSE exec -T backend wget -qO- http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅  Backend is healthy"
    break
  fi
  if [ "$i" -eq "$RETRIES" ]; then
    echo ""
    echo "❌  Backend failed health check after ${RETRIES} attempts."
    echo "    Last 30 log lines:"
    $COMPOSE logs backend --tail=30
    exit 1
  fi
  sleep 2
done

# ── 6. Clean up dangling images (free disk space) ────────────────────────────
docker image prune -f > /dev/null

# ── 7. Summary ───────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Deploy complete!"
echo ""
$COMPOSE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
