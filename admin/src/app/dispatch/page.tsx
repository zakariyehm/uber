"use client";

import { DispatchMap } from "@/components/DispatchMap";
import { OrderCode } from "@/components/OrderCode";
import { Shell } from "@/components/Shell";
import { api, errorMessage } from "@/lib/api";
import { formatOrderCode, money, timeAgo, vehicleLabel } from "@/lib/format";
import type { LiveOps, TripRow } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Lane = "all" | "offering" | "ontrip" | "attention";

function isExpired(trip: TripRow) {
  if (!trip.offerExpiresAt) return false;
  return new Date(trip.offerExpiresAt).getTime() < Date.now();
}

function laneFor(trip: TripRow): Exclude<Lane, "all"> {
  if (trip.status === "pending") {
    if (!trip.offeredToDriverId || isExpired(trip)) return "attention";
    return "offering";
  }
  if (trip.status === "accepted" || trip.status === "picked_up" || trip.status === "in_transit") {
    return "ontrip";
  }
  return "attention";
}

function statusCopy(trip: TripRow) {
  if (trip.status === "pending" && isExpired(trip)) return "Offer expired";
  if (trip.status === "pending" && !trip.offeredToDriverId) return "Unassigned";
  if (trip.status === "pending") return "Matching";
  if (trip.status === "accepted") return "En route to pickup";
  if (trip.status === "picked_up") return "Picked up";
  if (trip.status === "in_transit") return "On trip";
  return trip.status.replace(/_/g, " ");
}

function offerSeconds(trip: TripRow) {
  if (!trip.offerExpiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(trip.offerExpiresAt).getTime() - Date.now()) / 1000));
}

function TripCard({
  trip,
  selected,
  onSelect,
  now,
}: {
  trip: TripRow;
  selected: boolean;
  onSelect: () => void;
  now: number;
}) {
  const lane = laneFor(trip);
  const left = offerSeconds(trip);
  void now;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3.5 py-3 text-left transition ${
        selected
          ? "border-ink bg-white shadow-sm ring-2 ring-ink/10"
          : "border-transparent bg-white hover:border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <OrderCode id={trip.orderId} />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                lane === "attention"
                  ? "bg-rose-50 text-rose-700"
                  : lane === "offering"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-sky-50 text-sky-800"
              }`}
            >
              {statusCopy(trip)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {trip.deliveryMethod || "Moto"}
            {trip.distanceKm ? ` · ${trip.distanceKm} km` : ""}
            {trip.durationLabel ? ` · ${trip.durationLabel}` : ""}
            {` · ${timeAgo(trip.createdAt)}`}
          </p>
        </div>
        <p className="shrink-0 text-base font-semibold tabular-nums">{money(trip.deliveryPrice)}</p>
      </div>

      <div className="mt-3 grid grid-cols-[14px_1fr] gap-x-2">
        <div className="flex flex-col items-center pt-1">
          <span className="h-2.5 w-2.5 rounded-full bg-ink" />
          <span className="my-1 w-px flex-1 bg-line" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-ink" />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="truncate text-sm font-medium">{trip.pickupLocation}</p>
          <p className="truncate text-sm text-muted">{trip.destinationLocation}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <p className="truncate text-muted">
          {trip.riderName || "Customer"}
          {trip.driverName ? ` → ${trip.driverName}` : " · Finding driver"}
        </p>
        {lane === "offering" && left > 0 ? (
          <span className="tabular-nums font-semibold text-amber-700">{left}s</span>
        ) : null}
      </div>
    </button>
  );
}

export default function DispatchPage() {
  const [live, setLive] = useState<LiveOps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [lane, setLane] = useState<Lane>("all");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await api<LiveOps>("/admin/live");
        if (!cancelled) {
          setLive(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Could not load dispatch"));
      }
    };
    void load();
    const poll = setInterval(load, 8000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const grouped = useMemo(() => {
    const offering: TripRow[] = [];
    const ontrip: TripRow[] = [];
    const attention: TripRow[] = [];
    for (const trip of live?.trips || []) {
      const col = laneFor(trip);
      if (col === "offering") offering.push(trip);
      else if (col === "ontrip") ontrip.push(trip);
      else attention.push(trip);
    }
    return { offering, ontrip, attention };
  }, [live, now]);

  const visible = useMemo(() => {
    const source =
      lane === "offering"
        ? grouped.offering
        : lane === "ontrip"
          ? grouped.ontrip
          : lane === "attention"
            ? grouped.attention
            : live?.trips || [];
    const query = q.trim().toLowerCase();
    if (!query) return source;
    return source.filter((trip) =>
      [
        trip.orderId,
        formatOrderCode(trip.orderId),
        trip.pickupLocation,
        trip.destinationLocation,
        trip.riderName,
        trip.driverName,
        trip.deliveryMethod,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [grouped, lane, live, q]);

  const selected = (live?.trips || []).find((trip) => trip.id === focusId) || null;
  const motoOnline = (live?.onlineDrivers || []).filter((d) => d.vehicleType !== "BICYCLE").length;
  const bikeOnline = (live?.onlineDrivers || []).filter((d) => d.vehicleType === "BICYCLE").length;
  const available = (live?.onlineDrivers || []).filter((d) => !d.activeTripId).length;
  const clock = new Date(now).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <Shell flush>
      <div className="flex h-full min-h-0 flex-col bg-[#eceff3]">
        <div className="flex items-center justify-between gap-4 border-b border-line bg-white px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Dispatch</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <p className="text-xs text-muted">Mogadishu · Banadir network · {clock}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-panel-2 px-2.5 py-1 font-medium">
              {live?.trips.length ?? 0} jobs
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
              {grouped.offering.length} matching
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-800">
              {grouped.ontrip.length} on trip
            </span>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
              {grouped.attention.length} issues
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
              {available} drivers free
            </span>
          </div>
        </div>

        {error ? (
          <p className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="relative min-h-[320px]">
            <DispatchMap
              trips={live?.trips || []}
              drivers={live?.onlineDrivers || []}
              selectedId={focusId}
              onSelectTrip={setFocusId}
            />
            <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
              <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
                Amber pickup = matching
              </span>
              <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
                Green pin = free driver
              </span>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col border-l border-line bg-[#f6f7f9]">
            <div className="border-b border-line bg-white px-4 py-3">
              <div className="flex gap-1 rounded-xl bg-panel-2 p-1 text-xs font-semibold">
                {(
                  [
                    ["all", "All", live?.trips.length ?? 0],
                    ["offering", "Matching", grouped.offering.length],
                    ["ontrip", "On trip", grouped.ontrip.length],
                    ["attention", "Issues", grouped.attention.length],
                  ] as const
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLane(id)}
                    className={`flex-1 rounded-lg px-2 py-1.5 ${
                      lane === id ? "bg-white text-ink shadow-sm" : "text-muted"
                    }`}
                  >
                    {label}
                    <span className="ml-1 tabular-nums text-[10px] text-muted">{count}</span>
                  </button>
                ))}
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search trip, customer, driver"
                className="mt-3 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-ink focus:bg-white"
              />
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {visible.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  selected={focusId === trip.id}
                  onSelect={() => setFocusId(trip.id)}
                  now={now}
                />
              ))}
              {!visible.length ? (
                <div className="grid h-40 place-items-center text-sm text-muted">No live jobs here.</div>
              ) : null}
            </div>

            {selected ? (
              <div className="border-t border-line bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Selected</p>
                    <p className="truncate text-sm font-semibold">{formatOrderCode(selected.orderId)}</p>
                    <p className="truncate text-xs text-muted">
                      {selected.riderName || "Customer"}
                      {selected.riderPhone ? ` · ${selected.riderPhone}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {selected.driverName || "Unassigned"}
                      {selected.driverPhone ? ` · ${selected.driverPhone}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/trips/${selected.id}`}
                    className="shrink-0 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white"
                  >
                    Open trip
                  </Link>
                </div>
              </div>
            ) : (
              <div className="border-t border-line bg-white px-4 py-3 text-xs text-muted">
                {motoOnline + bikeOnline} online · {motoOnline} moto · {bikeOnline} bicycle · {available} idle
              </div>
            )}
          </aside>
        </div>
      </div>
    </Shell>
  );
}
