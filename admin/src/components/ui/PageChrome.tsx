import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-panel shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full text-left text-sm">{children}</table>;
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-panel-2/70 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </thead>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td className="px-4 py-12 text-center text-sm text-muted" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  );
}

export function Pagination({
  page,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
}: {
  page: number;
  onPrev: () => void;
  onNext: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-muted">Page {page}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-8 rounded-lg border border-line bg-panel px-3 text-xs font-semibold disabled:opacity-40"
          disabled={disablePrev}
          onClick={onPrev}
        >
          Previous
        </button>
        <button
          type="button"
          className="h-8 rounded-lg border border-line bg-panel px-3 text-xs font-semibold disabled:opacity-40"
          disabled={disableNext}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
