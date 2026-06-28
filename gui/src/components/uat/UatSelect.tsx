// UatSelect.tsx — dropdown custom selaras tema UAT (navy gelap + emas). Panel
// opsi muncul/hilang dengan fade cepat (framer-motion). Tutup via klik-luar/Esc.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
}

export function UatSelect({
    value,
    onChange,
    options,
    placeholder = "- pilih -",
}: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    function selectOption(opt: string) {
        onChange(opt);
        setOpen(false);
        buttonRef.current?.blur();
    }

    return (
        <div className={`uatsel${open ? " is-open" : ""}`} ref={ref}>
            <button
                ref={buttonRef}
                type="button"
                className={`uatsel__btn${value ? "" : " is-placeholder"}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{value || placeholder}</span>
                <span className="uatsel__chev" aria-hidden>
                    ▾
                </span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.ul
                        className="uatsel__panel"
                        role="listbox"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                    >
                        {options.map((opt) => (
                            <li
                                key={opt}
                                role="option"
                                aria-selected={opt === value}
                                tabIndex={0}
                                className={`uatsel__opt${opt === value ? " is-sel" : ""}`}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    selectOption(opt);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        selectOption(opt);
                                    }
                                }}
                            >
                                {opt}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}
