"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, errorMessage } from "@/lib/api";
import { OrderCode } from "@/components/OrderCode";
import { money, vehicleLabel, when } from "@/lib/format";
import type { TripRow } from "@/lib/types";
import { useEffect, useState } from "react";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function TripsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ trips: TripRow[]; total: number; page: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (method) params.set("method", method);
        const result = await api<{ trips: TripRow[]; total: number; page: number; methods?: string[] }>(
          `/admin/trips?${params}`
        );
        if (!cancelled) {
          setData(result);
          if (result.methods?.length) setMethods(result.methods);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [q, status, method, page]);

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Trips</h2>
          <p className="text-sm text-muted">{data?.total ?? 0} deliveries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none"
            placeholder="Search order, phone, place"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <select
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            value={method}
            onChange={(e) => {
              setPage(1);
              setMethod(e.target.value);
            }}
          >
            <option value="">All types</option>
            {methods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            {STATUSES.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Fare</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pay</th>
            </tr>
          </thead>
          <tbody>
            {(data?.trips || []).map((trip) => (
              <tr key={trip.id} className="border-t border-line/70 hover:bg-panel-2">
                <td className="px-4 py-3">
                  <OrderCode id={trip.orderId} href={`/trips/${trip.id}`} />
                  <p className="mt-1 text-[11px] text-muted">{when(trip.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-[220px] truncate">{trip.pickupLocation}</p>
                  <p className="max-w-[220px] truncate text-muted">{trip.destinationLocation}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{trip.deliveryMethod || "—"}</p>
                  <p className="text-xs text-muted">{vehicleLabel(trip.vehicleType)}</p>
                </td>
                <td className="px-4 py-3">
                  {trip.riderName}
                  <p className="text-xs text-muted">{trip.riderPhone}</p>
                </td>
                <td className="px-4 py-3">{trip.driverName || "—"}</td>
                <td className="px-4 py-3">{money(trip.deliveryPrice)}</td>
                <td className="px-4 py-3"><StatusBadge value={trip.status} /></td>
                <td className="px-4 py-3">
                  <StatusBadge value={trip.paymentHoldStatus || "NONE"} />
                </td>
              </tr>
            ))}
            {!data?.trips.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-muted" colSpan={8}>
                  No trips match these filters
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="rounded-lg border border-line px-3 py-1 text-sm disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-line px-3 py-1 text-sm disabled:opacity-40"
          disabled={(data?.trips.length || 0) < 20}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </Shell>
  );
}
