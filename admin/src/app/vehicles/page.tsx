"use client";

import { AddVehicleModal } from "@/components/AddVehicleModal";
import { VehicleViewModal } from "@/components/VehicleViewModal";
import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
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
import { downloadCsv } from "@/lib/csv";
import { vehicleLabel } from "@/lib/format";
import type { VehicleRow } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VehiclesInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [vehicleType, setVehicleType] = useState<"" | "MOTORCYCLE" | "BICYCLE">("");
  const [unplated, setUnplated] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ vehicles: VehicleRow[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState<VehicleRow | null>(null);

  const load = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q) params.set("q", q);
      if (vehicleType) params.set("vehicleType", vehicleType);
      if (unplated) params.set("unplated", "true");
      const result = await api<{ vehicles: VehicleRow[]; total: number }>(`/admin/vehicles?${params}`);
      setData(result);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Could not load vehicles"));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, vehicleType, unplated, page]);

  const openView = async (row: VehicleRow) => {
    try {
      const full = await api<VehicleRow>(`/admin/vehicles/${row.id}`);
      setViewing(full);
    } catch {
      setViewing(row);
    }
  };

  return (
    <Shell>
      <PageHeader
        title="Vehicles"
        subtitle={`${data?.total ?? 0} motorcycle and bicycle units`}
        actions={
          <>
            <div className="flex rounded-lg border border-line bg-panel-2 p-0.5 text-xs font-semibold">
              {(
                [
                  ["", "All"],
                  ["MOTORCYCLE", "Motorcycle"],
                  ["BICYCLE", "Bicycle"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id || "all"}
                  type="button"
                  className={`rounded-md px-2.5 py-1.5 ${
                    vehicleType === id ? "bg-panel text-ink shadow-sm" : "text-muted"
                  }`}
                  onClick={() => {
                    setPage(1);
                    setVehicleType(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant={unplated ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setPage(1);
                setUnplated((v) => !v);
              }}
            >
              Unplated
            </Button>
            <SearchInput
              placeholder="Search plate, driver, phone"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  "raac-vehicles.csv",
                  (data?.vehicles || []).map((row) => ({
                    driver: row.driverName,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    phone: row.phone,
                    email: row.email,
                    address: row.address,
                    type: vehicleLabel(row.vehicleType),
                    plate: row.vehiclePlate,
                    make: row.vehicleMake,
                    model: row.vehicleModel,
                    license: row.licenseNumber,
                    rating: row.rating,
                    trips: row.tripCount,
                    online: row.isOnline ? "online" : "offline",
                  }))
                )
              }
            >
              Export CSV
            </Button>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              Add
            </Button>
          </>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <Panel>
        <Table>
          <THead>
            <tr>
              <Th>Driver</Th>
              <Th>Type</Th>
              <Th>Plate</Th>
              <Th>Make / model</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <tbody>
            {(data?.vehicles || []).map((row) => (
              <tr key={row.id} className="border-t border-line/80 hover:bg-panel-2/50">
                <Td>
                  <p className="font-medium">{row.driverName}</p>
                  <p className="text-xs text-muted">
                    {[row.firstName, row.lastName].filter(Boolean).join(" ") || row.phone}
                  </p>
                </Td>
                <Td>{vehicleLabel(row.vehicleType)}</Td>
                <Td className="font-medium">{row.vehiclePlate || "—"}</Td>
                <Td className="text-muted">
                  {[row.vehicleMake, row.vehicleModel].filter(Boolean).join(" ") || "—"}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge value={row.isActive ? "active" : "disabled"} />
                    <StatusBadge value={row.isOnline ? "online" : "offline"} />
                  </div>
                </Td>
                <Td className="text-right">
                  <Button size="sm" variant="secondary" onClick={() => void openView(row)}>
                    View
                  </Button>
                </Td>
              </tr>
            ))}
            {!data?.vehicles.length ? <EmptyRow colSpan={6} message="No vehicles yet." /> : null}
          </tbody>
        </Table>
      </Panel>

      <Pagination
        page={page}
        disablePrev={page <= 1}
        disableNext={(data?.vehicles.length || 0) < 20}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      <AddVehicleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setPage(1);
          void load();
        }}
      />
      <VehicleViewModal open={Boolean(viewing)} vehicle={viewing} onClose={() => setViewing(null)} />
    </Shell>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-sm text-muted">Loading vehicles…</p>
        </Shell>
      }
    >
      <VehiclesInner />
    </Suspense>
  );
}
