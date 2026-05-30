#!/usr/bin/env bash
# One-time server provisioning: LiveKit, SSL certs, nginx, firewall.
# Idempotent — safe to run again, skips steps already done.
set -euo pipefail

: "${LIVEKIT_API_KEY:?GitHub Secret LIVEKIT_API_KEY is required}"
: "${LIVEKIT_API_SECRET:?GitHub Secret LIVEKIT_API_SECRET is required}"
: "${CERTBOT_EMAIL:?GitHub Secret CERTBOT_EMAIL is required}"

APP=/opt/webchat
UPLOAD="${APP}/upload"

log() { echo "[provision] $*"; }

# ── 1. Install certbot ────────────────────────────────────────────────────────
if ! command -v certbot &>/dev/null; then
    log "Installing certbot..."
    sudo apt-get update -q
    sudo apt-get install -y -q certbot
fi

# ── 2. Install LiveKit binary ─────────────────────────────────────────────────
if ! command -v livekit-server &>/dev/null; then
    log "Installing LiveKit server..."
    # Get exact asset URL from API — avoids filename format guessing across versions
    ASSET_URL=$(curl -sf --connect-timeout 10 \
        "https://api.github.com/repos/livekit/livekit/releases/latest" \
        | grep '"browser_download_url"' \
        | grep 'linux_amd64\.tar\.gz' \
        | head -1 | cut -d'"' -f4 || true)

    if [ -z "$ASSET_URL" ]; then
        ASSET_URL="https://github.com/livekit/livekit/releases/download/v1.8.2/livekit_linux_amd64.tar.gz"
        log "GitHub API unavailable, falling back to v1.8.2"
    else
        log "Downloading from ${ASSET_URL}"
    fi

    wget -q "$ASSET_URL" -O /tmp/livekit.tar.gz
    tar -xzf /tmp/livekit.tar.gz -C /tmp
    log "Archive contents: $(tar -tzf /tmp/livekit.tar.gz 2>/dev/null | tr '\n' ' ' || true)"

    # Binary name differs across versions: livekit-server (older) or livekit (newer)
    if [ -f /tmp/livekit-server ]; then
        sudo mv /tmp/livekit-server /usr/local/bin/livekit-server
    elif [ -f /tmp/livekit ]; then
        sudo mv /tmp/livekit /usr/local/bin/livekit-server
    else
        echo "ERROR: livekit binary not found in archive (checked livekit-server, livekit)"
        tar -tzf /tmp/livekit.tar.gz || true
        exit 1
    fi

    sudo chmod +x /usr/local/bin/livekit-server
    rm /tmp/livekit.tar.gz
    log "LiveKit installed."
else
    log "LiveKit already installed, skipping."
fi

# ── 3. LiveKit config ─────────────────────────────────────────────────────────
log "Writing /etc/livekit/livekit.yaml..."
sudo mkdir -p /etc/livekit
sudo tee /etc/livekit/livekit.yaml > /dev/null << EOF
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: true
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
turn:
  enabled: true
  domain: livekit.reminixauto.com
  tls_port: 5349
  udp_port: 3478
  external_tls: true
logging:
  level: info
EOF

# ── 4. Firewall ───────────────────────────────────────────────────────────────
log "Opening firewall ports..."
sudo ufw allow 80/tcp          > /dev/null 2>&1 || true
sudo ufw allow 443/tcp         > /dev/null 2>&1 || true
sudo ufw allow 7881/tcp        > /dev/null 2>&1 || true
sudo ufw allow 3478/udp        > /dev/null 2>&1 || true
sudo ufw allow 5349/tcp        > /dev/null 2>&1 || true
sudo ufw allow 50000:50100/udp > /dev/null 2>&1 || true

# ── 5. SSL certificates ───────────────────────────────────────────────────────
# Free port 80 temporarily if something is using it
_NGINX_STOPPED=0
if sudo ss -tlnp 2>/dev/null | grep -q ':80 '; then
    log "Port 80 busy, stopping nginx for ACME challenge..."
    sudo systemctl stop nginx
    _NGINX_STOPPED=1
fi

for domain in chat.reminixauto.com livekit.reminixauto.com; do
    if [ ! -d "/etc/letsencrypt/live/${domain}" ]; then
        log "Getting SSL cert for ${domain}..."
        sudo certbot certonly --standalone \
            --non-interactive --agree-tos \
            --email "${CERTBOT_EMAIL}" \
            -d "${domain}"
    else
        log "SSL cert for ${domain} already exists, skipping."
    fi
done

if [ "${_NGINX_STOPPED}" -eq 1 ]; then
    sudo systemctl start nginx
fi

# ── 6. Nginx: deploy both configs ────────────────────────────────────────────
log "Setting up nginx configs..."
sudo cp "${UPLOAD}/nginx.conf"          /etc/nginx/sites-available/webchat
sudo cp "${UPLOAD}/nginx-livekit.conf"  /etc/nginx/sites-available/livekit
sudo ln -sf /etc/nginx/sites-available/webchat  /etc/nginx/sites-enabled/webchat
sudo ln -sf /etc/nginx/sites-available/livekit  /etc/nginx/sites-enabled/livekit
sudo nginx -t
sudo systemctl reload nginx

# ── 7. Write LiveKit env vars to .env ────────────────────────────────────────
log "Writing LiveKit vars to ${APP}/.env..."
touch "${APP}/.env"

_set_env() {
    local key="$1" val="$2" file="${APP}/.env"
    if grep -q "^${key}=" "${file}"; then
        sed -i "s|^${key}=.*|${key}=${val}|" "${file}"
    else
        echo "${key}=${val}" >> "${file}"
    fi
}

_set_env LIVEKIT_URL        "wss://livekit.reminixauto.com"
_set_env LIVEKIT_API_KEY    "${LIVEKIT_API_KEY}"
_set_env LIVEKIT_API_SECRET "${LIVEKIT_API_SECRET}"
_set_env CORS_ORIGINS       "https://chat.reminixauto.com"

# ── 8. Ensure log dir ────────────────────────────────────────────────────────
sudo mkdir -p /var/log/webchat
sudo chown "$(whoami)" /var/log/webchat

log "Provision complete."
