"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput, TextSelect } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import { storeCategoryLabel, type StoreBranchRow, type StoreRow } from "@/lib/stores";
import { useEffect, useState } from "react";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  storeId: string;
  storeBranchId: string;
};

const emptyForm = (): FormState => ({
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  storeId: "",
  storeBranchId: "",
});

type Props = {
  open: boolean;
  storeId?: string;
  branches?: StoreBranchRow[];
  onClose: () => void;
  onCreated: () => void;
};

export function CreateStoreRiderModal({ open, storeId, branches = [], onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    phone: string;
    password: string;
    name: string;
    storeName: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm(),
      storeId: storeId || "",
      storeBranchId: branches[0]?.id || "",
    });
    setError(null);
    setCreated(null);
    setCreating(false);
    if (!storeId) {
      void api<{ stores: StoreRow[] }>("/admin/stores?limit=50&isActive=true")
        .then((result) => setStores(result.stores || []))
        .catch(() => setStores([]));
    }
  }, [open, storeId]);

  const canSubmit =
    Boolean(form.firstName.trim()) &&
    Boolean(form.lastName.trim()) &&
    Boolean(form.phone.trim()) &&
    form.password.length >= 6 &&
    Boolean(form.storeId) &&
    Boolean(form.storeBranchId) &&
    !creating;

  const createRider = async () => {
    if (!form.storeId) {
      setError("Select a store");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const rider = await api<{
        phone: string;
        name: string;
        storeName?: string;
      }>("/admin/riders", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          password: form.password,
          storeId: form.storeId,
          storeBranchId: form.storeBranchId,
        }),
      });
      setCreated({
        phone: rider.phone,
        password: form.password,
        name: rider.name,
        storeName: rider.storeName || stores.find((s) => s.id === form.storeId)?.name || "Store",
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "Could not create store rider"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={created ? "Store rider ready" : "Create store rider"}
      description={
        created
          ? "Share these credentials with the store staff. They only place orders for their store."
          : "Issue a Raac login for a registered store. Store selection is required."
      }
      width="lg"
      footer={
        created ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canSubmit} onClick={() => void createRider()}>
              {creating ? "Creating…" : "Create rider"}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-raac/25 bg-raac-dim px-4 py-4">
            <p className="text-sm font-medium text-ink">
              {created.name === "—" ? "Store rider" : created.name} · {created.storeName}
            </p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Phone</dt>
                <dd className="mt-1 font-mono text-base font-semibold text-ink">{created.phone}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Password</dt>
                <dd className="mt-1 font-mono text-base font-semibold text-ink">{created.password}</dd>
              </div>
            </dl>
          </div>
          <p className="text-xs text-muted">
            Copy these now — the password is not shown again after you close this dialog.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {storeId ? null : (
            <Field label="Store" hint="Required — this rider can only send as this store">
              <select
                className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-raac focus:ring-2 focus:ring-raac/20"
                value={form.storeId}
                onChange={(e) => setForm((current) => ({ ...current, storeId: e.target.value }))}
              >
                <option value="">Select store…</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} · {storeCategoryLabel(store.category)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <TextInput
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last name">
              <TextInput
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Branch" hint="Pickup will use this branch automatically">
            <TextSelect
              value={form.storeBranchId}
              onChange={(e) => setForm((current) => ({ ...current, storeBranchId: e.target.value }))}
            >
              <option value="">Select branch…</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} · {branch.district}
                </option>
              ))}
            </TextSelect>
          </Field>
          {!branches.length ? (
            <p className="text-sm text-muted">Add a branch on this store first, then create staff.</p>
          ) : null}

          <Field label="Phone / login" hint="Somalia format, e.g. 61xxxxxxx">
            <TextInput
              placeholder="61xxxxxxx"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
            />
          </Field>

          <Field label="Password">
            <div className="flex gap-2">
              <TextInput
                className="flex-1"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              />
              <Button
                variant="secondary"
                size="md"
                className="shrink-0 whitespace-nowrap"
                onClick={() => setForm((current) => ({ ...current, password: randomPassword() }))}
              >
                Generate
              </Button>
            </div>
          </Field>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {!stores.length ? (
            <p className="text-sm text-muted">Register an active store first under Stores.</p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
