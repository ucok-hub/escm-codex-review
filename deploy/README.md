# Deploy ke Oracle Cloud Always Free (VM)

Panduan menjalankan Codex Review GUI di VM gratis-selamanya Oracle Cloud.
Tak pernah tidur, tanpa tagihan (kartu hanya untuk verifikasi akun).

## Ringkas
1. Buat akun Oracle Cloud → buat VM **Always Free** (Ubuntu 22.04).
2. Buka port `8787` di **OCI Security List** (jaringan).
3. SSH ke VM, clone repo publik ini, lalu:
   ```bash
   cd escm-codex-review
   cp .env.example .env && nano .env   # isi OPENAI_API_KEY & ACCESS_CODE
   bash deploy/oracle-setup.sh
   ```
   Script akan: install Node 20, build, buat systemd service (auto-restart),
   dan buka port 8787 di firewall OS.
4. Akses `http://<PUBLIC_IP>:8787`.

## Detail VM
- **Shape:** `Ampere A1 (ARM)` Always Free — mis. 1 OCPU / 6 GB RAM (lega untuk build).
  Bila "out of capacity", coba region/AD lain atau pakai `VM.Standard.E2.1.Micro`
  (AMD, 1 GB RAM — tambahkan swap dulu, lihat bawah).
- **Image:** Canonical Ubuntu 22.04.
- **SSH key:** unggah public key saat buat instance; login user = `ubuntu`.

## Swap (hanya bila pakai AMD 1 GB, agar build tak OOM)
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Perintah berguna
```bash
sudo systemctl status codex-review      # cek status
journalctl -u codex-review -f           # lihat log realtime
sudo systemctl restart codex-review     # setelah edit .env
```

## (Opsional) HTTPS tanpa beli domain
Lihat [`Caddyfile`](Caddyfile) — reverse proxy + sertifikat otomatis via sslip.io.
Buka port 80 & 443 (OCI Security List + firewall OS) bila memakainya.
