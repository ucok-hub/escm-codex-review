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
