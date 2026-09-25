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

export function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function statusLabel(status?: string | null) {
  return (status || "unknown").replace(/_/g, " ");
}

export const VEHICLE_TYPES = [
  { id: "MOTORCYCLE" as const, label: "Motorcycle" },
  { id: "BICYCLE" as const, label: "Bicycle" },
];

export function vehicleLabel(type?: string | null) {
  return type === "BICYCLE" ? "Bicycle" : "Motorcycle";
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
