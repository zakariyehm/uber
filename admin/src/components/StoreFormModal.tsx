"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput, TextSelect } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import { STORE_CATEGORIES, type StoreCategoryId, type StoreRow } from "@/lib/stores";
import { useEffect, useState } from "react";

type FormState = {
  name: string;
  category: StoreCategoryId | "";
  phone: string;
  ownerName: string;
  address: string;
  district: string;
  description: string;
};

const emptyForm = (): FormState => ({
  name: "",
  category: "",
  phone: "",
  ownerName: "",
  address: "",
  district: "",
  description: "",
});

type Props = {
  open: boolean;
  store: StoreRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export function StoreFormModal({ open, store, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(store);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (store) {
      setForm({
        name: store.name,
        category: (store.category as StoreCategoryId) || "",
        phone: store.phone || "",
        ownerName: store.ownerName || "",
        address: store.address || "",
        district: store.district || "",
        description: store.description || "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, store]);

  const canSave = form.name.trim().length >= 2 && Boolean(form.category) && !saving;

  const save = async () => {
    if (!form.category) {
      setError("Choose a store type");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      category: form.category,
      phone: form.phone.trim() || undefined,
      ownerName: form.ownerName.trim() || undefined,
      address: form.address.trim() || undefined,
      district: form.district.trim() || undefined,
      description: form.description.trim() || undefined,
    };
    try {
      if (store) {
        await api(`/admin/stores/${store.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...body,
            phone: form.phone.trim() || null,
            ownerName: form.ownerName.trim() || null,
            address: form.address.trim() || null,
            district: form.district.trim() || null,
            description: form.description.trim() || null,
          }),
        });
      } else {
        await api("/admin/stores", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, editing ? "Could not update store" : "Could not create store"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit store" : "Register store"}
      description="Dukaan / shop details saved on the server."
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSave} onClick={() => void save()}>
            {saving ? "Saving…" : editing ? "Save changes" : "Register store"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Store name">
          <TextInput
            placeholder="e.g. Hormuud Mini Mart"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
          />
        </Field>

        <Field label="Type">
          <TextSelect
            value={form.category}
            onChange={(e) =>
              setForm((c) => ({ ...c, category: e.target.value as StoreCategoryId | "" }))
            }
          >
            <option value="">Select type</option>
            {STORE_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </TextSelect>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Owner name">
            <TextInput
              placeholder="Optional"
              value={form.ownerName}
              onChange={(e) => setForm((c) => ({ ...c, ownerName: e.target.value }))}
            />
          </Field>
          <Field label="Phone" hint="Somalia, e.g. 61xxxxxxx">
            <TextInput
              placeholder="61xxxxxxx"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="District">
            <TextInput
              placeholder="e.g. Hodan"
              value={form.district}
              onChange={(e) => setForm((c) => ({ ...c, district: e.target.value }))}
            />
          </Field>
          <Field label="Address">
            <TextInput
              placeholder="Street / landmark"
              value={form.address}
              onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
            />
          </Field>
        </div>

        <Field label="Notes">
          <TextInput
            placeholder="Optional"
            value={form.description}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
