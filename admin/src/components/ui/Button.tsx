"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-raac text-white hover:bg-raac-strong disabled:bg-raac/40 shadow-sm",
  secondary:
    "border border-line bg-panel text-ink hover:bg-panel-2 disabled:opacity-40",
  ghost: "text-muted hover:bg-panel-2 hover:text-ink disabled:opacity-40",
  danger: "bg-danger text-white hover:bg-red-700 disabled:opacity-40",
  dark: "bg-ink text-white hover:bg-zinc-800 disabled:opacity-40",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs font-semibold",
  md: "h-10 px-4 text-sm font-semibold",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", className = "", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  );
});
