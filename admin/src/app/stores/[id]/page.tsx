"use client";

import { KpiCard } from "@/components/KpiCard";
import { OrderCode } from "@/components/OrderCode";
import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreFormModal } from "@/components/StoreFormModal";
import { Button } from "@/components/ui/Button";
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
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Credit balance"
              value={money(store.balance || "0")}
              tone={Number(store.balance || 0) < 0 ? "amber" : "green"}
              hint="Delivery charges · debt allowed"
            />
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
                <h3 className="text-sm font-semibold">Credit ledger</h3>
                <p className="text-xs text-muted">Credits added and delivery charges</p>
              </div>
              <Table>
                <THead>
                  <tr>
                    <Th>When</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Amount</Th>
                    <Th>Credit</Th>
                    <Th>Note / order</Th>
                  </tr>
                </THead>
                <tbody>
                  {(data?.transactions || []).map((txn) => (
                    <tr key={txn.id} className="border-t border-line/80">
                      <Td className="text-xs text-muted">{when(txn.createdAt)}</Td>
                      <Td>
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {txn.type === "DEBIT" ? "Charge" : txn.type === "CREDIT" ? "Credit" : txn.type}
                        </span>
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
                    <EmptyRow colSpan={6} message="No credit ledger entries yet." />
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

        </>
      )}
    </Shell>
  );
}
