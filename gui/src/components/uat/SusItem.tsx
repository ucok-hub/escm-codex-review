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
                            className={`sus-dot${active ? " sus-dot--on" : ""}`} onClick={() => onChange(v)}>
                            {active && (<motion.span className="sus-dot__fill" layoutId={`susfill-${index}`}
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />)}
                            <span className="sus-dot__n">{v}</span>
                        </button>
                    );
                })}
            </div>
            <div className="susitem__ends"><span>{SCALE_LABELS[0]}</span><span>{SCALE_LABELS[4]}</span></div>
        </fieldset>
    );
}
