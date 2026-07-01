#!/usr/bin/env bash
# Update Codex Review GUI di VM: tarik kode terbaru, build ulang, restart service.
# Jalankan dari ROOT repo:  bash deploy/update.sh
set -euo pipefail

echo "==> ambil kode terbaru (paksa samakan dengan target)..."
# reset --hard kebal terhadap drift file generated (mis. package-lock.json yang
# di-regenerate npm di VM). File untracked seperti .env TIDAK tersentuh.
TARGET_REF="${1:-}"
git fetch origin

if [ -n "$TARGET_REF" ]; then
  echo "==> memakai ref/commit: $TARGET_REF"
  git checkout --force --detach "$TARGET_REF"
else
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$BRANCH" = "HEAD" ]; then
    BRANCH="$(
      git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null \
        | sed 's#^origin/##'
    )"
    BRANCH="${BRANCH:-master}"
    echo "==> repo sedang detached; kembali ke origin/$BRANCH"
    git checkout --force -B "$BRANCH" "origin/$BRANCH"
  fi
  git reset --hard "origin/$BRANCH"
fi
echo "==> commit aktif: $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD))"

echo "==> npm install (backend)..."
npm install

echo "==> build frontend (gui)..."
( cd gui && npm install && npm run build )

echo "==> restart service..."
sudo systemctl restart codex-review

echo "==> Selesai. Status:"
sudo systemctl --no-pager status codex-review | head -5
