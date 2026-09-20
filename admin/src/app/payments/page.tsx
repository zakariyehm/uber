"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderCode } from "@/components/OrderCode";
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
      <PageHeader
        title="Payments"
        subtitle={`Waafi holds + recipient-pays collection · ${data?.total ?? 0} records`}
        actions={
          <select
            className="h-10 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-raac focus:ring-2 focus:ring-raac/20"
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
        }
      />
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      <Panel>
        <Table>
          <THead>
            <tr>
              <Th>Trip</Th>
              <Th>Payer</Th>
              <Th>Amount</Th>
              <Th>Hold</Th>
              <Th>Split</Th>
              <Th>When</Th>
            </tr>
          </THead>
          <tbody>
            {(data?.payments || []).map((row) => (
              <tr key={row.id} className="border-t border-line/80 hover:bg-panel-2/50">
                <Td>
                  <OrderCode id={row.orderId} href={`/trips/${row.id}`} />
                  <p className="text-xs text-muted">
                    {row.riderPhone} · {row.driverName || "no driver"} · {row.tripStatus}
                  </p>
                </Td>
                <Td>
                  <p className="font-medium">{payerLabel(row)}</p>
                  <p className="text-xs text-muted">
                    {row.payerType === "RECIPIENT"
                      ? row.recipientNumber || "—"
                      : row.riderPhone || "—"}
                  </p>
                </Td>
                <Td className="font-medium tabular-nums">{money(row.amount)}</Td>
                <Td>
                  <StatusBadge value={row.status} />
                  <p className="mt-1 text-xs text-muted">{paymentProgress(row)}</p>
                </Td>
                <Td className="text-xs text-muted">
                  {row.openToAllVehicleTypes
                    ? `state ${money(row.stateShare)} · driver ${money(row.driverEarnings)}`
                    : `fee ${money(row.platformFee)} · driver ${money(row.driverEarnings)}`}
                  {row.riderRefundPending ? ` · credit ${money(row.riderRefundPending)}` : ""}
                </Td>
                <Td className="text-xs text-muted">
                  {when(
                    row.committedAt ||
                      row.releasedAt ||
                      row.heldAt ||
                      row.paymentRequestedAt ||
                      null
                  )}
                </Td>
              </tr>
            ))}
            {!data?.payments.length ? (
              <EmptyRow colSpan={6} message="No payments match this filter." />
            ) : null}
          </tbody>
        </Table>
      </Panel>
      <Pagination
        page={page}
        disablePrev={page <= 1}
        disableNext={(data?.payments.length || 0) < 20}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </Shell>
  );
}
