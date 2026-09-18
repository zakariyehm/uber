"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, errorMessage } from "@/lib/api";
import { money, vehicleLabel, VEHICLE_TYPES } from "@/lib/format";
import type { AdminUserRow } from "@/lib/types";
import { useEffect, useState } from "react";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function UsersBoard({ role }: { role: "DRIVER" | "RIDER" }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ users: AdminUserRow[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    vehicleType: "" as "" | "MOTORCYCLE" | "BICYCLE",
  });
  const [created, setCreated] = useState<{ phone: string; password: string; name: string; vehicleType: string } | null>(null);

  const load = async () => {
    try {
      const params = new URLSearchParams({ role, page: String(page), limit: "20" });
      if (q) params.set("q", q);
      const result = await api<{ users: AdminUserRow[]; total: number }>(`/admin/users?${params}`);
      setData(result);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, q, page]);

  const patch = async (
    id: string,
    body: { isActive?: boolean; forceOffline?: boolean; vehicleType?: "MOTORCYCLE" | "BICYCLE" }
  ) => {
    try {
      await api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

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
      setForm({ firstName: "", lastName: "", phone: "", password: "", vehicleType: "" });
      setPage(1);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not create driver"));
    } finally {
      setCreating(false);
    }
  };

  const title = role === "DRIVER" ? "Drivers" : "Riders";

  const removeDriver = async (user: AdminUserRow) => {
    const ok = window.confirm(
      `Delete ${user.name === "—" ? "this driver" : user.name} (${user.phone})? Any live trip will be cancelled and they will lose login access.`
    );
    if (!ok) return;
    setDeleting(user.id);
    setError(null);
    try {
      await api(`/admin/drivers/${user.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not delete driver"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-muted">{data?.total ?? 0} accounts</p>
        </div>
        <input
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none"
          placeholder={`Search ${title.toLowerCase()}`}
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {role === "DRIVER" ? (
        <section className="mb-6 rounded-xl border border-line bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Issue driver login</h3>
              <p className="text-xs text-muted">Drivers cannot sign up. Choose motorcycle or bicycle — they only receive matching offers.</p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-raac"
              onClick={() => setForm((current) => ({ ...current, password: randomPassword() }))}
            >
              Generate password
            </button>
          </div>
          {created ? (
            <p className="mb-3 rounded-lg border border-raac/30 bg-raac-dim px-3 py-2 text-sm">
              Created {created.name === "—" ? "driver" : created.name} · {vehicleLabel(created.vehicleType)} · login{" "}
              <span className="font-semibold">{created.phone}</span> · password{" "}
              <span className="font-mono font-semibold">{created.password}</span>
            </p>
          ) : null}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {VEHICLE_TYPES.map((type) => {
              const selected = form.vehicleType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, vehicleType: type.id }))}
                  className={`rounded-lg border px-3 py-3 text-left text-sm ${
                    selected ? "border-raac bg-raac-dim font-semibold" : "border-line bg-panel-2 text-muted"
                  }`}
                >
                  <span className="block text-ink">{type.label}</span>
                  <span className="text-[11px] text-muted">
                    {type.id === "MOTORCYCLE" ? "Gets Moto motorcycle offers only" : "Gets bicycle offers only"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <input
              className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
            />
            <input
              className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
            />
            <input
              className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
              placeholder="Phone 61xxxxxxx"
              value={form.phone}
              onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
            />
            <input
              className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
            />
            <button
              type="button"
              disabled={creating || !form.phone.trim() || form.password.length < 6 || !form.vehicleType}
              className="rounded-lg bg-raac px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => void createDriver()}
            >
              {creating ? "Creating…" : "Create driver"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Person</th>
              {role === "DRIVER" ? <th className="px-4 py-3">Type</th> : null}
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Trips</th>
              <th className="px-4 py-3">{role === "DRIVER" ? "Today" : "Pending"}</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.users || []).map((user) => (
              <tr key={user.id} className="border-t border-line/70">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted">{user.phone}</p>
                </td>
                {role === "DRIVER" ? (
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-line bg-panel-2 px-2 py-1 text-xs outline-none"
                      value={user.vehicleType || "MOTORCYCLE"}
                      onChange={(e) =>
                        void patch(user.id, {
                          vehicleType: e.target.value as "MOTORCYCLE" | "BICYCLE",
                        })
                      }
                    >
                      {VEHICLE_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ) : null}
                <td className="px-4 py-3">{user.rating}</td>
                <td className="px-4 py-3">{user.tripCount}</td>
                <td className="px-4 py-3">
                  {role === "DRIVER" ? money(user.todayBalance) : money(user.pendingBalance)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge value={user.isActive ? "active" : "disabled"} />
                    {role === "DRIVER" ? (
                      <StatusBadge value={user.isOnline ? "online" : "offline"} />
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {role === "DRIVER" && user.isOnline ? (
                    <button
                      className="mr-2 text-xs text-muted hover:text-ink"
                      onClick={() => void patch(user.id, { forceOffline: true })}
                    >
                      Force offline
                    </button>
                  ) : null}
                  <button
                    className="mr-3 text-xs font-semibold text-raac"
                    onClick={() => void patch(user.id, { isActive: !user.isActive })}
                  >
                    {user.isActive ? "Disable" : "Enable"}
                  </button>
                  {role === "DRIVER" ? (
                    <button
                      className="text-xs font-semibold text-danger"
                      disabled={deleting === user.id}
                      onClick={() => void removeDriver(user)}
                    >
                      {deleting === user.id ? "Deleting…" : "Delete"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="rounded-lg border border-line px-3 py-1 text-sm disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <button className="rounded-lg border border-line px-3 py-1 text-sm" onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </Shell>
  );
}
