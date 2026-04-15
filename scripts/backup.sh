#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# backup.sh — PostgreSQL database backup
#
# Creates a compressed SQL dump and keeps the last 30 backups.
#
# Manual run:   ./scripts/backup.sh
# Automated:    Add to crontab (crontab -e):
#   0 2 * * * cd /var/www/chitty && ./scripts/backup.sh >> /var/log/chitty-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/var/www/chitty"
BACKUP_DIR="/var/backups/chitty"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd "$APP_DIR"

# Load env vars to get DB credentials
set -a; source .env; set +a

mkdir -p "$BACKUP_DIR"

echo "📦  Backing up database at $TIMESTAMP..."

docker compose exec -T postgres pg_dump \
  -U "$DB_USER" \
  "$DB_NAME" \
  | gzip > "$BACKUP_DIR/chitty_db_${TIMESTAMP}.sql.gz"

echo "✅  Saved: $BACKUP_DIR/chitty_db_${TIMESTAMP}.sql.gz"

# Keep only the last 30 backups
KEPT=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
if [ "$KEPT" -gt 30 ]; then
  ls -t "$BACKUP_DIR"/*.sql.gz | tail -n +31 | xargs rm -f
  echo "🗑️   Pruned old backups (kept last 30)"
fi

echo ""
echo "📁  Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print "   " $5 "  " $9}'
