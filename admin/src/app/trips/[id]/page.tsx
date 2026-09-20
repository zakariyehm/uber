"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, errorMessage } from "@/lib/api";
import { OrderCode } from "@/components/OrderCode";
import { money, vehicleLabel, when } from "@/lib/format";
import type { TripRow } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Detail = {
  trip: TripRow & {
    acceptedAt?: string;
    pickedUpAt?: string;
    startedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    cancelledBy?: string;
    cancelReason?: string;
    driverArrivedAt?: string;
    userConfirmedArrivalAt?: string;
    userConfirmedPickupAt?: string;
    userConfirmedDeliveryAt?: string;
    driverEarnings?: string;
    platformFee?: string;
    stateShare?: string;
    riderRefundPending?: string;
    paymentHoldStatus?: string;
    settlementType?: string;
    openToAllVehicleTypes?: boolean;
  };
  rider: { id: string; name: string; phone: string; rating: string | null; pendingBalance: string; isActive: boolean } | null;
  driver: { id: string; name: string; phone: string; rating: string | null; isOnline: boolean; todayBalance: string; isActive: boolean; vehicleType?: string | null } | null;
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const result = await api<Detail>(`/admin/trips/${id}`);
      setData(result);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cancel = async () => {
    if (!confirm("Cancel this trip and release any Waafi hold?")) return;
    setBusy(true);
    try {
      await api(`/admin/trips/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "admin_cancel" }),
      });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const trip = data?.trip;
  const canCancel = trip && !["completed", "cancelled"].includes(trip.status);

  const steps = [
    { label: "Created", at: trip?.createdAt },
    { label: "Accepted", at: trip?.acceptedAt },
    { label: "Driver arrived", at: trip?.driverArrivedAt },
    { label: "Arrival confirmed", at: trip?.userConfirmedArrivalAt },
    { label: "Picked up", at: trip?.pickedUpAt },
    { label: "Pickup confirmed", at: trip?.userConfirmedPickupAt },
    { label: "In transit", at: trip?.startedAt },
    { label: "Completed", at: trip?.completedAt },
    { label: "Rider confirmed", at: trip?.userConfirmedDeliveryAt },
    { label: "Cancelled", at: trip?.cancelledAt },
  ];

  return (
    <Shell>
      <button className="mb-4 text-sm text-muted hover:text-ink" onClick={() => router.back()}>
        ← Back
      </button>
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {!trip ? (
        <p className="text-sm text-muted">Loading trip…</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Trip</p>
              <h2 className="mt-1">
                <OrderCode id={trip.orderId} size="lg" />
              </h2>
              <div className="mt-2 flex gap-2">
                <StatusBadge value={trip.status} />
                <StatusBadge value={trip.paymentHoldStatus || "NONE"} />
              </div>
            </div>
            {canCancel ? (
              <button
                disabled={busy}
                onClick={cancel}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Cancelling…" : "Cancel trip"}
              </button>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-xl border border-line bg-panel p-5 xl:col-span-2">
              <h3 className="text-sm font-semibold">Route</h3>
              <p className="mt-3 text-sm">{trip.pickupLocation}</p>
              <p className="mt-1 text-sm text-muted">{trip.destinationLocation}</p>
              <p className="mt-4 text-xs text-muted">
                {trip.deliveryMethod} · {vehicleLabel(trip.vehicleType)} · {money(trip.deliveryPrice)}
              </p>
              <div className="mt-6 space-y-3">
                {steps
                  .filter((step) => step.at)
                  .map((step) => (
                    <div key={step.label} className="flex items-center justify-between text-sm">
                      <span>{step.label}</span>
                      <span className="text-muted">{when(step.at)}</span>
                    </div>
                  ))}
              </div>
              {trip.cancelReason ? (
                <p className="mt-4 text-sm text-danger">
                  Cancelled by {trip.cancelledBy}: {trip.cancelReason}
                </p>
              ) : null}
            </section>

            <div className="space-y-6">
              <section className="rounded-xl border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">Fare split</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><dt>Fare</dt><dd>{money(trip.deliveryPrice)}</dd></div>
                  {trip.openToAllVehicleTypes ? (
                    <>
                      <div className="flex justify-between">
                        <dt>Driver</dt>
                        <dd>{money(trip.driverEarnings)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Delivery State</dt>
                        <dd>{money(trip.stateShare)}</dd>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><dt>Platform</dt><dd>{money(trip.platformFee)}</dd></div>
                      <div className="flex justify-between"><dt>Driver</dt><dd>{money(trip.driverEarnings)}</dd></div>
                    </>
                  )}
                  <div className="flex justify-between"><dt>Rider credit</dt><dd>{money(trip.riderRefundPending)}</dd></div>
                  <div className="flex justify-between"><dt>Settlement</dt><dd>{trip.settlementType || "NONE"}</dd></div>
                </dl>
              </section>
              <section className="rounded-xl border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">People</h3>
                <p className="mt-3 text-sm">
                  Rider · {data?.rider?.name || "—"}
                  <span className="block text-xs text-muted">{data?.rider?.phone}</span>
                </p>
                <p className="mt-3 text-sm">
                  Driver · {data?.driver?.name || trip.driverName || "—"}
                  <span className="block text-xs text-muted">
                    {data?.driver?.phone}
                    {data?.driver?.vehicleType ? ` · ${vehicleLabel(data.driver.vehicleType)}` : ""}
                  </span>
                </p>
                <Link href="/trips" className="mt-4 inline-block text-xs text-raac">
                  All trips
                </Link>
              </section>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
