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

type KindFilter = "" | "local" | "state";

function isStateTrip(trip: TripRow) {
  return trip.tripKind === "STATE" || trip.tripKind === "DELIVERY_STATE";
}

export function TripsBoard() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState<KindFilter>("");
  const [method, setMethod] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ trips: TripRow[]; total: number; page: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (kind === "state") params.set("category", "STATE");
        if (kind === "local") params.set("category", "LOCAL");
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (method) params.set("method", method);
        const result = await api<{ trips: TripRow[]; total: number; page: number; methods?: string[] }>(
          `/admin/trips?${params}`
        );
        if (!cancelled) {
          setData(result);
          if (result.methods) setMethods(result.methods);
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
  }, [q, status, method, page, kind]);

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Trips</h2>
          <p className="text-sm text-muted">
            {data?.total ?? 0} jobs · Local Moto and Delivery State
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            value={kind}
            onChange={(e) => {
              setPage(1);
              setMethod("");
              setKind(e.target.value as KindFilter);
            }}
          >
            <option value="">All kinds</option>
            <option value="local">Local</option>
            <option value="state">State</option>
          </select>
          <input
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none"
            placeholder="Search trip"
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
            <option value="">{kind === "state" ? "All destinations" : "All methods"}</option>
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
              <th className="px-4 py-3">Kind</th>
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
            {(data?.trips || []).map((trip) => {
              const state = isStateTrip(trip);
              return (
                <tr key={trip.id} className="border-t border-line/70 hover:bg-panel-2">
                  <td className="px-4 py-3">
                    <OrderCode id={trip.orderId} href={`/trips/${trip.id}`} />
                    <p className="mt-1 text-[11px] text-muted">{when(trip.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-muted">{state ? "State" : "Local"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[220px] truncate">{trip.pickupLocation}</p>
                    <p className="max-w-[220px] truncate text-muted">{trip.destinationLocation}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{trip.deliveryMethod || "—"}</p>
                    <p className="text-xs text-muted">
                      {state ? "Delivery State" : vehicleLabel(trip.vehicleType)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {trip.riderName}
                    <p className="text-xs text-muted">{trip.riderPhone}</p>
                  </td>
                  <td className="px-4 py-3">{trip.driverName || "—"}</td>
                  <td className="px-4 py-3">{money(trip.deliveryPrice)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={trip.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={trip.paymentHoldStatus || "NONE"} />
                  </td>
                </tr>
              );
            })}
            {!data?.trips.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-muted" colSpan={9}>
                  No trips match these filters.
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
