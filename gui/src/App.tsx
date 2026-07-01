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
  getRecordedReport,
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
  // muncul (lihat runLive). Notifikasi "sudah dimuat" untuk klik "Jalankan"
  // berulang saat rekaman sudah tampil.
  const [scanExiting, setScanExiting] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; key: number } | null>(
    null,
  );
  const noticeTimer = useRef<number | null>(null);
  // Alur naratif: dataset dipilih dulu → panel seeded (hero) tampil → saat
  // dijalankan, hero memudar ke atas (seededExiting) sebelum hasil muncul.
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; content: string }[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  // Bungkus aksi run/scan: bila masih di panel seeded (belum ada hasil),
  // mainkan animasi "memudar ke atas" dulu, baru jalankan aksinya.
  async function withSeededExit(action: () => void | Promise<void>) {
    await action();
  }

  // Tampilkan notifikasi singkat di bawah tombol "Jalankan" (auto-hilang ~3s).
  function flashNotice(msg: string) {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice({ msg, key: Date.now() });
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3000);
  }

  // "Jalankan" — tampilkan laporan rekaman (statis, anti-gagal).
  async function showRecorded() {
    // Bila laporan rekaman SUDAH tampil, jangan reload (hindari "kedut"
    // render ulang) — cukup beri notifikasi bahwa data sudah dimuat.
    if (current?.source === "recorded" && status === "success") {
      flashNotice("Data sudah dimuat");
      return;
    }
    setStatus("loading");
    setLoadingKind("load");
    setError(null);
    try {
      const rec = await getRecordedReport();
      if (!rec) {
        setStatus("idle");
        setError(
          'Belum ada laporan rekaman. Tekan "Scan ulang (live)" untuk membuatnya, lalu jalankan `npm run pin-report` agar tersimpan sebagai default.',
        );
        return;
      }
      setCurrent(rec);
      setActiveId(rec.runId);
      setStatus("success");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal memuat laporan rekaman.",
      );
      setStatus("error");
    }
  }

  // "Scan ulang (live)" — panggil AI sungguhan, simpan ke riwayat.
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

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next: { name: string; content: string }[] = [];
    let invalidCount = 0;
    for (const file of files) {
      if (file.size > 200 * 1024) {
        invalidCount += 1;
        continue;
      }
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (ext !== ".php") {
        invalidCount += 1;
        continue;
      }
      next.push({ name: file.name, content: "" });
    }
    if (next.length > 5) {
      setUploadError("Maksimal 5 file per unggahan.");
      return;
    }
    if (invalidCount) {
      setUploadError(
        "Hanya file .php dengan ukuran maksimal 200 KB yang diterima.",
      );
    } else {
      setUploadError(null);
    }
    Promise.all(
      next.map(
        (entry) =>
          new Promise<{ name: string; content: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: entry.name,
                content: String(reader.result || ""),
              });
            reader.onerror = () =>
              reject(new Error(`Gagal membaca ${entry.name}`));
            reader.readAsText(files.find((f) => f.name === entry.name) as File);
          }),
      ),
    )
      .then((readFiles) => {
        setUploadedFiles((prev) => {
          const merged = [...prev, ...readFiles].slice(0, 5);
          return merged;
        });
      })
      .catch(() => setUploadError("Gagal membaca file yang dipilih."));
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
        onRun={() => withSeededExit(showRecorded)}
        onRescan={() => withSeededExit(() => runLive())}
        notice={notice}
        uploadedFiles={uploadedFiles}
        uploadError={uploadError}
        onPickFiles={() => fileInputRef.current?.click()}
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
