"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import { storeCategoryLabel, type StoreRow } from "@/lib/stores";
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
};

const emptyForm = (): FormState => ({
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  storeId: "",
});

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateStoreRiderModal({ open, onClose, onCreated }: Props) {
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
    setForm(emptyForm());
    setError(null);
    setCreated(null);
    setCreating(false);
    void api<{ stores: StoreRow[] }>("/admin/stores?limit=50&isActive=true")
      .then((result) => setStores(result.stores || []))
      .catch(() => setStores([]));
  }, [open]);

  const canSubmit =
    Boolean(form.phone.trim()) &&
    form.password.length >= 6 &&
    Boolean(form.storeId) &&
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
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          phone: form.phone.trim(),
          password: form.password,
          storeId: form.storeId,
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <TextInput
                placeholder="Optional"
                value={form.firstName}
                onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last name">
              <TextInput
                placeholder="Optional"
                value={form.lastName}
                onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
              />
            </Field>
          </div>

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
