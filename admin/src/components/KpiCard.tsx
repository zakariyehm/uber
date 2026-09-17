const TONES = {
  slate: "border-line bg-panel",
  green: "border-emerald-200 bg-emerald-50",
  amber: "border-amber-200 bg-amber-50",
  blue: "border-sky-200 bg-sky-50",
  indigo: "border-indigo-200 bg-indigo-50",
  lime: "border-lime-200 bg-lime-50",
  teal: "border-teal-200 bg-teal-50",
  violet: "border-violet-200 bg-violet-50",
  rose: "border-rose-200 bg-rose-50",
} as const;

export function KpiCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className={`rounded-xl border p-4 ${TONES[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
