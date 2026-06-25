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
