"use client";

import { KpiCard } from "@/components/KpiCard";
import { OrderCode } from "@/components/OrderCode";
import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateStoreRiderModal } from "@/components/CreateStoreRiderModal";
import { StoreFormModal } from "@/components/StoreFormModal";
import { Button } from "@/components/ui/Button";
import { EmptyRow, Panel, Table, Td, Th, THead } from "@/components/ui/PageChrome";
import { api, errorMessage } from "@/lib/api";
import { money, when } from "@/lib/format";
import { BANADIR_DISTRICTS, storeCategoryLabel, type StoreProfile } from "@/lib/stores";
import { Field, TextInput, TextSelect } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StoreProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StoreProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", district: "", address: "" });
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [amountOpen, setAmountOpen] = useState(false);
  const [amountForm, setAmountForm] = useState({ amount: "", note: "" });
  const [amountSaving, setAmountSaving] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

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
              <Button
                variant="ghost"
                onClick={() => {
                  setAmountForm({ amount: "", note: "" });
                  setAmountError(null);
                  setAmountOpen(true);
                }}
              >
                Add amount
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setBranchForm({ name: "", district: store.district || "", address: "" });
                  setBranchError(null);
                  setBranchOpen(true);
                }}
              >
                Add branch
              </Button>
              <Button variant="ghost" onClick={() => setStaffOpen(true)} disabled={!data?.branches?.length}>
                Add staff
              </Button>
              <Button variant="ghost" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Wallet"
              value={money(store.balance || "0")}
              tone={Number(store.balance || 0) < 0 ? "amber" : "green"}
              hint="Top-up balance for store trips"
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
                  <dt className="text-xs uppercase tracking-wide text-muted">App staff</dt>
                  <dd className="mt-0.5">{data?.staff?.length || 0}</dd>
                </div>
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

          <Panel className="mb-6 overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold">Branches</h3>
              <p className="text-xs text-muted">Staff pickup defaults to their assigned branch</p>
            </div>
            <Table>
              <THead>
                <tr>
                  <Th>Branch</Th>
                  <Th>District</Th>
                  <Th>Address</Th>
                </tr>
              </THead>
              <tbody>
                {(data?.branches || []).map((branch) => (
                  <tr key={branch.id} className="border-t border-line/80">
                    <Td className="font-medium">{branch.name}</Td>
                    <Td>{branch.district}</Td>
                    <Td className="text-sm">{branch.address}</Td>
                  </tr>
                ))}
                {!data?.branches?.length ? (
                  <EmptyRow colSpan={3} message="Add a branch, then assign staff to it." />
                ) : null}
              </tbody>
            </Table>
          </Panel>

          <Panel className="mb-6 overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold">App staff</h3>
              <p className="text-xs text-muted">These accounts log in to the Raac app with phone + password</p>
            </div>
            <Table>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Phone / login</Th>
                  <Th>Branch</Th>
                  <Th>Status</Th>
                </tr>
              </THead>
              <tbody>
                {(data?.staff || []).map((person) => (
                  <tr key={person.id} className="border-t border-line/80">
                    <Td className="font-medium">{person.name}</Td>
                    <Td className="font-mono text-sm">{person.phone}</Td>
                    <Td>
                      <p className="text-sm">{person.branch?.name || "—"}</p>
                      {person.branch ? (
                        <p className="max-w-[180px] truncate text-xs text-muted">
                          {person.branch.district}, {person.branch.address}
                        </p>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusBadge value={person.isActive ? "active" : "disabled"} />
                    </Td>
                  </tr>
                ))}
                {!data?.staff?.length ? (
                  <EmptyRow colSpan={4} message="No staff yet. Add staff so they can log in to the Raac app." />
                ) : null}
              </tbody>
            </Table>
          </Panel>

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
                  <Th>Staff</Th>
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
                      <p className="text-sm">{order.staffName || "—"}</p>
                      {order.staffPhone ? (
                        <p className="font-mono text-xs text-muted">{order.staffPhone}</p>
                      ) : null}
                    </Td>
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
                  <EmptyRow colSpan={8} message="No store orders yet." />
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

          <CreateStoreRiderModal
            open={staffOpen}
            storeId={store.id}
            branches={data?.branches || []}
            onClose={() => setStaffOpen(false)}
            onCreated={() => void load()}
          />

          <Modal
            open={amountOpen}
            onClose={() => setAmountOpen(false)}
            title="Add amount"
            description={`Add top-up to ${store.name}. This increases the wallet staff use for trips.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setAmountOpen(false)} disabled={amountSaving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={amountSaving || !(Number(amountForm.amount) > 0)}
                  onClick={async () => {
                    const amount = Number(amountForm.amount);
                    if (!Number.isFinite(amount) || amount <= 0) {
                      setAmountError("Enter a positive amount");
                      return;
                    }
                    setAmountSaving(true);
                    setAmountError(null);
                    try {
                      await api(`/admin/stores/${store.id}/credit`, {
                        method: "POST",
                        body: JSON.stringify({
                          amount,
                          note: amountForm.note.trim() || undefined,
                        }),
                      });
                      setAmountOpen(false);
                      await load();
                    } catch (err) {
                      setAmountError(errorMessage(err, "Could not add amount"));
                    } finally {
                      setAmountSaving(false);
                    }
                  }}
                >
                  {amountSaving ? "Saving…" : "Add amount"}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Field label="Amount (USD)" hint="This is added to the store wallet immediately">
                <TextInput
                  placeholder="10.00"
                  inputMode="decimal"
                  value={amountForm.amount}
                  onChange={(e) => setAmountForm((c) => ({ ...c, amount: e.target.value }))}
                />
              </Field>
              <Field label="Note">
                <TextInput
                  placeholder="Optional, e.g. cash top-up"
                  value={amountForm.note}
                  onChange={(e) => setAmountForm((c) => ({ ...c, note: e.target.value }))}
                />
              </Field>
              {amountError ? <p className="text-sm text-danger">{amountError}</p> : null}
            </div>
          </Modal>

          <Modal
            open={branchOpen}
            onClose={() => setBranchOpen(false)}
            title="Add branch"
            description="Staff assigned to this branch will use it as default pickup."
            footer={
              <>
                <Button variant="ghost" onClick={() => setBranchOpen(false)} disabled={branchSaving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={
                    branchSaving ||
                    !branchForm.name.trim() ||
                    !branchForm.district.trim() ||
                    !branchForm.address.trim()
                  }
                  onClick={async () => {
                    setBranchSaving(true);
                    setBranchError(null);
                    try {
                      await api(`/admin/stores/${store.id}/branches`, {
                        method: "POST",
                        body: JSON.stringify({
                          name: branchForm.name.trim(),
                          district: branchForm.district.trim(),
                          address: branchForm.address.trim(),
                        }),
                      });
                      setBranchOpen(false);
                      await load();
                    } catch (err) {
                      setBranchError(errorMessage(err, "Could not add branch"));
                    } finally {
                      setBranchSaving(false);
                    }
                  }}
                >
                  {branchSaving ? "Saving…" : "Add branch"}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Field label="Branch name">
                <TextInput
                  placeholder="e.g. Hodan branch"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm((c) => ({ ...c, name: e.target.value }))}
                />
              </Field>
              <Field label="District">
                <TextSelect
                  value={branchForm.district}
                  onChange={(e) => setBranchForm((c) => ({ ...c, district: e.target.value }))}
                >
                  <option value="">Select district</option>
                  {BANADIR_DISTRICTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Address">
                <TextInput
                  placeholder="Street / landmark"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm((c) => ({ ...c, address: e.target.value }))}
                />
              </Field>
              {branchError ? <p className="text-sm text-danger">{branchError}</p> : null}
            </div>
          </Modal>

        </>
      )}
    </Shell>
  );
}
