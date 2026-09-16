"use client";

import { KpiCard } from "@/components/KpiCard";
import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, errorMessage } from "@/lib/api";
import { OrderCode } from "@/components/OrderCode";
import { money, when } from "@/lib/format";
import type { LiveOps, Overview } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CommandPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [live, setLive] = useState<LiveOps | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [ov, lv] = await Promise.all([
          api<Overview>("/admin/overview"),
          api<LiveOps>("/admin/live"),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setLive(lv);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Could not load operations"));
      }
    };
    void load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Shell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Command center</h2>
          <p className="text-sm text-muted">Live snapshot of the Raac network</p>
        </div>
        <p className="text-xs text-muted">Refreshes every 5s</p>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today GMV"
          value={money(overview?.today.gmv)}
          hint={`${overview?.today.settledCount ?? 0} settled trips`}
        />
        <KpiCard label="Platform fee" value={money(overview?.today.platformFee)} hint="8% on completed trips" />
        <KpiCard
          label="Driver earnings"
          value={money(overview?.today.driverEarnings)}
          hint="Today’s wallet total"
        />
        <KpiCard
          label="Live trips"
          value={String(overview?.fleet.liveTrips ?? 0)}
          hint={`${overview?.fleet.pendingOffers ?? 0} offers in rotation`}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Online drivers"
          value={`${overview?.fleet.onlineDrivers ?? 0}`}
          hint={`${overview?.fleet.offlineDrivers ?? 0} offline`}
        />
        <KpiCard
          label="Riders"
          value={String(overview?.allTime.riders ?? 0)}
          hint={`${overview?.today.newRiders ?? 0} new today`}
        />
        <KpiCard
          label="Rider pending credits"
          value={money(overview?.wallets.riderPendingCredits)}
          hint="No-show refunds held"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold">Live trips</h3>
            <Link href="/trips" className="text-xs text-raac">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Trip</th>
                  <th className="px-4 py-2 font-medium">Route</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Driver</th>
                </tr>
              </thead>
              <tbody>
                {(live?.trips || []).slice(0, 12).map((trip) => (
                  <tr key={trip.id} className="border-t border-line/70 hover:bg-panel-2">
                    <td className="px-4 py-3">
                      <OrderCode id={trip.orderId} href={`/trips/${trip.id}`} />
                      <p className="mt-1 text-[11px] text-muted">{when(trip.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-xs truncate">{trip.pickupLocation}</p>
                      <p className="max-w-xs truncate text-muted">{trip.destinationLocation}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={trip.status} />
                    </td>
                    <td className="px-4 py-3">{trip.driverName || "Unassigned"}</td>
                  </tr>
                ))}
                {!live?.trips.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={4}>
                      No live trips
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold">Online fleet</h3>
          </div>
          <ul className="divide-y divide-line/70">
            {(live?.onlineDrivers || []).map((driver) => (
              <li key={driver.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{driver.name}</p>
                  <StatusBadge value="online" />
                </div>
                <p className="text-xs text-muted">
                  {driver.phone} · {driver.rating} ★
                </p>
                <p className="text-xs text-muted">{driver.activeTripId ? "On a trip" : "Available"}</p>
              </li>
            ))}
            {!live?.onlineDrivers.length ? (
              <li className="px-4 py-8 text-center text-sm text-muted">No drivers online</li>
            ) : null}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
