#!/usr/bin/env bash
# Run on the VPS as root: bash vps-setup.sh
set -euo pipefail

APP_DIR="/var/www/linuxpro-website"
REPO="https://github.com/Umesh-2113/linuxpro-website.git"
DOMAIN="${1:-linuxpro.in}"

echo "==> Updating system..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Installing Node.js 20, git, nginx, certbot..."
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y git nginx certbot python3-certbot-nginx ufw

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Cloning/updating app..."
mkdir -p /var/www
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERROR: Create $APP_DIR/.env first (copy from .env.local), then re-run this script."
  exit 1
fi

echo "==> Building app..."
npm ci
npm run build

echo "==> Starting with PM2..."
pm2 delete linuxpro 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "==> Configuring nginx..."
cat > "/etc/nginx/sites-available/linuxpro" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/linuxpro /etc/nginx/sites-enabled/linuxpro
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Firewall (SSH on 3052, HTTP/HTTPS)..."
ufw allow 3052/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

echo "==> SSL (run after DNS points to this server)..."
echo "    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN}"

echo "==> Done. App should be on http://${DOMAIN} once DNS is set."
pm2 status
