"use client";

import { KpiCard } from "@/components/KpiCard";
import { RangeTabs, type InsightRange } from "@/components/RangeTabs";
import { Shell } from "@/components/Shell";
import { PageHeader, Panel } from "@/components/ui/PageChrome";
import { api, errorMessage } from "@/lib/api";
import { money } from "@/lib/format";
import type { AnalyticsPayload } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [range, setRange] = useState<InsightRange>("today");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<AnalyticsPayload>(`/admin/analytics?range=${range}`)
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Could not load analytics"));
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const maxTrips = Math.max(1, ...(data?.series.map((row) => row.trips) || [1]));
  const maxGmv = Math.max(1, ...(data?.series.map((row) => Number(row.gmv)) || [1]));

  return (
    <Shell>
      <PageHeader
        title="Analytics"
        subtitle="Settled volume, method mix, and daily trend"
        actions={
          <>
            <RangeTabs value={range} onChange={setRange} />
            <Link href="/reports" className="text-xs font-semibold text-raac hover:text-raac-strong">
              Open reports
            </Link>
          </>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard tone="green" label="GMV" value={money(data?.kpis.gmv)} hint={`${data?.kpis.settledCount ?? 0} settled`} />
        <KpiCard tone="amber" label="Platform fee" value={money(data?.kpis.platformFee)} hint="Moto share" />
        <KpiCard
          tone="blue"
          label="Driver earnings"
          value={money(data?.kpis.driverEarnings)}
          hint={`${data?.kpis.tripsCreated ?? 0} created`}
        />
        <KpiCard
          tone="rose"
          label="Cancelled / no-show"
          value={`${data?.kpis.cancelled ?? 0} / ${data?.kpis.noShows ?? 0}`}
          hint={`${data?.kpis.newCustomers ?? 0} new customers`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel className="p-4">
          <h3 className="text-sm font-semibold">Trips by day</h3>
          <div className="mt-4 flex h-40 items-end gap-1.5">
            {(data?.series || []).map((row) => (
              <div key={row.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-raac/80"
                  style={{ height: `${Math.max(6, (row.trips / maxTrips) * 100)}%` }}
                  title={`${row.date}: ${row.trips} trips`}
                />
                <span className="text-[10px] text-muted">{row.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <h3 className="text-sm font-semibold">GMV by day</h3>
          <div className="mt-4 flex h-40 items-end gap-1.5">
            {(data?.series || []).map((row) => (
              <div key={row.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-emerald-500/80"
                  style={{ height: `${Math.max(6, (Number(row.gmv) / maxGmv) * 100)}%` }}
                  title={`${row.date}: ${money(row.gmv)}`}
                />
                <span className="text-[10px] text-muted">{row.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold">Method mix</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Method</th>
              <th className="px-4 py-2 font-medium">Trips</th>
              <th className="px-4 py-2 font-medium">GMV</th>
            </tr>
          </thead>
          <tbody>
            {(data?.methods || []).map((row) => (
              <tr key={row.id} className="border-t border-line/70">
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3">{row.trips}</td>
                <td className="px-4 py-3">{money(row.gmv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </Shell>
  );
}
