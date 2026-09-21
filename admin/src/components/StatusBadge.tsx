import { statusLabel } from "@/lib/format";

const TONES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-sky-50 text-sky-800 ring-sky-200",
  picked_up: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  in_transit: "bg-blue-50 text-blue-800 ring-blue-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-200",
  HELD: "bg-amber-50 text-amber-800 ring-amber-200",
  COMMITTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  RELEASED: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  NONE: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  FULL: "bg-sky-50 text-sky-800 ring-sky-200",
  NO_SHOW: "bg-rose-50 text-rose-800 ring-rose-200",
  online: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  offline: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  disabled: "bg-rose-50 text-rose-800 ring-rose-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
        TONES[value] || "bg-zinc-100 text-zinc-700 ring-zinc-200"
      }`}
    >
      {statusLabel(value)}
    </span>
  );
}
