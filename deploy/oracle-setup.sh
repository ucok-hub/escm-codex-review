#!/usr/bin/env bash
# Setup Codex Review GUI di VM Ubuntu (Oracle Cloud Always Free).
# Jalankan dari ROOT repo hasil clone:
#     bash deploy/oracle-setup.sh
# Idempoten: aman dijalankan ulang.
set -euo pipefail

APP_DIR="$(pwd)"
APP_USER="$(whoami)"

echo "==> Repo: $APP_DIR (user: $APP_USER)"

# 1) Pastikan .env ada (server membaca .env dari root repo).
if [ ! -f .env ]; then
  echo "==> .env belum ada — membuat dari template."
  cp .env.example .env
  echo "    !! EDIT .env dan isi OPENAI_API_KEY & ACCESS_CODE, lalu jalankan:"
  echo "       sudo systemctl restart codex-review"
fi

# 2) Node.js 20 LTS (NodeSource) bila belum terpasang.
if ! command -v node >/dev/null 2>&1; then
  echo "==> Memasang Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "==> Node $(node -v)"

# 3) Install dependency + build frontend.
echo "==> npm install (backend)..."
npm install
echo "==> npm install + build (gui)..."
( cd gui && npm install && npm run build )

# 4) Buat & aktifkan systemd service (path & user diisi otomatis).
NODE_BIN="$(command -v node)"
echo "==> Membuat service systemd..."
sudo tee /etc/systemd/system/codex-review.service >/dev/null <<EOF
[Unit]
Description=Codex Review GUI (WISE/ESCM)
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} server/server.mjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production
# Secret (OPENAI_API_KEY, ACCESS_CODE) dibaca dari .env di WorkingDirectory.

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now codex-review

# 5) Buka port 8787 di firewall OS (iptables OCI memblok default).
echo "==> Membuka port 8787 di firewall OS..."
sudo iptables -C INPUT -p tcp --dport 8787 -j ACCEPT 2>/dev/null \
  || sudo iptables -I INPUT -p tcp --dport 8787 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || sudo apt-get install -y iptables-persistent

echo
echo "==> SELESAI."
echo "    Status : sudo systemctl status codex-review"
echo "    Log    : journalctl -u codex-review -f"
echo "    Akses  : http://<PUBLIC_IP>:8787  (buka port 8787 juga di OCI Security List)"
