// ReportControls.tsx — bar kontrol: pilih dataset + Jalankan (tampilkan laporan
// rekaman, aman) + Scan ulang (live, memakai token) + status backend.
import type { ChangeEvent, RefObject } from "react";
import type { HealthResponse } from "../types";

interface Props {
  health: HealthResponse | null;
  running: boolean;
  onRun: () => void; // tampilkan laporan rekaman (anti-gagal)
  onRescan: () => void; // scan ulang live (memanggil AI)
  notice?: { msg: string; key: number } | null;
  uploadedFiles?: { name: string; content: string }[];
  uploadError?: string | null;
  onPickFiles?: () => void;
  onRemoveFile?: (name: string) => void;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  onFilesSelected?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function ReportControls({
  health,
  running,
  onRun,
  onRescan,
  notice,
  uploadedFiles = [],
  uploadError = null,
  onPickFiles,
  onRemoveFile,
  fileInputRef,
  onFilesSelected,
}: Props) {
  const keyOk = health?.apiKeyConfigured ?? false;
  return (
    <div className="controls">
      <div className="controls__left controls__left--stack">
        <div
          className="uploadzone"
          role="button"
          tabIndex={0}
          onClick={onPickFiles}
          onKeyDown={(e) => e.key === "Enter" && onPickFiles?.()}
        >
          <input
            ref={fileInputRef as RefObject<HTMLInputElement>}
            type="file"
            accept=".php"
            multiple
            className="uploadzone__input"
            onChange={onFilesSelected}
          />
          <div className="uploadzone__icon">📦</div>
          <div>
            <div className="uploadzone__title">Unggah file PHP Anda</div>
            <div className="uploadzone__hint">
              Klik area ini atau seret file; maksimal 5 file, ekstensi .php
            </div>
          </div>
        </div>
        {uploadedFiles.length > 0 && (
          <div className="uploadlist" aria-live="polite">
            {uploadedFiles.map((file) => (
              <span key={file.name} className="uploadlist__item">
                <span>{file.name}</span>
                <button
                  type="button"
                  className="uploadlist__remove"
                  onClick={() => onRemoveFile?.(file.name)}
                  title={`Hapus ${file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {uploadError && <span className="uploaderror">{uploadError}</span>}
        <span className="ctl-runwrap">
          <button
            className="btn btn--primary"
            onClick={onRun}
            disabled={running}
            title="Tampilkan hasil REKAMAN yang sudah tersimpan (cepat, tanpa biaya)"
          >
            📁 Tampilkan hasil rekaman
          </button>
          {notice && (
            <span
              key={notice.key}
              className="runnotice"
              role="status"
              aria-live="polite"
            >
              {notice.msg}
            </span>
          )}
        </span>
        <button
          className="btn btn--ghost"
          onClick={onRescan}
          disabled={running || !keyOk || uploadedFiles.length === 0}
          title={
            uploadedFiles.length === 0
              ? "Unggah minimal 1 file PHP dulu"
              : keyOk
                ? "Memanggil AI sungguhan saat ini juga (butuh beberapa detik & sedikit biaya)"
                : "Isi OPENAI_API_KEY di .env untuk mengaktifkan"
          }
        >
          {running ? "AI sedang memeriksa…" : "↻ Periksa dengan AI"}
        </button>
      </div>
      <span
        className={`statuspill ${
          health ? (keyOk ? "is-up" : "is-warn") : "is-down"
        }`}
      >
        {health
          ? `${health.model} · ${keyOk ? "key ✓" : "key ✗"} · ${health.rulesLoaded} kontrol`
          : "backend offline"}
      </span>
    </div>
  );
}
