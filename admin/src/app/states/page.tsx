"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError, errorMessage } from "@/lib/api";
import { money } from "@/lib/format";
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
};

export default function StatesPage() {
  const [methods, setMethods] = useState<ServiceMethod[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", timeLabel: "", price: "" });

  const load = async () => {
    try {
      const result = await api<{ methods: ServiceMethod[] }>("/admin/methods?category=DELIVERY_STATE");
      setMethods(result.methods);
      setDrafts(
        Object.fromEntries(
          result.methods.map((method) => [
            method.id,
            {
              name: method.name,
              timeLabel: method.timeLabel,
              price: method.price,
            },
          ])
        )
      );
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Could not load Delivery State destinations"));
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
          ...patch,
        },
      };
    });
  };

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const price = parsePrice(draft.price);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price greater than 0");
      return;
    }
    setSaving(id);
    setError(null);
    setNotice(null);
    try {
      await api(`/admin/methods/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name.trim(),
          timeLabel: draft.timeLabel.trim(),
          price,
        }),
      });
      setNotice(`${draft.name.trim() || "State"} saved`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not save state"));
    } finally {
      setSaving(null);
    }
  };

  const remove = async (method: ServiceMethod) => {
    const ok = window.confirm(`Delete ${method.name}? Riders will no longer see this destination.`);
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
        setError(errorMessage(err, "Could not delete state"));
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
      setError(errorMessage(err, "Could not update state"));
    }
  };

  const create = async () => {
    const name = form.name.trim();
    const timeLabel = form.timeLabel.trim();
    const price = parsePrice(form.price);
    if (name.length < 2) {
      setError("Enter a state name");
      return;
    }
    if (timeLabel.length < 2) {
      setError("Enter an ETA, like 1-2 days");
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
          category: "DELIVERY_STATE",
          name,
          timeLabel,
          price,
          vehicleType: "MOTORCYCLE",
        }),
      });
      setForm({ name: "", timeLabel: "", price: "" });
      setNotice(`${name} added`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not create state"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">States</h2>
        <p className="text-sm text-muted">
          Price and ETA riders pay for Delivery State from Banadir to each destination. Hide a state to take it off the rider app.
        </p>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-raac">{notice}</p> : null}

      <section className="mb-6 rounded-xl border border-line bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold">Add destination</h3>
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <input
            className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
            placeholder="State name"
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          />
          <input
            className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
            placeholder="ETA · 1-2 days"
            value={form.timeLabel}
            onChange={(e) => setForm((current) => ({ ...current, timeLabel: e.target.value }))}
          />
          <div className="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-3">
            <span className="text-muted">$</span>
            <input
              className="w-full bg-transparent py-2 text-sm outline-none"
              placeholder="12.00"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-raac px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            {creating ? "Adding…" : "Add state"}
          </button>
        </form>
      </section>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Destination</th>
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
                      className="mr-3 text-xs font-semibold text-raac"
                      disabled={saving === method.id || deleting === method.id}
                      onClick={() => void save(method.id)}
                    >
                      {saving === method.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="text-xs font-semibold text-danger"
                      disabled={deleting === method.id || saving === method.id}
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
