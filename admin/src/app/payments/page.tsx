"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, errorMessage } from "@/lib/api";
import { OrderCode } from "@/components/OrderCode";
import { money, when } from "@/lib/format";
import { useEffect, useState } from "react";

type PaymentRow = {
  id: string;
  orderId: string;
  amount: string;
  status: string;
  settlementType: string;
  payerType?: string;
  paymentRequested?: boolean;
  paymentRequestedAt?: string | null;
  recipientNumber?: string | null;
  driverEarnings: string | null;
  platformFee: string | null;
  stateShare: string | null;
  riderRefundPending: string | null;
  openToAllVehicleTypes?: boolean;
  waafiTransactionId: string | null;
  heldAt: string | null;
  committedAt: string | null;
  releasedAt: string | null;
  riderPhone: string | null;
  driverName: string | null;
  tripStatus: string;
};

function payerLabel(row: PaymentRow) {
  if (row.payerType === "RECIPIENT") return "Recipient";
  return "Sender";
}

function paymentProgress(row: PaymentRow) {
  if (row.payerType === "RECIPIENT") {
    if (row.status === "COMMITTED") return "Collected from recipient";
    if (row.paymentRequested) return "Driver requested · awaiting Waafi";
    return "Awaiting driver request payment";
  }
  return row.settlementType;
}

export default function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ payments: PaymentRow[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (status) params.set("status", status);
        const result = await api<{ payments: PaymentRow[]; total: number }>(`/admin/payments?${params}`);
        if (!cancelled) {
          setData(result);
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
  }, [status, page]);

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Payments</h2>
          <p className="text-sm text-muted">
            Waafi holds + recipient-pays collection · {data?.total ?? 0} records
          </p>
        </div>
        <select
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All payments</option>
          <option value="NONE">Awaiting (recipient)</option>
          <option value="HELD">Held</option>
          <option value="COMMITTED">Committed</option>
          <option value="RELEASED">Released</option>
        </select>
      </div>
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Payer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Hold</th>
              <th className="px-4 py-3">Split</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {(data?.payments || []).map((row) => (
              <tr key={row.id} className="border-t border-line/70">
                <td className="px-4 py-3">
                  <OrderCode id={row.orderId} href={`/trips/${row.id}`} />
                  <p className="text-xs text-muted">
                    {row.riderPhone} · {row.driverName || "no driver"} · {row.tripStatus}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{payerLabel(row)}</p>
                  <p className="text-xs text-muted">
                    {row.payerType === "RECIPIENT"
                      ? row.recipientNumber || "—"
                      : row.riderPhone || "—"}
                  </p>
                </td>
                <td className="px-4 py-3">{money(row.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={row.status} />
                  <p className="mt-1 text-xs text-muted">{paymentProgress(row)}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {row.openToAllVehicleTypes
                    ? `state ${money(row.stateShare)} · driver ${money(row.driverEarnings)}`
                    : `fee ${money(row.platformFee)} · driver ${money(row.driverEarnings)}`}
                  {row.riderRefundPending ? ` · credit ${money(row.riderRefundPending)}` : ""}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {when(
                    row.committedAt ||
                      row.releasedAt ||
                      row.heldAt ||
                      row.paymentRequestedAt ||
                      null
                  )}
                </td>
              </tr>
            ))}
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
          className="rounded-lg border border-line px-3 py-1 text-sm"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </Shell>
  );
}
