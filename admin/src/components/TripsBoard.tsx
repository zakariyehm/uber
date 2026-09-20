"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderCode } from "@/components/OrderCode";
import { SearchInput } from "@/components/ui/Field";
import {
  EmptyRow,
  PageHeader,
  Pagination,
  Panel,
  Table,
  Td,
  Th,
  THead,
} from "@/components/ui/PageChrome";
import { api, errorMessage } from "@/lib/api";
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

const filterClass =
  "h-10 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-raac focus:ring-2 focus:ring-raac/20";

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
      <PageHeader
        title="Trips"
        subtitle={`${data?.total ?? 0} jobs · Local motorcycle and Delivery State`}
        actions={
          <>
            <select
              className={filterClass}
              value={kind}
              onChange={(e) => {
                setPage(1);
                setMethod("");
                setKind(e.target.value as KindFilter);
              }}
            >
              <option value="">All kinds</option>
              <option value="local">Motorcycle</option>
              <option value="state">Delivery State</option>
            </select>
            <SearchInput
              placeholder="Search trip"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
            <select
              className={filterClass}
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
              className={filterClass}
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
          </>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <Panel>
        <Table>
          <THead>
            <tr>
              <Th>Trip</Th>
              <Th>Kind</Th>
              <Th>Route</Th>
              <Th>Method</Th>
              <Th>Rider</Th>
              <Th>Driver</Th>
              <Th>Fare</Th>
              <Th>Status</Th>
              <Th>Pay</Th>
            </tr>
          </THead>
          <tbody>
            {(data?.trips || []).map((trip) => {
              const state = isStateTrip(trip);
              return (
                <tr key={trip.id} className="border-t border-line/80 hover:bg-panel-2/50">
                  <Td>
                    <OrderCode id={trip.orderId} href={`/trips/${trip.id}`} />
                    <p className="mt-1 text-[11px] text-muted">{when(trip.createdAt)}</p>
                  </Td>
                  <Td>
                    <span className="inline-flex rounded-md bg-panel-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                      {state ? "Delivery State" : "Motorcycle"}
                    </span>
                  </Td>
                  <Td>
                    <p className="max-w-[220px] truncate">{trip.pickupLocation}</p>
                    <p className="max-w-[220px] truncate text-muted">{trip.destinationLocation}</p>
                  </Td>
                  <Td>
                    <p>{trip.deliveryMethod || "—"}</p>
                    <p className="text-xs text-muted">
                      {state ? "Delivery State" : vehicleLabel(trip.vehicleType)}
                    </p>
                  </Td>
                  <Td>
                    {trip.riderName}
                    <p className="text-xs text-muted">{trip.riderPhone}</p>
                  </Td>
                  <Td>{trip.driverName || "—"}</Td>
                  <Td className="font-medium tabular-nums">{money(trip.deliveryPrice)}</Td>
                  <Td>
                    <StatusBadge value={trip.status} />
                  </Td>
                  <Td>
                    <StatusBadge value={trip.paymentHoldStatus || "NONE"} />
                  </Td>
                </tr>
              );
            })}
            {!data?.trips.length ? <EmptyRow colSpan={9} message="No trips match these filters." /> : null}
          </tbody>
        </Table>
      </Panel>

      <Pagination
        page={page}
        disablePrev={page <= 1}
        disableNext={(data?.trips.length || 0) < 20}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </Shell>
  );
}
