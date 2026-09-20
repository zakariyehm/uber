"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import { vehicleLabel, VEHICLE_TYPES } from "@/lib/format";
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
  vehicleType: "" | "MOTORCYCLE" | "BICYCLE";
};

const emptyForm = (): FormState => ({
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  vehicleType: "",
});

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateDriverModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    phone: string;
    password: string;
    name: string;
    vehicleType: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setError(null);
    setCreated(null);
    setCreating(false);
  }, [open]);

  const canSubmit =
    Boolean(form.phone.trim()) && form.password.length >= 6 && Boolean(form.vehicleType) && !creating;

  const createDriver = async () => {
    if (!form.vehicleType) {
      setError("Choose motorcycle or bicycle");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const driver = await api<{ phone: string; name: string; vehicleType?: string }>("/admin/drivers", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          phone: form.phone.trim(),
          password: form.password,
          vehicleType: form.vehicleType,
        }),
      });
      setCreated({
        phone: driver.phone,
        password: form.password,
        name: driver.name,
        vehicleType: driver.vehicleType || form.vehicleType,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "Could not create driver"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={created ? "Driver ready" : "Create driver"}
      description={
        created
          ? "Share these credentials with the driver. They cannot sign up themselves."
          : "Issue a login for a new fleet driver. They only receive matching vehicle offers."
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
            <Button variant="primary" disabled={!canSubmit} onClick={() => void createDriver()}>
              {creating ? "Creating…" : "Create driver"}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-raac/25 bg-raac-dim px-4 py-4">
            <p className="text-sm font-medium text-ink">
              {created.name === "—" ? "Driver account" : created.name} · {vehicleLabel(created.vehicleType)}
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
                    onClick={() => setForm((current) => ({ ...current, vehicleType: type.id }))}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-raac bg-raac-dim ring-2 ring-raac/20"
                        : "border-line bg-panel-2 hover:border-muted"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-ink">{type.label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {type.id === "MOTORCYCLE"
                        ? "Motorcycle offers only"
                        : "Bicycle offers only"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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

          <Field label="Phone" hint="Somalia format, e.g. 61xxxxxxx">
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
        </div>
      )}
    </Modal>
  );
}
