"use client";

export type InsightRange = "today" | "week" | "month";

export function RangeTabs({
  value,
  onChange,
}: {
  value: InsightRange;
  onChange: (next: InsightRange) => void;
}) {
  return (
    <div className="flex rounded-lg border border-line bg-panel-2 p-0.5 text-xs font-semibold">
      {(
        [
          ["today", "Today"],
          ["week", "Week"],
          ["month", "Month"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={`rounded-md px-2.5 py-1.5 ${value === id ? "bg-panel text-ink shadow-sm" : "text-muted"}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
