#!/usr/bin/env bash
# Quick redeploy on VPS (after git push from your PC)
# Run on VPS: bash /var/www/linuxpro-website/scripts/vps-deploy.sh
set -euo pipefail

APP_DIR="/var/www/linuxpro-website"
cd "$APP_DIR"

echo "==> Pull latest code..."
git pull origin main

echo "==> Install dependencies..."
npm ci

echo "==> Production build..."
npm run build

echo "==> Restart PM2..."
pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
pm2 save

echo "==> Done. Check: pm2 status && curl -sI http://127.0.0.1:3000 | head -1"
pm2 status
