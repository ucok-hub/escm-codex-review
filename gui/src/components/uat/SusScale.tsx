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
