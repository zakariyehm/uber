"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import { VEHICLE_TYPES, vehicleLabel } from "@/lib/format";
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
  address: string;
  vehicleType: "" | "MOTORCYCLE" | "BICYCLE";
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  licenseNumber: string;
};

const emptyForm = (): FormState => ({
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  address: "",
  vehicleType: "",
  vehiclePlate: "",
  vehicleMake: "",
  vehicleModel: "",
  licenseNumber: "",
});

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function AddVehicleModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    name: string;
    phone: string;
    password: string;
    vehicleType: string;
    vehiclePlate: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setError(null);
    setCreated(null);
    setCreating(false);
  }, [open]);

  const canSubmit =
    Boolean(form.phone.trim()) &&
    form.password.length >= 6 &&
    Boolean(form.vehicleType) &&
    !creating;

  const addVehicle = async () => {
    if (!form.vehicleType) {
      setError("Choose motorcycle or bicycle");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const vehicle = await api<{ name: string; phone: string; vehicleType?: string; vehiclePlate?: string }>(
        "/admin/vehicles",
        {
          method: "POST",
          body: JSON.stringify({
            firstName: form.firstName.trim() || undefined,
            lastName: form.lastName.trim() || undefined,
            phone: form.phone.trim(),
            password: form.password,
            address: form.address.trim() || undefined,
            vehicleType: form.vehicleType,
            vehiclePlate: form.vehiclePlate.trim() || undefined,
            vehicleMake: form.vehicleMake.trim() || undefined,
            vehicleModel: form.vehicleModel.trim() || undefined,
            licenseNumber: form.licenseNumber.trim() || undefined,
          }),
        }
      );
      setCreated({
        name: vehicle.name,
        phone: vehicle.phone,
        password: form.password,
        vehicleType: vehicle.vehicleType || form.vehicleType,
        vehiclePlate: vehicle.vehiclePlate || form.vehiclePlate,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "Could not add vehicle"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={created ? "Vehicle added" : "Add vehicle"}
      description={
        created
          ? "Share these driver credentials. The password is shown once."
          : "Add a fleet vehicle and the personal driver who will use it."
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
            <Button variant="primary" disabled={!canSubmit} onClick={() => void addVehicle()}>
              {creating ? "Adding…" : "Add"}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="rounded-xl border border-raac/25 bg-raac-dim px-4 py-4">
          <p className="text-sm font-medium text-ink">
            {created.name === "—" ? "Driver" : created.name} · {vehicleLabel(created.vehicleType)}
            {created.vehiclePlate ? ` · ${created.vehiclePlate}` : ""}
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Phone</dt>
              <dd className="mt-1 font-mono text-base font-semibold">{created.phone}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Password</dt>
              <dd className="mt-1 font-mono text-base font-semibold">{created.password}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Vehicle type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_TYPES.map((type) => {
                const selected = form.vehicleType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, vehicleType: type.id }))}
                    className={`rounded-xl border px-3 py-3 text-left ${
                      selected
                        ? "border-raac bg-raac-dim ring-2 ring-raac/20"
                        : "border-line bg-panel-2 hover:border-muted"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Plate">
              <TextInput
                placeholder="Optional"
                value={form.vehiclePlate}
                onChange={(e) => setForm((c) => ({ ...c, vehiclePlate: e.target.value }))}
              />
            </Field>
            <Field label="License">
              <TextInput
                placeholder="Optional"
                value={form.licenseNumber}
                onChange={(e) => setForm((c) => ({ ...c, licenseNumber: e.target.value }))}
              />
            </Field>
            <Field label="Make">
              <TextInput
                placeholder="Honda"
                value={form.vehicleMake}
                onChange={(e) => setForm((c) => ({ ...c, vehicleMake: e.target.value }))}
              />
            </Field>
            <Field label="Model">
              <TextInput
                placeholder="CB125"
                value={form.vehicleModel}
                onChange={(e) => setForm((c) => ({ ...c, vehicleModel: e.target.value }))}
              />
            </Field>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Driver personal info
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <TextInput
                value={form.firstName}
                onChange={(e) => setForm((c) => ({ ...c, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last name">
              <TextInput
                value={form.lastName}
                onChange={(e) => setForm((c) => ({ ...c, lastName: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Phone" hint="Somalia format, e.g. 61xxxxxxx">
            <TextInput
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
            />
          </Field>
          <Field label="Address">
            <TextInput
              placeholder="District, neighborhood"
              value={form.address}
              onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
            />
          </Field>
          <Field label="Password">
            <div className="flex gap-2">
              <TextInput
                className="flex-1"
                value={form.password}
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              />
              <Button
                variant="secondary"
                onClick={() => setForm((c) => ({ ...c, password: randomPassword() }))}
              >
                Generate
              </Button>
            </div>
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
