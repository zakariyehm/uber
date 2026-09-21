"use client";

import { KpiCard } from "@/components/KpiCard";
import { OrderCode } from "@/components/OrderCode";
import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreFormModal } from "@/components/StoreFormModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyRow, Panel, Table, Td, Th, THead } from "@/components/ui/PageChrome";
import { api, errorMessage } from "@/lib/api";
import { money, when } from "@/lib/format";
import { storeCategoryLabel, type StoreProfile } from "@/lib/stores";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StoreProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StoreProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [crediting, setCrediting] = useState(false);

  const load = async () => {
    try {
      const result = await api<StoreProfile>(`/admin/stores/${id}`);
      setData(result);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Could not load store"));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitCredit = async () => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive top-up amount");
      return;
    }
    setCrediting(true);
    setError(null);
    try {
      await api(`/admin/stores/${id}/credit`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          note: creditNote.trim() || undefined,
        }),
      });
      setCreditOpen(false);
      setCreditAmount("");
      setCreditNote("");
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not top up balance"));
    } finally {
      setCrediting(false);
    }
  };

  const store = data?.store;
  const stats = data?.stats;

  return (
    <Shell>
      <button className="mb-4 text-sm text-muted hover:text-ink" onClick={() => router.push("/stores")}>
        ← Stores
      </button>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {!store ? (
        <p className="text-sm text-muted">Loading store…</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Store</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{store.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge value={store.isActive ? "active" : "disabled"} />
                <span className="text-sm text-muted">{storeCategoryLabel(store.category)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="primary" onClick={() => setCreditOpen(true)}>
                Top up balance
              </Button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Balance" value={money(store.balance || "0")} tone="green" hint="Prepaid wallet" />
            <KpiCard label="Orders" value={String(stats?.ordersTotal ?? 0)} tone="blue" />
            <KpiCard label="Active" value={String(stats?.active ?? 0)} tone="amber" hint={`${stats?.pending ?? 0} pending`} />
            <KpiCard
              label="Completed"
              value={String(stats?.completed ?? 0)}
              tone="teal"
              hint={`${stats?.cancelled ?? 0} cancelled`}
            />
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-3">
            <Panel className="p-5 xl:col-span-1">
              <h3 className="text-sm font-semibold">Profile</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Owner</dt>
                  <dd className="mt-0.5">{store.ownerName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Phone</dt>
                  <dd className="mt-0.5">{store.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">District</dt>
                  <dd className="mt-0.5">{store.district || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Address</dt>
                  <dd className="mt-0.5">{store.address || "—"}</dd>
                </div>
                {store.description ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Notes</dt>
                    <dd className="mt-0.5 text-muted">{store.description}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Registered</dt>
                  <dd className="mt-0.5 text-muted">{when(store.createdAt)}</dd>
                </div>
              </dl>
            </Panel>

            <Panel className="overflow-hidden xl:col-span-2">
              <div className="border-b border-line px-4 py-3">
                <h3 className="text-sm font-semibold">Transactions</h3>
                <p className="text-xs text-muted">Top-ups and order debits</p>
              </div>
              <Table>
                <THead>
                  <tr>
                    <Th>When</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Amount</Th>
                    <Th>Balance</Th>
                    <Th>Note / order</Th>
                  </tr>
                </THead>
                <tbody>
                  {(data?.transactions || []).map((txn) => (
                    <tr key={txn.id} className="border-t border-line/80">
                      <Td className="text-xs text-muted">{when(txn.createdAt)}</Td>
                      <Td>
                        <span className="text-xs font-semibold uppercase tracking-wide">{txn.type}</span>
                      </Td>
                      <Td>
                        <StatusBadge value={(txn.status || "COMPLETED").toLowerCase()} />
                      </Td>
                      <Td className="tabular-nums">
                        {txn.type === "DEBIT" ? "−" : "+"}
                        {money(txn.amount)}
                      </Td>
                      <Td className="tabular-nums">
                        {txn.status === "PENDING" ? "—" : money(txn.balanceAfter)}
                      </Td>
                      <Td>
                        <p className="text-sm">{txn.note || "—"}</p>
                        {txn.orderId ? (
                          <OrderCode
                            id={txn.orderId}
                            href={txn.deliveryRequestId ? `/trips/${txn.deliveryRequestId}` : undefined}
                            size="sm"
                          />
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                  {!data?.transactions.length ? (
                    <EmptyRow colSpan={6} message="No wallet transactions yet." />
                  ) : null}
                </tbody>
              </Table>
            </Panel>
          </div>

          <Panel className="overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold">Orders</h3>
              <p className="text-xs text-muted">Deliveries sent from this store</p>
            </div>
            <Table>
              <THead>
                <tr>
                  <Th>Order</Th>
                  <Th>Store order</Th>
                  <Th>Branch</Th>
                  <Th>Recipient</Th>
                  <Th>Pay</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Fare</Th>
                </tr>
              </THead>
              <tbody>
                {(data?.orders || []).map((order) => (
                  <tr key={order.id} className="border-t border-line/80 hover:bg-panel-2/50">
                    <Td>
                      <Link href={`/trips/${order.id}`} className="hover:opacity-80">
                        <OrderCode id={order.orderId} />
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">{when(order.createdAt)}</p>
                    </Td>
                    <Td className="text-sm">{order.storeOrderCode || "—"}</Td>
                    <Td>
                      <p className="max-w-[160px] truncate text-sm">{order.storeBranchLocation || "—"}</p>
                    </Td>
                    <Td>
                      <p className="text-sm">{order.recipientName}</p>
                      <p className="max-w-[180px] truncate text-xs text-muted">{order.destinationLocation}</p>
                    </Td>
                    <Td className="text-xs uppercase text-muted">{order.payerType || "—"}</Td>
                    <Td>
                      <StatusBadge value={order.status} />
                    </Td>
                    <Td className="text-right tabular-nums">{money(order.deliveryPrice)}</Td>
                  </tr>
                ))}
                {!data?.orders.length ? (
                  <EmptyRow colSpan={7} message="No store orders yet." />
                ) : null}
              </tbody>
            </Table>
          </Panel>

          <StoreFormModal
            open={editOpen}
            store={store}
            onClose={() => setEditOpen(false)}
            onSaved={() => void load()}
          />

          <Modal
            open={creditOpen}
            onClose={() => setCreditOpen(false)}
            title="Top up store balance"
            description="Credit this store’s prepaid wallet for sender-pay deliveries."
            footer={
              <>
                <Button variant="ghost" onClick={() => setCreditOpen(false)} disabled={crediting}>
                  Cancel
                </Button>
                <Button variant="primary" disabled={crediting} onClick={() => void submitCredit()}>
                  {crediting ? "Saving…" : "Add credit"}
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Amount (USD)
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-raac focus:ring-2 focus:ring-raac/20"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="50.00"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Note (optional)
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-raac focus:ring-2 focus:ring-raac/20"
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  placeholder="Cash deposit / transfer"
                />
              </label>
            </div>
          </Modal>
        </>
      )}
    </Shell>
  );
}
