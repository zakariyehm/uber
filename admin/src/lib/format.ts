export function money(value?: string | number | null) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, "") || 0);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function when(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status?: string | null) {
  return (status || "unknown").replace(/_/g, " ");
}

const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function formatOrderCode(orderId?: string | null) {
  const raw = (orderId || "").replace(/^#/, "").trim();
  if (!raw) return "—";
  if (new RegExp(`^[${ORDER_ALPHABET}]{6}$`, "i").test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  const compact = raw
    .toUpperCase()
    .replace(/^ORD[_-]*/, "")
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "A")
    .replace(/[IL]/g, "H")
    .replace(/0/g, "2")
    .replace(/1/g, "3")
    .slice(-6)
    .padStart(6, "2");
  return `#${compact}`;
}
