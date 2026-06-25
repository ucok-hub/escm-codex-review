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
