import { statusLabel } from "@/lib/format";

const TONES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  accepted: "bg-sky-500/15 text-sky-300",
  picked_up: "bg-indigo-500/15 text-indigo-300",
  in_transit: "bg-blue-500/15 text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-rose-500/15 text-rose-300",
  HELD: "bg-amber-500/15 text-amber-300",
  COMMITTED: "bg-emerald-500/15 text-emerald-300",
  RELEASED: "bg-zinc-500/20 text-zinc-300",
  NONE: "bg-zinc-500/20 text-zinc-300",
  FULL: "bg-emerald-500/15 text-emerald-300",
  NO_SHOW: "bg-rose-500/15 text-rose-300",
  online: "bg-emerald-500/15 text-emerald-300",
  offline: "bg-zinc-500/20 text-zinc-400",
  active: "bg-emerald-500/15 text-emerald-300",
  disabled: "bg-rose-500/15 text-rose-300",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        TONES[value] || "bg-zinc-500/20 text-zinc-300"
      }`}
    >
      {statusLabel(value)}
    </span>
  );
}
