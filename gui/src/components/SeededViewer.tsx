// SeededViewer.tsx — panel kode "contoh bermasalah". Patch dipecah PER BERKAS
// jadi TAB yang bisa diklik, supaya jelas ada >1 file yang diperiksa. Tiap tab
// = satu berkas (badge EXP + nama file); isi tab = diff berkas itu (Prism:
// diff+PHP, Fira Code). Dua mode: "hero" (besar, sebelum dijalankan) &
// "collapsible" (di atas hasil).
import { useEffect, useMemo, useRef, useState } from "react";
import type { SeededDataset } from "../types";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-diff";
import "prismjs/plugins/diff-highlight/prism-diff-highlight";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/plugins/diff-highlight/prism-diff-highlight.css";

const SEEDED_TOTAL = 30; // total seeded violations (ground truth).

interface FileTab {
    exp: string;
    file: string;
    content: string;
}

// Pecah tiap patch (bisa multi-file) menjadi blok diff per berkas.
function splitFiles(datasets: SeededDataset[]): FileTab[] {
    const out: FileTab[] = [];
    for (const ds of datasets) {
        const blocks = ds.content
            .split(/(?=^diff --git )/m)
            .filter((s) => s.trim());
        if (blocks.length === 0) {
            out.push({ exp: ds.exp, file: ds.file, content: ds.content });
            continue;
        }
        for (const b of blocks) {
            const m = b.match(/^diff --git a\/.+? b\/(.+)$/m);
            out.push({
                exp: ds.exp,
                file: m ? m[1].trim() : ds.file,
                content: b,
            });
        }
    }
    return out;
}

function baseName(p: string): string {
    const parts = p.split("/");
    return parts[parts.length - 1] || p;
}

export function SeededViewer({
    datasets,
    mode,
    exiting = false,
}: {
    datasets: SeededDataset[];
    mode: "hero" | "collapsible";
    exiting?: boolean;
}) {
    const files = useMemo(() => splitFiles(datasets), [datasets]);
    const [active, setActive] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    // Highlight isi tab aktif (di-remount via key → teks mentah → Prism).
    useEffect(() => {
        if (ref.current) Prism.highlightAllUnder(ref.current);
    }, [active, files]);

    const cur = files[active] || files[0];

    const body = (
        <div className="seeded__body">
            <div className="seeded__tabs" role="tablist">
                {files.map((f, i) => (
                    <button
                        key={i}
                        role="tab"
                        aria-selected={i === active}
                        className={`seeded__tab${i === active ? " is-active" : ""}`}
                        onClick={() => setActive(i)}
                        title={f.file}
                    >
                        <span className="seeded__tabexp">{f.exp}</span>
                        {baseName(f.file)}
                    </button>
                ))}
            </div>
            <div className="seeded__code" ref={ref}>
                {cur && (
                    <pre className="seeded__pre" key={active}>
                        <code className="language-diff-php">{cur.content}</code>
                    </pre>
                )}
            </div>
        </div>
    );

    if (mode === "collapsible") {
        return (
            <details
                className="seeded seeded--collapse"
                id="nav-contoh"
                data-navlabel="Contoh kode"
            >
                <summary className="seeded__summary">
                    <span className="seeded__chev" aria-hidden>
                        ▸
                    </span>
                    Lihat contoh kode bermasalah ({files.length} berkas ·{" "}
                    {SEEDED_TOTAL} kesalahan)
                </summary>
                {body}
            </details>
        );
    }

    return (
        <div
            className={`seeded seeded--hero${exiting ? " seeded--out" : ""}`}
            id="nav-contoh"
            data-navlabel="Contoh kode"
        >
            <div className="seeded__herohead">
                <h2 className="seeded__title">
                    Contoh kode yang sengaja dibuat bermasalah
                </h2>
                <p className="seeded__sub">
                    <b>{files.length} berkas</b> · {SEEDED_TOTAL} kesalahan
                    sengaja ditanam sebagai <b>“kunci jawaban”</b> untuk menguji
                    ketelitian AI. Klik <b>tab berkas</b> untuk melihat isinya,
                    lalu tekan <b>“Tampilkan hasil rekaman”</b> atau{" "}
                    <b>“Periksa ulang dengan AI”</b>.
                </p>
            </div>
            {body}
        </div>
    );
}
