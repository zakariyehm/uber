"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const control =
  "w-full rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-raac focus:bg-panel focus:ring-2 focus:ring-raac/20";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function TextSelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} ${className}`} {...props} />;
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-10 w-full min-w-[220px] rounded-lg border border-line bg-panel px-3 text-sm outline-none transition placeholder:text-muted focus:border-raac focus:ring-2 focus:ring-raac/20 sm:w-64"
      {...props}
    />
  );
}
