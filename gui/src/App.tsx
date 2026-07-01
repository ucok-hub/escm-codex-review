// App.tsx — orkestrasi GUI laporan "Codex Review Summary" (gaya GitLab).
// Alur: pilih dataset → "Jalankan" (tampilkan laporan rekaman, aman) atau
// "Scan ulang (live)" (panggil AI). Riwayat run bisa dimuat ulang.
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  HealthResponse,
  EvalResponse,
  HistorySummary,
  RequestStatus,
  ScanProgress as ScanProgressData,
} from "./types";
import {
  getHealth,
  postEvaluateStream,
  getHistory,
  getHistoryRun,
  ApiHttpError,
  setAccessCode,
  clearAccessCode,
} from "./api";
import { ReportControls } from "./components/ReportControls";
import { ReportView } from "./components/ReportView";
import { RunHistory } from "./components/RunHistory";
import { ScanProgress } from "./components/ScanProgress";
import { IntroPanel } from "./components/IntroPanel";
import { GlossaryModal } from "./components/GlossaryModal";
import { SectionNav, BackToTop } from "./components/SectionNav";
import { AnimatePresence } from "framer-motion";
import { UatView } from "./components/uat/UatView";

// Batas unggahan (upload bebas). Disamakan dengan validasi server:
// maks 5 file, ekstensi .php / .blade.php, ukuran ≤200 KB per file.
const MAX_FILES = 5;
const MAX_BYTES = 200 * 1024;
const ACCEPTED_NAME = /\.(blade\.)?php$/i;

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<EvalResponse | null>(null);
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Bedakan jenis loading: "live" (scan AI, pakai bar) vs "load" (muat
  // rekaman/riwayat, instan → banner ringkas).
  const [loadingKind, setLoadingKind] = useState<"live" | "load" | null>(null);
  // Fase keluar bar scan live: bar menyusut ke tengah & memudar SEBELUM hasil
  // muncul (lihat runLive).
  const [scanExiting, setScanExiting] = useState(false);
  // File yang diunggah pengguna (upload bebas) + isinya (dibaca di browser).
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; content: string }[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // true selama FileReader membaca isi file (umpan balik "Membaca file…").
  const [reading, setReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgressData | null>(
    null,
  );
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [uatOpen, setUatOpen] = useState(false);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
    getHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  // Konfirmasi sebelum refresh/keluar saat: scan live SEDANG berjalan, ATAU
  // hasil live sedang ditampilkan. (Teks dialog mengikuti bawaan browser —
  // tidak bisa dikustom.)
  useEffect(() => {
    const guard =
      (status === "loading" && loadingKind === "live") ||
      current?.source === "live";
    if (!guard) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status, loadingKind, current]);

  // "Periksa dengan AI" — panggil AI sungguhan, simpan ke riwayat.
  // Bila server minta passcode (401), minta sekali lalu coba ulang.
  async function runLive(isRetry = false) {
    if (!uploadedFiles.length) {
      setError("Unggah minimal 1 file PHP sebelum memulai scan.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setLoadingKind("live");
    setError(null);
    setScanExiting(false);
    setScanProgress(null);
    try {
      const res = await postEvaluateStream(uploadedFiles, (p) =>
        setScanProgress(p),
      );
      // Animasi penutup: bar menyusut ke tengah & memudar dulu, lalu —
      // tepat saat bar lenyap — hasil dirender dengan animasinya sendiri.
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setScanExiting(true);
      await new Promise((r) => setTimeout(r, reduce ? 0 : 560));
      setCurrent(res);
      setActiveId(res.runId);
      setStatus("success");
      setScanExiting(false);
      getHistory()
        .then(setHistory)
        .catch(() => {});
    } catch (e) {
      setScanExiting(false);
      if (e instanceof ApiHttpError && e.status === 401) {
        if (!isRetry) {
          const code = window.prompt(
            "Scan live butuh passcode (by invitation). Masukkan passcode:",
          );
          if (code && code.trim()) {
            setAccessCode(code);
            return runLive(true);
          }
          setError("Scan live dibatalkan — butuh passcode.");
          setStatus("error");
          return;
        }
        clearAccessCode();
        setError("Passcode salah. Coba lagi.");
        setStatus("error");
        return;
      }
      setError(e instanceof Error ? e.message : "Kesalahan tak dikenal.");
      setStatus("error");
    }
  }

  // Baca + validasi file di browser (dipakai bersama oleh input "pilih file"
  // dan drag-and-drop). Digabung dengan yang sudah ada, dedup per nama, batas 5.
  async function ingestFiles(fileList: File[]) {
    if (!fileList.length) return;
    const valid: File[] = [];
    let invalidCount = 0;
    for (const file of fileList) {
      if (file.size > MAX_BYTES || !ACCEPTED_NAME.test(file.name)) {
        invalidCount += 1;
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) {
      setUploadError("Hanya file .php / .blade.php (maks 200 KB) yang diterima.");
      return;
    }
    setReading(true);
    try {
      const readFiles = await Promise.all(
        valid.map(
          (file) =>
            new Promise<{ name: string; content: string }>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve({
                    name: file.name,
                    content: String(reader.result || ""),
                  });
                reader.onerror = () =>
                  reject(new Error(`Gagal membaca ${file.name}`));
                reader.readAsText(file);
              },
            ),
        ),
      );
      // Dedup per nama: file baru menimpa yang lama bernama sama.
      const map = new Map(uploadedFiles.map((f) => [f.name, f]));
      for (const f of readFiles) map.set(f.name, f);
      const all = Array.from(map.values());
      const overflow = all.length > MAX_FILES;
      setUploadedFiles(all.slice(0, MAX_FILES));
      if (overflow) {
        setUploadError(
          `Maksimal ${MAX_FILES} file — sebagian tidak dimasukkan.`,
        );
      } else if (invalidCount) {
        setUploadError(
          "Sebagian file dilewati (bukan .php / .blade.php atau >200 KB).",
        );
      } else {
        setUploadError(null);
      }
    } catch {
      setUploadError("Gagal membaca file yang dipilih.");
    } finally {
      setReading(false);
    }
  }

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    ingestFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }

  function removeUploadedFile(name: string) {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== name));
    if (!uploadError) setUploadError(null);
  }

  async function loadRun(id: string) {
    setStatus("loading");
    setLoadingKind("load");
    setError(null);
    try {
      const run = await getHistoryRun(id);
      setCurrent(run);
      setActiveId(id);
      setStatus("success");
      // #10: bawa pengguna ke atas agar langsung melihat laporannya.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Gagal memuat run dari riwayat.");
      setStatus("error");
    }
  }

  return (
    <div className="page">
      <div className="page__bar">
        <div className="page__brand">
          <button
            type="button"
            className="page__brandbtn"
            onClick={() => window.location.reload()}
            title="Klik untuk memuat ulang halaman"
          >
            codex<span>//</span>review
          </button>
          <em>— demo asisten AI pemeriksa kode (WISE/ESCM)</em>
        </div>
      </div>

      <IntroPanel onOpenGlossary={() => setGlossaryOpen(true)} />

      <ReportControls
        health={health}
        running={status === "loading"}
        reading={reading}
        onRescan={() => runLive()}
        uploadedFiles={uploadedFiles}
        uploadError={uploadError}
        onPickFiles={() => fileInputRef.current?.click()}
        onDropFiles={ingestFiles}
        onRemoveFile={removeUploadedFile}
        fileInputRef={fileInputRef}
        onFilesSelected={handleFilesSelected}
      />

      {status === "loading" &&
        (loadingKind === "live" ? (
          <ScanProgress
            exiting={scanExiting}
            progress={scanProgress?.pct}
            label={scanProgress?.label}
          />
        ) : (
          <div className="banner banner--load">Memuat laporan…</div>
        ))}
      {error && status !== "loading" && (
        <div className="banner banner--error">{error}</div>
      )}

      {current ? (
        <ReportView data={current} />
      ) : (
        !error &&
        status !== "loading" && (
          <div className="empty">
            <p className="empty__lead">
              Unggah <b>file PHP</b> Anda untuk memulai.
            </p>
            <p className="empty__sub">
              Anda dapat menyeret file ke area unggah, memilih hingga 5 file,
              lalu menekan <b>“Periksa dengan AI”</b> setelah yakin dengan isi
              file yang dipilih.
            </p>
          </div>
        )
      )}

      <div
        id="nav-riwayat"
        data-navlabel={history.length ? "Riwayat" : undefined}
      >
        <RunHistory runs={history} activeId={activeId} onSelect={loadRun} />
      </div>

      <div className="uat-cta-wrap">
        <button
          type="button"
          className="uat-cta"
          onClick={() => setUatOpen(true)}
        >
          Sudah mencoba? Beri Penilaian Anda →
        </button>
      </div>

      <footer className="foot">
        Bot ini <b>hanya memberi saran</b> (tidak mengubah/menghapus kode) ·
        demo independen, memakai mesin yang sama dengan sistem tim.
      </footer>

      {glossaryOpen && <GlossaryModal onClose={() => setGlossaryOpen(false)} />}

      <AnimatePresence>
        {uatOpen && <UatView onExit={() => setUatOpen(false)} />}
      </AnimatePresence>

      <SectionNav
        refreshKey={`${current?.runId ?? ""}|${status}|${uploadedFiles.length}`}
      />
      <BackToTop />
    </div>
  );
}
