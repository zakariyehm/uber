const TONES = {
  slate: "border-line bg-panel",
  green: "border-line bg-panel",
  amber: "border-line bg-panel",
  blue: "border-line bg-panel",
  indigo: "border-line bg-panel",
  lime: "border-line bg-panel",
  teal: "border-line bg-panel",
  violet: "border-line bg-panel",
  rose: "border-line bg-panel",
} as const;

const ACCENT: Record<keyof typeof TONES, string> = {
  slate: "bg-zinc-400",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-raac",
  indigo: "bg-indigo-500",
  lime: "bg-lime-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
};

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
    <div className={`relative overflow-hidden rounded-xl border p-4 shadow-sm ${TONES[tone]}`}>
      <span className={`absolute left-0 top-0 h-full w-0.5 ${ACCENT[tone]}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
