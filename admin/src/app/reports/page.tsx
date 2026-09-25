"use client";

import { OrderCode } from "@/components/OrderCode";
import { RangeTabs, type InsightRange } from "@/components/RangeTabs";
import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { PageHeader, Panel, Table, Td, Th, THead, EmptyRow } from "@/components/ui/PageChrome";
import { api, errorMessage } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { money, vehicleLabel, when } from "@/lib/format";
import type { AnalyticsPayload } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

export default function ReportsPage() {
  const [range, setRange] = useState<InsightRange>("today");
  const [category, setCategory] = useState<"" | "LOCAL" | "STATE">("");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ range });
    if (category) params.set("category", category);
    void api<AnalyticsPayload>(`/admin/analytics?${params}`)
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Could not load reports"));
      });
    return () => {
      cancelled = true;
    };
  }, [range, category]);

  const rows = data?.trips || [];
  const exportRows = useMemo(
    () =>
      rows.map((row) => ({
        order: row.orderId,
        settled: row.settledAt || "",
        pickup: row.pickupLocation,
        dropoff: row.destinationLocation,
        method: row.deliveryMethod,
        vehicle: vehicleLabel(row.vehicleType),
        km: row.distanceKm,
        fare: row.deliveryPrice,
        fee: row.platformFee,
        driverPay: row.driverEarnings,
        settlement: row.settlementType || "",
        customer: row.riderName,
        driver: row.driverName,
      })),
    [rows]
  );

  return (
    <Shell>
      <PageHeader
        title="Reports"
        subtitle={`${rows.length} settled trips in this range`}
        actions={
          <>
            <RangeTabs value={range} onChange={setRange} />
            <div className="flex rounded-lg border border-line bg-panel-2 p-0.5 text-xs font-semibold">
              {(
                [
                  ["", "All"],
                  ["LOCAL", "Moto"],
                  ["STATE", "State"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id || "all"}
                  type="button"
                  className={`rounded-md px-2.5 py-1.5 ${
                    category === id ? "bg-panel text-ink shadow-sm" : "text-muted"
                  }`}
                  onClick={() => setCategory(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={() => downloadCsv(`raac-reports-${range}.csv`, exportRows)}
              disabled={!exportRows.length}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <Panel>
        <Table>
          <THead>
            <tr>
              <Th>Trip</Th>
              <Th>Route</Th>
              <Th>Method</Th>
              <Th>Km / fare</Th>
              <Th>Fee</Th>
              <Th>People</Th>
              <Th>Settlement</Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line/80 hover:bg-panel-2/50">
                <Td>
                  <OrderCode id={row.orderId} href={`/trips/${row.id}`} />
                  <p className="mt-1 text-[11px] text-muted">{when(row.settledAt || row.createdAt)}</p>
                </Td>
                <Td>
                  <p className="max-w-xs truncate">{row.pickupLocation}</p>
                  <p className="max-w-xs truncate text-muted">{row.destinationLocation}</p>
                </Td>
                <Td>
                  <p>{row.deliveryMethod}</p>
                  <p className="text-xs text-muted">{vehicleLabel(row.vehicleType)}</p>
                </Td>
                <Td>
                  <p>{row.distanceKm ? `${row.distanceKm} km` : "—"}</p>
                  <p className="font-medium">{money(row.deliveryPrice)}</p>
                </Td>
                <Td>
                  <p>{money(row.platformFee)}</p>
                  <p className="text-xs text-muted">{money(row.driverEarnings)} driver</p>
                </Td>
                <Td>
                  <p>{row.riderName}</p>
                  <p className="text-xs text-muted">{row.driverName}</p>
                </Td>
                <Td>
                  <StatusBadge value={row.settlementType || row.status} />
                </Td>
              </tr>
            ))}
            {!rows.length ? <EmptyRow colSpan={7} message="No settled trips in this range." /> : null}
          </tbody>
        </Table>
      </Panel>
    </Shell>
  );
}
