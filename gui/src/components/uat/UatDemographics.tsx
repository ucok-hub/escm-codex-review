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
