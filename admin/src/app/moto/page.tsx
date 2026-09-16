"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError, errorMessage } from "@/lib/api";
import { money, VEHICLE_TYPES } from "@/lib/format";
import type { ServiceMethod } from "@/lib/types";
import { useEffect, useState } from "react";

function parsePrice(raw: string) {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

type Draft = {
  name: string;
  timeLabel: string;
  price: string;
  vehicleType: string;
};

export default function MotoPage() {
  const [methods, setMethods] = useState<ServiceMethod[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    timeLabel: "",
    price: "",
    vehicleType: "MOTORCYCLE" as "MOTORCYCLE" | "BICYCLE",
  });

  const load = async () => {
    try {
      const result = await api<{ methods: ServiceMethod[] }>("/admin/methods?category=MOTO");
      setMethods(result.methods);
      setDrafts(
        Object.fromEntries(
          result.methods.map((method) => [
            method.id,
            {
              name: method.name,
              timeLabel: method.timeLabel,
              price: method.price,
              vehicleType: method.vehicleType || "MOTORCYCLE",
            },
          ])
        )
      );
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Could not load Moto methods"));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((current) => {
      const existing = current[id];
      const method = methods.find((row) => row.id === id);
      return {
        ...current,
        [id]: {
          name: existing?.name || method?.name || "",
          timeLabel: existing?.timeLabel || method?.timeLabel || "",
          price: existing?.price || method?.price || "",
          vehicleType: existing?.vehicleType || method?.vehicleType || "MOTORCYCLE",
          ...patch,
        },
      };
    });
  };

  const saveAll = async () => {
    const dirty = methods.filter((method) => {
      const draft = drafts[method.id];
      if (!draft) return false;
      return (
        draft.name.trim() !== method.name ||
        draft.timeLabel.trim() !== method.timeLabel ||
        draft.vehicleType !== (method.vehicleType || "MOTORCYCLE") ||
        parsePrice(draft.price) !== Number(method.price)
      );
    });
    if (!dirty.length) {
      setNotice("No changes to save");
      return;
    }
    for (const method of dirty) {
      const draft = drafts[method.id];
      const price = parsePrice(draft.price);
      if (!draft.name.trim() || draft.timeLabel.trim().length < 2 || !Number.isFinite(price) || price <= 0) {
        setError(`Check ${draft.name || method.name}: name, time, and a price greater than 0`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await Promise.all(
        dirty.map((method) => {
          const draft = drafts[method.id];
          return api(`/admin/methods/${method.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              name: draft.name.trim(),
              timeLabel: draft.timeLabel.trim(),
              price: parsePrice(draft.price),
              vehicleType: draft.vehicleType,
            }),
          });
        })
      );
      setNotice(`Saved ${dirty.length} method${dirty.length === 1 ? "" : "s"}`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not save methods"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (method: ServiceMethod) => {
    const ok = window.confirm(`Delete ${method.name}? Riders will no longer see this option.`);
    if (!ok) return;
    setDeleting(method.id);
    setError(null);
    setNotice(null);
    try {
      await api(`/admin/methods/${method.id}`, { method: "DELETE" });
      setMethods((current) => current.filter((row) => row.id !== method.id));
      setNotice(`${method.name} deleted`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setMethods((current) => current.filter((row) => row.id !== method.id));
        setNotice(`${method.name} deleted`);
      } else {
        setError(errorMessage(err, "Could not delete method"));
      }
    } finally {
      setDeleting(null);
      await load();
    }
  };

  const toggle = async (method: ServiceMethod) => {
    try {
      await api(`/admin/methods/${method.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !method.isActive }),
      });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not update method"));
    }
  };

  const create = async () => {
    const name = form.name.trim();
    const timeLabel = form.timeLabel.trim();
    const price = parsePrice(form.price);
    if (name.length < 2) {
      setError("Enter a method name");
      return;
    }
    if (timeLabel.length < 2) {
      setError("Enter an ETA, like 10-15 minutes");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price greater than 0");
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await api("/admin/methods", {
        method: "POST",
        body: JSON.stringify({
          category: "MOTO",
          name,
          timeLabel,
          price,
          vehicleType: form.vehicleType,
        }),
      });
      setForm({ name: "", timeLabel: "", price: "", vehicleType: "MOTORCYCLE" });
      setNotice(`${name} added`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not create method"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Moto</h2>
          <p className="text-sm text-muted">
            Price, ETA, and vehicle type riders see when they choose Moto. Motorcycle orders only go to motorcycle drivers.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveAll()}
          className="rounded-lg bg-raac px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-raac">{notice}</p> : null}

      <section className="mb-6 rounded-xl border border-line bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold">Add Moto method</h3>
        <form
          className="grid gap-3 md:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <input
            className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          />
          <input
            className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
            placeholder="ETA · 10-15 minutes"
            value={form.timeLabel}
            onChange={(e) => setForm((current) => ({ ...current, timeLabel: e.target.value }))}
          />
          <div className="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-3">
            <span className="text-muted">$</span>
            <input
              className="w-full bg-transparent py-2 text-sm outline-none"
              placeholder="1.50"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))}
            />
          </div>
          <select
            className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
            value={form.vehicleType}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                vehicleType: e.target.value as "MOTORCYCLE" | "BICYCLE",
              }))
            }
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-raac px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            {creating ? "Adding…" : "Add method"}
          </button>
        </form>
      </section>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => {
              const draft =
                drafts[method.id] || {
                  name: method.name,
                  timeLabel: method.timeLabel,
                  price: method.price,
                  vehicleType: method.vehicleType || "MOTORCYCLE",
                };
              return (
                <tr key={method.id} className="border-t border-line/70">
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
                      value={draft.name}
                      onChange={(e) => updateDraft(method.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-line bg-panel-2 px-2 py-2 text-sm outline-none"
                      value={draft.vehicleType}
                      onChange={(e) => updateDraft(method.id, { vehicleType: e.target.value })}
                    >
                      {VEHICLE_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
                      value={draft.timeLabel}
                      onChange={(e) => updateDraft(method.id, { timeLabel: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted">$</span>
                      <input
                        className="w-24 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
                        inputMode="decimal"
                        value={draft.price}
                        onChange={(e) => updateDraft(method.id, { price: e.target.value })}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">{money(draft.price)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={method.isActive ? "active" : "disabled"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="mr-3 text-xs text-muted hover:text-ink"
                      onClick={() => void toggle(method)}
                    >
                      {method.isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      className="text-xs font-semibold text-danger"
                      disabled={deleting === method.id || saving}
                      onClick={() => void remove(method)}
                    >
                      {deleting === method.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
