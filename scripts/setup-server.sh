#!/bin/bash
# Run once on a clean Ubuntu 22.04/24.04 server AS ROOT.
# Usage: sudo bash setup-server.sh
set -euo pipefail

APP_USER="${SUDO_USER:-webchat}"
APP_HOME="/opt/webchat"
LOG_DIR="/var/log/webchat"

echo "=== [1/7] System packages ==="
apt-get update -q
apt-get install -y --no-install-recommends \
  curl gnupg lsb-release ca-certificates \
  openjdk-21-jre-headless nginx

echo "=== [2/7] PostgreSQL 16 ==="
if ! command -v psql &>/dev/null; then
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
  echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] \
    https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -q
  apt-get install -y postgresql-16
fi
systemctl enable --now postgresql

echo "=== [3/7] Redis 7 ==="
if ! command -v redis-server &>/dev/null; then
  curl -fsSL https://packages.redis.io/gpg \
    | gpg --dearmor -o /usr/share/keyrings/redis.gpg
  echo "deb [signed-by=/usr/share/keyrings/redis.gpg] \
    https://packages.redis.io/deb $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/redis.list
  apt-get update -q
  apt-get install -y redis-server
fi
systemctl enable --now redis-server

echo "=== [4/7] Node.js 20 + PM2 ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2
# Register PM2 as a systemd service for the app user
pm2 startup systemd -u "$APP_USER" --hp "$(eval echo ~$APP_USER)" || true

echo "=== [5/7] Directories ==="
mkdir -p "$APP_HOME/frontend" \
         "$APP_HOME/uploads" \
         "$APP_HOME/upload" \
         "$LOG_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_HOME" "$LOG_DIR"

echo "=== [6/7] PostgreSQL: create DB + user ==="
# Run as postgres system user; skip if already exists
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='webchat'" \
  | grep -q 1 || sudo -u postgres psql -c "CREATE USER webchat WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='webchat'" \
  | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE webchat OWNER webchat;"

echo "=== [7/7] .env template ==="
ENV_FILE="$APP_HOME/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
# PostgreSQL
DB_URL=jdbc:postgresql://localhost:5432/webchat
DB_USER=webchat
DB_PASS=CHANGE_ME

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT — generate with: openssl rand -hex 32
JWT_SECRET=CHANGE_ME_USE_64_CHAR_HEX_STRING

# Frontend origin (no trailing slash)
CORS_ORIGINS=https://yourdomain.com

# VAPID push notifications — generate with:
#   npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=CHANGE_ME
VAPID_PRIVATE_KEY=CHANGE_ME
VAPID_SUBJECT=mailto:admin@yourdomain.com
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo ""
  echo "*** Fill in $ENV_FILE with real values before starting the app! ***"
else
  echo "$ENV_FILE already exists — skipping."
fi

echo ""
echo "=== logrotate ==="
cat > /etc/logrotate.d/webchat <<'EOF'
/var/log/webchat/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

echo ""
echo "=============================="
echo "Setup complete. Next steps:"
echo "  1. Edit $ENV_FILE"
echo "  2. Update DB password: sudo -u postgres psql -c \"ALTER USER webchat PASSWORD 'new_pass';\""
echo "  3. Add GitHub Actions secrets: SERVER_HOST, SERVER_USER, SERVER_SSH_KEY, SERVER_PORT"
echo "  4. Push to main → CI/CD will deploy"
echo "=============================="
