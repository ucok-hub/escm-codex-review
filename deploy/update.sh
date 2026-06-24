#!/usr/bin/env bash
# Update Codex Review GUI di VM: tarik kode terbaru, build ulang, restart service.
# Jalankan dari ROOT repo:  bash deploy/update.sh
set -euo pipefail

echo "==> ambil kode terbaru (paksa samakan dengan remote)..."
# reset --hard kebal terhadap drift file generated (mis. package-lock.json yang
# di-regenerate npm di VM). File untracked seperti .env TIDAK tersentuh.
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin
git reset --hard "origin/$BRANCH"

echo "==> npm install (backend)..."
npm install

echo "==> build frontend (gui)..."
( cd gui && npm install && npm run build )

echo "==> restart service..."
sudo systemctl restart codex-review

echo "==> Selesai. Status:"
sudo systemctl --no-pager status codex-review | head -5
