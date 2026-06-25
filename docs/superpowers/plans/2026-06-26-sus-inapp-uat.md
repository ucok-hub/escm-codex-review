# SUS In-App UAT ("Red Carpet") — Implementation Plan (repo: escm-codex-review)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`).
>
> **Repo target:** `escm-codex-review` (deployed/publik, dilihat penguji). Paths RELATIF ke root repo ini (TANPA prefix `.codex-review/`). Design disetujui di spec `escm-web-laravel/docs/superpowers/specs/2026-06-26-sus-inapp-uat-design.md`; plan ini = adaptasi ke struktur & tema escm-codex-review.

**Goal:** Kuesioner SUS diisi langsung di GUI dengan alur full-screen beranimasi ("red carpet"), data ke Google Sheet via Apps Script (proxy backend Express), aturan 1 email = 1 suara.

**Architecture:** Frontend React menambah overlay UAT (pola modal seperti `GlossaryModal`) berisi alur multi-langkah framer-motion. Backend Express memvalidasi payload lalu **meneruskan** ke Google Apps Script Web App yang dedup-by-email + append baris berstempel waktu ke Google Sheet. Backend tidak menyimpan.

**Tech Stack:** Node.js 20+ (ESM), Express 4, React 18 + TS + Vite 5, framer-motion 11 (sudah terpasang), `node:test`, Google Apps Script.

## Global Constraints

- Repo = escm-codex-review. Jangan ubah `scripts/run_codex.mjs`, `scripts/reviewEngine.mjs`, `.gitlab-ci.yml`.
- Secret `UAT_APPS_SCRIPT_URL` hanya dibaca server dari `.env` (root); JANGAN ke bundle frontend.
- UAT endpoint **TANPA** gerbang `ACCESS_CODE` & **tanpa** rate-limit. Anti-abuse = keunikan email. Aturan **1 email = 1 suara**.
- Email **dikumpulkan & ditampilkan EKSPLISIT** (atribusi) — bukan anonim. Persetujuan WAJIB menyatakan email dicatat & dapat ditampilkan di laporan/sidang (informed consent).
- Duplikat email → field email **merah** + **"Email ini sudah pernah mengisi."**
- "Red carpet" = overlay **navy + emas dramatis** (kontras di atas app tema terang). BUKAN merah harfiah (merah = severity/error).
- Headline sambutan (verbatim): **"Terima kasih sekali sudah ada di sini!"**
- Guardrails animasi: hormati `prefers-reduced-motion`; selalu ada jalan keluar (tombol Kembali + Esc); animasi hanya `transform`/`opacity`; non-blocking; aksesibel (label + keyboard); responsif.
- Skor SUS **tidak ditampilkan** ke responden.
- 10 item SUS = redaksi Indonesia tervalidasi (Sharfina & Santoso, 2016).
- Brand "codex//review"; bahasa ramah-awam.
- Test dijalankan dari root: `node --test`. Build gui: `cd gui && npm run build`.

---

## File Structure

**Backend (root):**
- Create `server/uat.mjs` — `validateUatPayload`, `forwardToAppsScript`.
- Modify `server/server.mjs` — endpoint `POST /api/uat`, `GET /api/uat/check`; baca `UAT_APPS_SCRIPT_URL`.
- Create `test/uat.test.mjs` — unit test.
- Modify `.env.example` — tambah `UAT_APPS_SCRIPT_URL=`.

**Apps Script (deploy, dipasang manual):**
- Create `deploy/uat_apps_script.gs`.

**Frontend (`gui/src/`):**
- Modify `gui/src/types.ts`, `gui/src/api.ts`; Create `gui/src/lib/sus.ts`.
- Create `gui/src/components/uat/{SusItem,SusScale,UatProgress,UatWelcome,UatConsent,UatDemographics,UatThankYou,UatView}.tsx`.
- Modify `gui/src/App.tsx` (state `uatOpen` + CTA + render UatView), `gui/src/styles.css` (gaya + animasi).

**Instrumen (LINTAS REPO — di escm-web-laravel):**
- Modify `escm-web-laravel/docs/evaluation/uat_sus_instrumen.md` — hapus "anonim", tambah field Email, consent eksplisit.

---

## Task 1: Backend — validasi & forwarder UAT

**Files:** Create `server/uat.mjs`; Test `test/uat.test.mjs`.

**Interfaces — Produces:**
- `validateUatPayload(body)` → `{ ok:boolean, error?:string }`. Valid: `consent===true`; `email` cocok regex; `answers` 10 integer 1..5; `peran`/`pengalaman`/`freqTools` string non-kosong.
- `forwardToAppsScript(url, { method, payload, query }, fetchImpl=fetch)` → `Promise<object>` JSON terparse. GET tempel query; POST kirim JSON via `Content-Type: text/plain`. Lempar Error bila non-2xx / JSON gagal.

- [ ] **Step 1: Tulis test yang gagal** — Create `test/uat.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUatPayload, forwardToAppsScript } from "../server/uat.mjs";

function goodBody() {
    return { consent: true, email: "dimas@wika.co.id", peran: "Backend Developer",
        pengalaman: "3-5 tahun", freqTools: "Sering",
        answers: [4, 2, 4, 2, 5, 2, 4, 1, 4, 2], komentar: "" };
}
test("payload valid lolos", () => { assert.deepEqual(validateUatPayload(goodBody()), { ok: true }); });
test("consent false ditolak", () => { assert.equal(validateUatPayload({ ...goodBody(), consent: false }).ok, false); });
test("email invalid ditolak", () => { assert.equal(validateUatPayload({ ...goodBody(), email: "x" }).ok, false); });
test("answers bukan 10 ditolak", () => { assert.equal(validateUatPayload({ ...goodBody(), answers: [1, 2, 3] }).ok, false); });
test("answers di luar 1..5 ditolak", () => { assert.equal(validateUatPayload({ ...goodBody(), answers: [4,2,4,2,5,2,4,1,4,9] }).ok, false); });
test("forwardToAppsScript GET menempel query & parse JSON", async () => {
    let calledUrl = "";
    const fakeFetch = async (url) => { calledUrl = url; return { ok: true, status: 200, text: async () => JSON.stringify({ exists: true }) }; };
    const out = await forwardToAppsScript("https://script/x", { method: "GET", query: { email: "a@b.com" } }, fakeFetch);
    assert.equal(out.exists, true);
    assert.match(calledUrl, /email=a%40b\.com/);
});
test("forwardToAppsScript non-2xx melempar", async () => {
    const fakeFetch = async () => ({ ok: false, status: 500, text: async () => "err" });
    await assert.rejects(() => forwardToAppsScript("https://script/x", { method: "POST", payload: {} }, fakeFetch));
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL** — `node --test test/uat.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implementasi** — Create `server/uat.mjs`:

```js
// uat.mjs — validasi payload UAT + forwarder ke Google Apps Script.
// Backend hanya MENERUSKAN; data final ada di Google Sheet.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUatPayload(body) {
    if (!body || typeof body !== "object") return { ok: false, error: "Body kosong." };
    if (body.consent !== true) return { ok: false, error: "Persetujuan wajib." };
    if (typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
        return { ok: false, error: "Email tidak valid." };
    }
    for (const f of ["peran", "pengalaman", "freqTools"]) {
        if (typeof body[f] !== "string" || !body[f].trim()) {
            return { ok: false, error: `Field ${f} wajib.` };
        }
    }
    const a = body.answers;
    if (!Array.isArray(a) || a.length !== 10) return { ok: false, error: "Jawaban harus 10 item." };
    for (const v of a) {
        if (!Number.isInteger(v) || v < 1 || v > 5) return { ok: false, error: "Jawaban harus 1..5." };
    }
    return { ok: true };
}

export async function forwardToAppsScript(url, opts, fetchImpl = fetch) {
    const { method = "POST", payload, query } = opts || {};
    let target = url;
    let init;
    if (method === "GET") {
        const qs = new URLSearchParams(query || {}).toString();
        target = qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
        init = { method: "GET" };
    } else {
        init = { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload || {}) };
    }
    const res = await fetchImpl(target, init);
    const text = await res.text();
    if (!res.ok) throw new Error(`Apps Script ${res.status}: ${text.slice(0, 200)}`);
    try { return JSON.parse(text); } catch (_) { throw new Error("Apps Script tidak mengembalikan JSON valid."); }
}
```

- [ ] **Step 4: Jalankan, pastikan LULUS** — `node --test test/uat.test.mjs` → PASS (7).

- [ ] **Step 5: Commit** — `git add server/uat.mjs test/uat.test.mjs && git commit -m "feat(uat): validasi payload + forwarder Apps Script"`

---

## Task 2: Backend — endpoint /api/uat & /api/uat/check

**Files:** Modify `server/server.mjs`, `.env.example`.

**Interfaces — Consumes** Task 1. **Produces (HTTP):** `POST /api/uat` → `{ok:true}` | 409 `{duplicate:true}` | 400/503/502 `{error}`; `GET /api/uat/check?email=` → `{exists:boolean}` | `{exists:false,soft:true}`.

- [ ] **Step 1: Import + konstanta** — Modify `server/server.mjs`: tambahkan import (dekat import lain di atas) `import { validateUatPayload, forwardToAppsScript } from "./uat.mjs";`. Lalu dekat konstanta env (mis. setelah `const ACCESS_CODE = ...`), tambahkan:
```js
const UAT_APPS_SCRIPT_URL = process.env.UAT_APPS_SCRIPT_URL || "";
```

- [ ] **Step 2: Handler** — Modify `server/server.mjs`: tepat SEBELUM blok `const GUI_DIST = path.join(ROOT, "gui", "dist");`, tambahkan:
```js
// UAT/SUS — TANPA gerbang ACCESS_CODE & tanpa rate-limit (anti-abuse = email unik).
app.get("/api/uat/check", async (req, res) => {
    const email = String(req.query.email || "").trim();
    if (!email) return res.json({ exists: false });
    if (!UAT_APPS_SCRIPT_URL) return res.json({ exists: false, soft: true });
    try {
        const out = await forwardToAppsScript(UAT_APPS_SCRIPT_URL, { method: "GET", query: { action: "check", email } });
        res.json({ exists: Boolean(out.exists) });
    } catch (err) {
        console.error("[server] /api/uat/check:", err.message);
        res.json({ exists: false, soft: true });
    }
});

app.post("/api/uat", async (req, res) => {
    const verdict = validateUatPayload(req.body);
    if (!verdict.ok) return res.status(400).json({ error: verdict.error });
    if (!UAT_APPS_SCRIPT_URL) return res.status(503).json({ error: "UAT belum dikonfigurasi (UAT_APPS_SCRIPT_URL kosong)." });
    try {
        const out = await forwardToAppsScript(UAT_APPS_SCRIPT_URL, { method: "POST", payload: { action: "submit", ...req.body } });
        if (out.duplicate) return res.status(409).json({ duplicate: true });
        if (out.ok) return res.json({ ok: true });
        return res.status(500).json({ error: "Respons Apps Script tak terduga." });
    } catch (err) {
        console.error("[server] /api/uat:", err.message);
        res.status(502).json({ error: "Gagal menyimpan ke Google Sheet. Coba lagi." });
    }
});
```

- [ ] **Step 3: env example** — Modify `.env.example`: tambahkan di akhir:
```
# URL Google Apps Script Web App untuk menyimpan jawaban UAT/SUS ke Google Sheet.
UAT_APPS_SCRIPT_URL=
```

- [ ] **Step 4: Verifikasi** — `node --check server/server.mjs && echo OK` → `OK`. Lalu:
```bash
node server/server.mjs > /tmp/uat_srv.log 2>&1 & SRV=$!; sleep 2
curl -s "http://localhost:8787/api/uat/check?email=a@b.com"; echo ""
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8787/api/uat -H "Content-Type: application/json" -d '{"consent":true,"email":"a@b.com","peran":"x","pengalaman":"y","freqTools":"z","answers":[1,2,3,4,5,1,2,3,4,5]}'
kill $SRV 2>/dev/null
```
Expected: check → `{"exists":false,"soft":true}`; submit → `503`.

- [ ] **Step 5: Commit** — `git add server/server.mjs .env.example && git commit -m "feat(uat): endpoint /api/uat & /api/uat/check (proxy Apps Script)"`

---

## Task 3: Google Apps Script (siap-tempel)

**Files:** Create `deploy/uat_apps_script.gs`.

- [ ] **Step 1: Tulis berkas** — Create `deploy/uat_apps_script.gs`:

```js
// uat_apps_script.gs — tempel ke Google Apps Script yang TERIKAT pada Google Sheet UAT.
// 1) Buat Google Sheet baru (mis. "UAT SUS ESCM"). Extensions → Apps Script.
// 2) Tempel kode ini. Simpan.
// 3) Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
// 4) Salin Web app URL → .env (root repo): UAT_APPS_SCRIPT_URL=...
const HEADER = ["timestamp","email","peran","pengalaman","freqTools","q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","komentar"];
function sheet_() { return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; }
function emailExists_(email) {
  const sh = sheet_(); const last = sh.getLastRow();
  if (last < 2) return false;
  const col = sh.getRange(2, 2, last - 1, 1).getValues();
  const t = String(email).trim().toLowerCase();
  return col.some(function (r) { return String(r[0]).trim().toLowerCase() === t; });
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "check") return json_({ exists: emailExists_(p.email || "") });
  return json_({ ok: true });
}
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (_) { return json_({ error: "bad json" }); }
  const email = String(b.email || "").trim();
  if (!email) return json_({ error: "no email" });
  if (emailExists_(email)) return json_({ duplicate: true });
  const sh = sheet_();
  if (sh.getLastRow() === 0) sh.appendRow(HEADER);
  const a = b.answers || [];
  sh.appendRow([new Date(), email, b.peran || "", b.pengalaman || "", b.freqTools || "",
    a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9], b.komentar || ""]);
  return json_({ ok: true });
}
```

- [ ] **Step 2: Verifikasi berkas** — `ls -1 deploy/uat_apps_script.gs` → path tercetak. (Deploy + uji curl manual oleh peneliti.)

- [ ] **Step 3: Commit** — `git add deploy/uat_apps_script.gs && git commit -m "docs(uat): Apps Script doPost/doGet + panduan deploy"`

---

## Task 4: Frontend — tipe, klien API, daftar item SUS

**Files:** Modify `gui/src/types.ts`, `gui/src/api.ts`; Create `gui/src/lib/sus.ts`.

**Interfaces — Produces:** `UatPayload`, `UatStep`, `EmailCheck`; `postUat(payload)`, `checkUatEmail(email)`; `SUS_ITEMS` (10), `SCALE_LABELS` (5).

- [ ] **Step 1: Tipe** — Modify `gui/src/types.ts`, tambahkan di akhir:
```ts
export interface UatPayload {
    consent: true; email: string; peran: string; pengalaman: string;
    freqTools: string; answers: number[]; komentar: string;
}
export interface EmailCheck { exists: boolean; soft?: boolean; }
export type UatStep = "welcome" | "consent" | "about" | "confirm" | "rate" | "done";
```

- [ ] **Step 2: Klien API** — Modify `gui/src/api.ts`: tambahkan import tipe `UatPayload, EmailCheck` ke blok `import type { ... } from "./types";`, lalu tambahkan fungsi di akhir:
```ts
export async function checkUatEmail(email: string): Promise<EmailCheck> {
    try {
        return parseJsonSafe<EmailCheck>(await fetch(`${BASE}/api/uat/check?email=${encodeURIComponent(email)}`));
    } catch {
        return { exists: false, soft: true };
    }
}

export async function postUat(payload: UatPayload): Promise<{ ok?: true; duplicate?: true; error?: string }> {
    const res = await fetch(`${BASE}/api/uat`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (res.status === 409) return { duplicate: true };
    if (!res.ok) {
        const err = await parseJsonSafe<ApiError>(res).catch(() => null);
        return { error: err?.error || `Gagal mengirim (HTTP ${res.status}).` };
    }
    return { ok: true };
}
```

- [ ] **Step 3: Daftar item** — Create `gui/src/lib/sus.ts`:
```ts
// sus.ts — 10 item SUS (redaksi Indonesia tervalidasi, Sharfina & Santoso 2016).
// Skoring TIDAK dihitung di frontend (dilakukan peneliti dari Google Sheet).
export const SUS_ITEMS: string[] = [
    "Saya berpikir akan menggunakan sistem ini lagi.",
    "Saya merasa sistem ini rumit untuk digunakan.",
    "Saya merasa sistem ini mudah digunakan.",
    "Saya membutuhkan bantuan dari orang lain atau teknisi dalam menggunakan sistem ini.",
    "Saya merasa fitur-fitur sistem ini berjalan dengan semestinya.",
    "Saya merasa ada banyak hal yang tidak konsisten (tidak serasi) pada sistem ini.",
    "Saya merasa orang lain akan memahami cara menggunakan sistem ini dengan cepat.",
    "Saya merasa sistem ini membingungkan.",
    "Saya merasa tidak ada hambatan dalam menggunakan sistem ini.",
    "Saya perlu membiasakan diri terlebih dahulu sebelum menggunakan sistem ini.",
];
export const SCALE_LABELS: string[] = ["Sangat Tidak Setuju","Tidak Setuju","Netral","Setuju","Sangat Setuju"];
```

- [ ] **Step 4: Verifikasi tipe (isolasi)** — `cd gui && npx tsc --noEmit 2>&1 | grep -E "src/(types|api|lib/sus)\.ts" || echo "CLEAN"` → `CLEAN`.

- [ ] **Step 5: Commit** — `git add gui/src/types.ts gui/src/api.ts gui/src/lib/sus.ts && git commit -m "feat(uat): tipe, klien API, daftar item SUS"`

---

## Task 5: Frontend — SusItem, SusScale, UatProgress

**Files:** Create `gui/src/components/uat/{SusItem,SusScale,UatProgress}.tsx`.

**Interfaces — Consumes** `SUS_ITEMS`,`SCALE_LABELS` (Task 4). **Produces** `<SusItem index text value onChange/>`, `<SusScale answers onChange/>`, `<UatProgress steps current/>`.

- [ ] **Step 1: SusItem** — Create `gui/src/components/uat/SusItem.tsx`:
```tsx
import { motion } from "framer-motion";
import { SCALE_LABELS } from "../../lib/sus";

interface Props { index: number; text: string; value: number | null; onChange: (v: number) => void; }

export function SusItem({ index, text, value, onChange }: Props) {
    return (
        <fieldset className="susitem">
            <legend className="susitem__text"><span className="susitem__num">{index + 1}.</span> {text}</legend>
            <div className="susitem__scale" role="radiogroup" aria-label={text}>
                {SCALE_LABELS.map((label, i) => {
                    const v = i + 1; const active = value === v;
                    return (
                        <button key={v} type="button" role="radio" aria-checked={active} aria-label={`${v} - ${label}`}
                            className={`dot${active ? " dot--on" : ""}`} onClick={() => onChange(v)}>
                            {active && (<motion.span className="dot__fill" layoutId={`susfill-${index}`}
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />)}
                            <span className="dot__n">{v}</span>
                        </button>
                    );
                })}
            </div>
            <div className="susitem__ends"><span>{SCALE_LABELS[0]}</span><span>{SCALE_LABELS[4]}</span></div>
        </fieldset>
    );
}
```

- [ ] **Step 2: SusScale** — Create `gui/src/components/uat/SusScale.tsx`:
```tsx
import { motion } from "framer-motion";
import { SUS_ITEMS } from "../../lib/sus";
import { SusItem } from "./SusItem";

interface Props { answers: (number | null)[]; onChange: (index: number, value: number) => void; }

export function SusScale({ answers, onChange }: Props) {
    const filled = answers.filter((a) => a !== null).length;
    return (
        <div className="susscale">
            <div className="susscale__counter">{filled} dari {SUS_ITEMS.length}</div>
            {SUS_ITEMS.map((text, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.06, 0.5) }}>
                    <SusItem index={i} text={text} value={answers[i]} onChange={(v) => onChange(i, v)} />
                </motion.div>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: UatProgress** — Create `gui/src/components/uat/UatProgress.tsx`:
```tsx
interface Props { steps: string[]; current: number; }
export function UatProgress({ steps, current }: Props) {
    return (
        <div className="uatprog" aria-label="Kemajuan pengisian">
            {steps.map((s, i) => (
                <div key={s} className={`uatprog__step${i <= current ? " is-done" : ""}`}>
                    <span className="uatprog__dot" /><span className="uatprog__label">{s}</span>
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 4: Verifikasi** — `cd gui && npx tsc --noEmit 2>&1 | grep -E "uat/(SusItem|SusScale|UatProgress)\.tsx" || echo "CLEAN"` → `CLEAN`.

- [ ] **Step 5: Commit** — `git add gui/src/components/uat/SusItem.tsx gui/src/components/uat/SusScale.tsx gui/src/components/uat/UatProgress.tsx && git commit -m "feat(uat): komponen skala SUS + progress"`

---

## Task 6: Frontend — Welcome, Consent, Demographics, ThankYou

**Files:** Create `gui/src/components/uat/{UatWelcome,UatConsent,UatDemographics,UatThankYou}.tsx`.

**Interfaces — Consumes** `checkUatEmail` (Task 4). **Produces** komponen langkah + `DemoValue` (diekspor dari UatDemographics).

- [ ] **Step 1: UatWelcome** — Create `gui/src/components/uat/UatWelcome.tsx`:
```tsx
import { motion } from "framer-motion";
export function UatWelcome({ onStart }: { onStart: () => void }) {
    return (
        <div className="uatw">
            <motion.h2 className="uatw__title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                Terima kasih sekali sudah ada di sini!
            </motion.h2>
            <motion.p className="uatw__sub" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}>
                Penilaian Anda sebagai developer menentukan kualitas alat ini. Hanya butuh ±5 menit.
            </motion.p>
            <motion.button className="uat-btn uat-btn--go uatw__start" onClick={onStart}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Mulai →</motion.button>
        </div>
    );
}
```

- [ ] **Step 2: UatConsent** — Create `gui/src/components/uat/UatConsent.tsx`:
```tsx
interface Props { agreed: boolean; onAgreeChange: (v: boolean) => void; onNext: () => void; }
export function UatConsent({ agreed, onAgreeChange, onNext }: Props) {
    return (
        <div className="uatcard">
            <h3 className="uatcard__title">Persetujuan</h3>
            <p className="uatcard__body">
                Kuesioner ini mengukur kemudahan penggunaan sistem. <strong>Alamat email Anda dicatat
                dan dapat ditampilkan dalam laporan penelitian serta sesi sidang</strong> sebagai bukti
                keaslian responden, dan untuk memastikan satu orang mengisi satu kali. Pengisian bersifat
                sukarela. Tidak ada jawaban benar atau salah.
            </p>
            <label className="uatcard__check">
                <input type="checkbox" checked={agreed} onChange={(e) => onAgreeChange(e.target.checked)} />
                <span>Saya memahami dan bersedia mengisi secara sukarela.</span>
            </label>
            <button className="uat-btn uat-btn--go" disabled={!agreed} onClick={onNext}>Lanjut →</button>
        </div>
    );
}
```

- [ ] **Step 3: UatDemographics** — Create `gui/src/components/uat/UatDemographics.tsx`:
```tsx
import { useState } from "react";
import { checkUatEmail } from "../../api";

export interface DemoValue { email: string; peran: string; pengalaman: string; freqTools: string; }
interface Props { value: DemoValue; onChange: (v: DemoValue) => void; onNext: () => void; }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UatDemographics({ value, onChange, onNext }: Props) {
    const [emailState, setEmailState] = useState<"idle" | "checking" | "ok" | "dup">("idle");
    async function onEmailBlur() {
        const email = value.email.trim();
        if (!EMAIL_RE.test(email)) { setEmailState("idle"); return; }
        setEmailState("checking");
        const res = await checkUatEmail(email);
        setEmailState(res.exists ? "dup" : "ok");
    }
    const valid = EMAIL_RE.test(value.email.trim()) && value.peran && value.pengalaman && value.freqTools && emailState !== "dup";
    return (
        <div className="uatcard">
            <h3 className="uatcard__title">Tentang Anda</h3>
            <label className="uatfield">
                <span>Email</span>
                <input type="email"
                    className={`uatinput${emailState === "dup" ? " uatinput--err shake" : ""}${emailState === "ok" ? " uatinput--ok" : ""}`}
                    value={value.email} onChange={(e) => { onChange({ ...value, email: e.target.value }); setEmailState("idle"); }}
                    onBlur={onEmailBlur} placeholder="nama@wika.co.id" />
                {emailState === "dup" && <span className="uatfield__err">Email ini sudah pernah mengisi.</span>}
                {emailState === "ok" && <span className="uatfield__ok">✓</span>}
            </label>
            <label className="uatfield"><span>Peran / jabatan</span>
                <select className="uatinput" value={value.peran} onChange={(e) => onChange({ ...value, peran: e.target.value })}>
                    <option value="">— pilih —</option><option>Backend Developer</option><option>Frontend Developer</option>
                    <option>Fullstack Developer</option><option>Lead Developer</option><option>QA / Tester</option><option>Lainnya</option>
                </select>
            </label>
            <label className="uatfield"><span>Pengalaman PHP/Laravel</span>
                <select className="uatinput" value={value.pengalaman} onChange={(e) => onChange({ ...value, pengalaman: e.target.value })}>
                    <option value="">— pilih —</option><option>&lt; 1 tahun</option><option>1-3 tahun</option><option>3-5 tahun</option><option>&gt; 5 tahun</option>
                </select>
            </label>
            <label className="uatfield"><span>Frekuensi memakai tools code review</span>
                <select className="uatinput" value={value.freqTools} onChange={(e) => onChange({ ...value, freqTools: e.target.value })}>
                    <option value="">— pilih —</option><option>Tidak pernah</option><option>Kadang</option><option>Sering</option><option>Sangat sering</option>
                </select>
            </label>
            <button className="uat-btn uat-btn--go" disabled={!valid} onClick={onNext}>Lanjut →</button>
        </div>
    );
}
```

- [ ] **Step 4: UatThankYou** — Create `gui/src/components/uat/UatThankYou.tsx`:
```tsx
import { motion, useReducedMotion } from "framer-motion";
export function UatThankYou({ onHome }: { onHome: () => void }) {
    const reduce = useReducedMotion();
    return (
        <div className="uatthanks">
            {!reduce && (<motion.div className="uatthanks__spark" initial={{ opacity: 0.9, scale: 0.6 }}
                animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: 1.0, ease: "easeOut" }} />)}
            <motion.h2 className="uatthanks__title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                Selesai — terima kasih, kontribusi Anda berarti.
            </motion.h2>
            <p className="uatthanks__sub">Masukan Anda membantu menyempurnakan alat ini.</p>
            <button className="uat-btn uat-btn--go" onClick={onHome}>Kembali ke Beranda</button>
        </div>
    );
}
```

- [ ] **Step 5: Verifikasi** — `cd gui && npx tsc --noEmit 2>&1 | grep -E "uat/(UatWelcome|UatConsent|UatDemographics|UatThankYou)\.tsx" || echo "CLEAN"` → `CLEAN`.

- [ ] **Step 6: Commit** — `git add gui/src/components/uat/UatWelcome.tsx gui/src/components/uat/UatConsent.tsx gui/src/components/uat/UatDemographics.tsx gui/src/components/uat/UatThankYou.tsx && git commit -m "feat(uat): langkah welcome, consent, demografi, terima kasih"`

---

## Task 7: Frontend — UatView + integrasi App + CTA

**Files:** Create `gui/src/components/uat/UatView.tsx`; Modify `gui/src/App.tsx`.

**Interfaces — Consumes** komponen Task 5–6, `postUat` (Task 4), `DemoValue` (Task 6), `UatStep` (Task 4). **Produces** `<UatView onExit/>`.

- [ ] **Step 1: UatView** — Create `gui/src/components/uat/UatView.tsx`:
```tsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { postUat } from "../../api";
import type { UatStep } from "../../types";
import { UatWelcome } from "./UatWelcome";
import { UatConsent } from "./UatConsent";
import { UatDemographics, type DemoValue } from "./UatDemographics";
import { SusScale } from "./SusScale";
import { UatThankYou } from "./UatThankYou";
import { UatProgress } from "./UatProgress";

const STEPS = ["Persetujuan", "Tentang Anda", "Konfirmasi", "Penilaian"];

export function UatView({ onExit }: { onExit: () => void }) {
    const [step, setStep] = useState<UatStep>("welcome");
    const [agreed, setAgreed] = useState(false);
    const [demo, setDemo] = useState<DemoValue>({ email: "", peran: "", pengalaman: "", freqTools: "" });
    const [confirmed, setConfirmed] = useState(false);
    const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") onExit(); }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onExit]);

    const stepIndex: Record<UatStep, number> = { welcome: -1, consent: 0, about: 1, confirm: 2, rate: 3, done: 3 };
    const allFilled = answers.every((a) => a !== null);

    async function submit() {
        setSending(true); setError(null);
        const res = await postUat({ consent: true, email: demo.email.trim(), peran: demo.peran,
            pengalaman: demo.pengalaman, freqTools: demo.freqTools, answers: answers as number[], komentar: "" });
        setSending(false);
        if (res.ok) setStep("done");
        else if (res.duplicate) { setError("Email ini sudah pernah mengisi."); setStep("about"); }
        else setError(res.error || "Gagal mengirim. Coba lagi.");
    }

    return (
        <motion.div className="uat" initial={{ clipPath: "inset(100% 0 0 0)" }} animate={{ clipPath: "inset(0% 0 0 0)" }}
            exit={{ clipPath: "inset(100% 0 0 0)" }} transition={{ duration: 0.7, ease: "easeOut" }}>
            <button className="uat__exit" onClick={onExit} aria-label="Kembali">✕ Kembali</button>
            {step !== "welcome" && step !== "done" && <UatProgress steps={STEPS} current={stepIndex[step]} />}
            <div className="uat__stage">
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="uat__panel">
                        {step === "welcome" && <UatWelcome onStart={() => setStep("consent")} />}
                        {step === "consent" && <UatConsent agreed={agreed} onAgreeChange={setAgreed} onNext={() => setStep("about")} />}
                        {step === "about" && <UatDemographics value={demo} onChange={setDemo} onNext={() => setStep("confirm")} />}
                        {step === "confirm" && (
                            <div className="uatcard">
                                <h3 className="uatcard__title">Konfirmasi</h3>
                                <p className="uatcard__body">Sebelum menilai, pastikan Anda sudah: memilih contoh kode,
                                    menjalankannya, membuka temuan, dan melihat asal aturan CTDL/WIKA.</p>
                                <label className="uatcard__check">
                                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                                    <span>Sudah saya coba.</span>
                                </label>
                                <button className="uat-btn uat-btn--go" disabled={!confirmed} onClick={() => setStep("rate")}>Lanjut →</button>
                            </div>
                        )}
                        {step === "rate" && (
                            <div className="uatcard">
                                <h3 className="uatcard__title">Penilaian</h3>
                                <SusScale answers={answers} onChange={(i, v) => setAnswers((p) => p.map((x, j) => (j === i ? v : x)))} />
                                {error && <p className="uat__error">{error}</p>}
                                <button className="uat-btn uat-btn--go" disabled={!allFilled || sending} onClick={submit}>
                                    {sending ? "Mengirim…" : "Kirim Penilaian"}
                                </button>
                            </div>
                        )}
                        {step === "done" && <UatThankYou onHome={onExit} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
```

- [ ] **Step 2: Integrasi App.tsx** — Modify `gui/src/App.tsx`:
  (a) Import: tambahkan `import { AnimatePresence } from "framer-motion";` dan `import { UatView } from "./components/uat/UatView";`.
  (b) State: setelah `const [glossaryOpen, setGlossaryOpen] = useState(false);` tambahkan `const [uatOpen, setUatOpen] = useState(false);`.
  (c) CTA: di dalam `<footer className="foot">...</footer>` TIDAK; sebagai gantinya tambahkan TEPAT SEBELUM `<footer className="foot">`:
```tsx
<div className="uat-cta-wrap">
    <button type="button" className="uat-cta" onClick={() => setUatOpen(true)}>
        Sudah mencoba? Beri Penilaian Anda →
    </button>
</div>
```
  (d) Render overlay: setelah blok `{glossaryOpen && (<GlossaryModal ... />)}`, tambahkan:
```tsx
<AnimatePresence>
    {uatOpen && <UatView onExit={() => setUatOpen(false)} />}
</AnimatePresence>
```

- [ ] **Step 3: Build** — `cd gui && npm run build` → sukses (tsc + vite → dist/).

- [ ] **Step 4: Commit** — `git add gui/src/components/uat/UatView.tsx gui/src/App.tsx && git commit -m "feat(uat): UatView + CTA + integrasi App"`

---

## Task 8: Styles (light theme + overlay navy/emas) + instrumen + E2E

**Files:** Modify `gui/src/styles.css`; Modify (LINTAS REPO) `escm-web-laravel/docs/evaluation/uat_sus_instrumen.md`.

- [ ] **Step 1: Gaya UAT** — Modify `gui/src/styles.css`, tambahkan di AKHIR berkas (gaya UAT self-contained — overlay punya dunia warnanya sendiri navy/emas, tak bergantung var tema terang):
```css
/* ===== UAT (SUS) "red carpet" — overlay navy + emas ===== */
.uat-cta-wrap { display: flex; justify-content: center; margin: 26px 0 8px; }
.uat-cta { position: relative; overflow: hidden; border: none; cursor: pointer; border-radius: 10px;
    padding: 13px 26px; font-weight: 700; font-size: 0.98rem; color: #0d2340;
    background: linear-gradient(90deg, #3f72af, #d8b45a); }
.uat-cta::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); animation: uat-sweep 2.6s ease-in-out infinite; }
.uat-cta:hover::after { animation-play-state: paused; }
@keyframes uat-sweep { to { transform: translateX(100%); } }

.uat { position: fixed; inset: 0; z-index: 60; overflow-y: auto; display: flex; flex-direction: column; align-items: center;
    padding: 28px 18px; color: #eaf1fb;
    background: radial-gradient(900px 600px at 50% 118%, rgba(216,180,90,0.16), transparent 60%),
        linear-gradient(180deg, #0c1f3a, #112d4e); }
.uat__exit { position: absolute; top: 16px; right: 18px; background: transparent; border: 1px solid rgba(234,241,251,0.3);
    color: #cfe0f5; border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.8rem; }
.uat__exit:hover { border-color: #d8b45a; color: #fff; }
.uat__stage { width: 100%; max-width: 640px; margin-top: 44px; }
.uat__panel { width: 100%; }
.uat__error { color: #ffb4ab; font-size: 0.85rem; margin: 8px 0; }

.uat-btn { border: none; border-radius: 9px; padding: 11px 22px; font-weight: 700; font-size: 0.92rem; cursor: pointer; }
.uat-btn--go { background: linear-gradient(90deg, #e6c878, #d8b45a); color: #0d2340; }
.uat-btn--go:disabled { opacity: 0.4; cursor: not-allowed; }

.uatw { text-align: center; padding: 46px 0; }
.uatw__title { font-size: 1.85rem; margin: 0 0 12px; color: #f2e2b6; }
.uatw__sub { color: #c9d8ee; max-width: 46ch; margin: 0 auto 24px; }
.uatw__start { font-size: 1rem; }

.uatprog { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; justify-content: center; }
.uatprog__step { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: rgba(234,241,251,0.55); }
.uatprog__dot { width: 9px; height: 9px; border-radius: 50%; background: rgba(234,241,251,0.25); }
.uatprog__step.is-done { color: #e6c878; }
.uatprog__step.is-done .uatprog__dot { background: #e6c878; }

.uatcard { background: rgba(255,255,255,0.05); border: 1px solid rgba(234,241,251,0.14); border-radius: 12px; padding: 22px; }
.uatcard__title { margin: 0 0 12px; color: #f2e2b6; }
.uatcard__body { color: #d3e0f2; font-size: 0.92rem; }
.uatcard__check { display: flex; gap: 9px; align-items: flex-start; margin: 14px 0; font-size: 0.9rem; }
.uatfield { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; position: relative; }
.uatfield > span { font-size: 0.8rem; color: #b9cbe6; }
.uatinput { background: rgba(255,255,255,0.06); border: 1px solid rgba(234,241,251,0.2); border-radius: 8px;
    color: #eaf1fb; padding: 10px 12px; font-size: 0.9rem; }
.uatinput:focus { outline: none; border-color: #d8b45a; box-shadow: 0 0 0 3px rgba(216,180,90,0.18); }
.uatinput option { color: #0d2340; }
.uatinput--ok { border-color: #5fcf8e; }
.uatinput--err { border-color: #ff7a6b; }
.uatfield__err { color: #ffb4ab; font-size: 0.78rem; }
.uatfield__ok { position: absolute; right: 10px; top: 30px; color: #7be0a4; }
.shake { animation: uat-shake 0.32s; }
@keyframes uat-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

.susscale { position: relative; }
.susscale__counter { position: sticky; top: 0; text-align: right; font-size: 0.76rem; color: #e6c878; padding: 4px 0; }
.susitem { border: 1px solid rgba(234,241,251,0.14); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; background: rgba(255,255,255,0.04); }
.susitem__text { font-size: 0.9rem; padding: 0 0 8px; color: #eaf1fb; }
.susitem__num { color: rgba(234,241,251,0.5); margin-right: 4px; }
.susitem__scale { display: flex; gap: 8px; }
.dot { position: relative; flex: 1; height: 40px; border: 1px solid rgba(234,241,251,0.2); border-radius: 8px;
    background: rgba(255,255,255,0.04); color: rgba(234,241,251,0.65); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.dot--on { border-color: #d8b45a; color: #fff; }
.dot__fill { position: absolute; inset: 0; background: rgba(216,180,90,0.22); border-radius: 8px; }
.dot__n { position: relative; z-index: 1; font-size: 0.82rem; }
.susitem__ends { display: flex; justify-content: space-between; font-size: 0.68rem; color: rgba(234,241,251,0.5); margin-top: 5px; }

.uatthanks { text-align: center; padding: 50px 0; position: relative; }
.uatthanks__spark { position: absolute; left: 50%; top: 28%; width: 120px; height: 120px; margin-left: -60px; border-radius: 50%;
    background: radial-gradient(circle, rgba(216,180,90,0.55), transparent 70%); pointer-events: none; }
.uatthanks__title { font-size: 1.5rem; margin: 0 0 10px; color: #f2e2b6; }
.uatthanks__sub { color: #c9d8ee; margin-bottom: 22px; }

@media (prefers-reduced-motion: reduce) {
    .uat-cta::after { animation: none; }
}
```

- [ ] **Step 2: Update instrumen (LINTAS REPO)** — Modify `escm-web-laravel/docs/evaluation/uat_sus_instrumen.md`:
  (a) Ganti kalimat pada Bagian 1: `> Pengisian bersifat **anonim** dan hanya digunakan untuk keperluan penelitian skripsi.` menjadi:
```
> Alamat email Anda **dicatat dan dapat ditampilkan dalam laporan penelitian serta sesi sidang** sebagai bukti keaslian responden, dan untuk memastikan satu orang mengisi satu kali. Pengisian bersifat sukarela.
```
  (b) Pada Bagian 2, tambahkan sebagai item nomor 1 (geser sisanya):
```
1. **Email** (Jawaban singkat, wajib) — untuk verifikasi keunikan & atribusi responden.
```

- [ ] **Step 3: Build + E2E (tanpa Apps Script)** — `cd gui && npm run build` → sukses. Lalu:
```bash
node server/server.mjs > /tmp/uat_e2e.log 2>&1 & SRV=$!; sleep 2
curl -s "http://localhost:8787/api/uat/check?email=x@y.com"; echo ""
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8787/api/uat -H "Content-Type: application/json" -d '{"consent":true,"email":"x@y.com","peran":"a","pengalaman":"b","freqTools":"c","answers":[1,2,3,4,5,1,2,3,4,5]}'
kill $SRV 2>/dev/null
```
Expected: check → `{"exists":false,"soft":true}`; submit → `503`. (Submit ke Sheet sungguhan diverifikasi manual setelah deploy Apps Script + isi `.env`.)

- [ ] **Step 4: Commit** — `git add gui/src/styles.css && git commit -m "feat(uat): gaya red-carpet navy/emas"` (instrumen di repo lain di-commit terpisah oleh peneliti).

---

## Self-Review

**Spec coverage:** storage Apps Script→Sheet → T3; proxy backend+env → T2; tanpa rate-limit/ACCESS_CODE → T2; dedup dua lapis → T2(check)+T3(doPost)+T6(onBlur merah); email eksplisit+informed consent → T6(UatConsent)+T8(instrumen); CTA→overlay → T7; alur 7 langkah → T6–7; guardrails (reduced-motion/Esc/transform-opacity/label) → T5–8; karpet navy/emas → T8; headline verbatim → T6; skor tak ditampilkan → T6 ThankYou; penanganan gagal → T7(submit retry)+T2(503/502); akuntabilitas → T3(timestamp/append)+T8(instrumen). ✔

**Placeholder scan:** tak ada TBD/TODO; semua step kode/uji nyata. ✔

**Type consistency:** `UatPayload/EmailCheck/UatStep` (T4) dipakai api.ts(T4)+UatView(T7); `DemoValue` didefinisikan UatDemographics(T6) & diimpor UatView(T7); `postUat/checkUatEmail` (T4) → T6–7; `validateUatPayload/forwardToAppsScript` (T1) → T2; `SUS_ITEMS/SCALE_LABELS` (T4) → T5. Kelas tombol `uat-btn`/`uat-cta` (T6/T7) didefinisikan di styles T8. ✔
