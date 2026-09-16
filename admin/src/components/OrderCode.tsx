import { formatOrderCode } from "@/lib/format";
import Link from "next/link";

export function OrderCode({
  id,
  href,
  size = "sm",
}: {
  id: string;
  href?: string;
  size?: "sm" | "lg";
}) {
  const code = formatOrderCode(id);
  const className =
    size === "lg"
      ? "font-mono text-2xl font-semibold tracking-[0.16em] text-ink"
      : "inline-flex rounded-md bg-panel-2 px-2 py-0.5 font-mono text-[12px] font-semibold tracking-[0.14em] text-raac";

  if (href) {
    return (
      <Link href={href} className={`${className} hover:opacity-80`}>
        {code}
      </Link>
    );
  }

  return <span className={className}>{code}</span>;
}
