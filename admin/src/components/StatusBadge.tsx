import { statusLabel } from "@/lib/format";

const TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  in_transit: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  HELD: "bg-amber-100 text-amber-800",
  COMMITTED: "bg-emerald-100 text-emerald-800",
  RELEASED: "bg-zinc-100 text-zinc-700",
  NONE: "bg-zinc-100 text-zinc-700",
  FULL: "bg-emerald-100 text-emerald-800",
  NO_SHOW: "bg-rose-100 text-rose-800",
  online: "bg-emerald-100 text-emerald-800",
  offline: "bg-zinc-100 text-zinc-600",
  active: "bg-emerald-100 text-emerald-800",
  disabled: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        TONES[value] || "bg-zinc-100 text-zinc-700"
      }`}
    >
      {statusLabel(value)}
    </span>
  );
}
