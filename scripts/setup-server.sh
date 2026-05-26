#!/bin/bash
# Запускать один раз на чистом Ubuntu/Debian сервере
set -e

echo "=== Installing dependencies ==="
apt-get update -q
apt-get install -y openjdk-21-jre-headless nginx

echo "=== Installing Node.js & PM2 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

echo "=== Creating directories ==="
mkdir -p /opt/webchat/frontend
mkdir -p /opt/webchat/upload
mkdir -p /var/log/webchat
chown -R $SUDO_USER:$SUDO_USER /opt/webchat /var/log/webchat

echo "=== Creating .env file (fill in your values!) ==="
cat > /opt/webchat/.env <<'EOF'
DB_URL=jdbc:postgresql://localhost:5432/webchat
DB_USER=webchat
DB_PASS=CHANGE_ME
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=CHANGE_ME_USE_64_CHAR_HEX_STRING
CORS_ORIGINS=https://yourdomain.com
EOF

echo ""
echo "=== DONE ==="
echo "Fill in /opt/webchat/.env with real values, then add to PM2 env:"
echo "  pm2 set webchat-backend DB_URL 'jdbc:postgresql://...'"
echo ""
echo "Also add your GitHub Actions secrets:"
echo "  SERVER_HOST  = server IP"
echo "  SERVER_USER  = $(whoami)"
echo "  SERVER_SSH_KEY = your private SSH key"
echo "  SERVER_PORT  = 22"
