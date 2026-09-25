"use client";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { money, vehicleLabel, when } from "@/lib/format";
import type { VehicleRow } from "@/lib/types";
import Link from "next/link";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

export function VehicleViewModal({
  open,
  vehicle,
  onClose,
}: {
  open: boolean;
  vehicle: VehicleRow | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vehicle"
      description="Full vehicle and driver personal record"
      width="lg"
      footer={
        <>
          {vehicle ? (
            <Link
              href={`/drivers?q=${encodeURIComponent(vehicle.phone)}`}
              className="mr-auto text-xs font-semibold text-raac hover:text-raac-strong"
            >
              Open driver
            </Link>
          ) : null}
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {vehicle ? (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold">Vehicle info</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Row label="Type" value={vehicleLabel(vehicle.vehicleType)} />
              <Row label="Plate" value={vehicle.vehiclePlate} />
              <Row label="Make" value={vehicle.vehicleMake} />
              <Row label="Model" value={vehicle.vehicleModel} />
              <Row label="License" value={vehicle.licenseNumber} />
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Status</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  <StatusBadge value={vehicle.isActive ? "active" : "disabled"} />
                  <StatusBadge value={vehicle.isOnline ? "online" : "offline"} />
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Driver personal info</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Row label="Full name" value={vehicle.driverName} />
              <Row label="First name" value={vehicle.firstName} />
              <Row label="Last name" value={vehicle.lastName} />
              <Row label="Phone" value={vehicle.phone} />
              <Row label="Email" value={vehicle.email} />
              <Row label="Address" value={vehicle.address} />
              <Row label="Rating" value={vehicle.rating} />
              <Row label="Trips" value={vehicle.tripCount} />
              <Row label="Wallet" value={money(vehicle.todayBalance)} />
              <Row label="Joined" value={when(vehicle.createdAt)} />
            </dl>
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
