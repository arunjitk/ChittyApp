#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# init-ssl.sh — Get the first SSL certificate from Let's Encrypt
#
# Run ONCE after first deploy:
#   ./scripts/init-ssl.sh yourdomain.com admin@yourdomain.com
#
# After this script succeeds:
#   1. Edit nginx/ssl.conf — replace every 'yourdomain.com' with your domain
#   2. cp nginx/ssl.conf nginx/default.conf
#   3. docker compose exec nginx nginx -s reload
#   4. Add auto-renewal to crontab (see output below)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./scripts/init-ssl.sh <domain> [email]"
  echo "  e.g: ./scripts/init-ssl.sh chitty.yourdomain.com admin@yourdomain.com"
  exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@$DOMAIN}"
APP_DIR="/var/www/chitty"

cd "$APP_DIR"

echo "🔒  Requesting SSL certificate for: $DOMAIN"
echo "📧  Contact email: $EMAIL"
echo ""

# Nginx must be running to serve the ACME challenge on port 80
if ! docker compose ps nginx | grep -q "Up"; then
  echo "❌  Nginx is not running. Start it first: docker compose up -d nginx"
  exit 1
fi

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo ""
echo "✅  Certificate obtained!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next steps:"
echo ""
echo "  1. Update nginx/ssl.conf with your domain:"
echo "     sed -i 's/yourdomain.com/$DOMAIN/g' $APP_DIR/nginx/ssl.conf"
echo ""
echo "  2. Activate HTTPS config:"
echo "     cp $APP_DIR/nginx/ssl.conf $APP_DIR/nginx/default.conf"
echo "     docker compose exec nginx nginx -s reload"
echo ""
echo "  3. Add auto-renewal to crontab (crontab -e):"
echo "     0 3 * * * cd $APP_DIR && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
