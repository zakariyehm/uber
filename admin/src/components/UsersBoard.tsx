"use client";

import { CreateDriverModal } from "@/components/CreateDriverModal";
import { CreateStoreRiderModal } from "@/components/CreateStoreRiderModal";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  EmptyRow,
  PageHeader,
  Pagination,
  Panel,
  Table,
  Td,
  Th,
  THead,
} from "@/components/ui/PageChrome";
import { api, errorMessage } from "@/lib/api";
import { money, VEHICLE_TYPES } from "@/lib/format";
import type { AdminUserRow } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function UsersBoard({ role }: { role: "DRIVER" | "RIDER" }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ users: AdminUserRow[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);
  const [resetUser, setResetUser] = useState<AdminUserRow | null>(null);

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

  const title = role === "DRIVER" ? "Drivers" : "Riders";
  const colSpan = 7;

  const removeDriver = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    setError(null);
    try {
      await api(`/admin/drivers/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not delete driver"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Shell>
      <PageHeader
        title={title}
        subtitle={`${data?.total ?? 0} accounts · ${
          role === "DRIVER"
            ? "Fleet logins and vehicle types"
            : "Personal app signups and admin-issued store riders"
        }`}
        actions={
          <>
            <SearchInput
              placeholder={`Search ${title.toLowerCase()}`}
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
            {role === "DRIVER" ? (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Create driver
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Create store rider
              </Button>
            )}
          </>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <Panel>
        <Table>
          <THead>
            <tr>
              <Th>Person</Th>
              {role === "DRIVER" ? <Th>Type</Th> : <Th>Kind</Th>}
              <Th>Rating</Th>
              <Th>Trips</Th>
              <Th>{role === "DRIVER" ? "Today" : "Pending"}</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <tbody>
            {(data?.users || []).map((user) => (
              <tr key={user.id} className="border-t border-line/80 hover:bg-panel-2/50">
                <Td>
                  <p className="font-medium text-ink">{user.name}</p>
                  <p className="text-xs text-muted">{user.phone}</p>
                </Td>
                {role === "DRIVER" ? (
                  <Td>
                    <select
                      className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-xs outline-none focus:border-raac focus:ring-2 focus:ring-raac/20"
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
                  </Td>
                ) : (
                  <Td>
                    {user.riderKind === "STORE" ? (
                      <div>
                        <p className="text-sm font-medium">Store</p>
                        {user.storeId ? (
                          <Link
                            href={`/stores/${user.storeId}`}
                            className="text-xs text-raac hover:text-raac-strong"
                          >
                            {user.storeName || "Open store"}
                          </Link>
                        ) : (
                          <p className="text-xs text-muted">—</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">Personal</p>
                    )}
                  </Td>
                )}
                <Td>{user.rating}</Td>
                <Td>{user.tripCount}</Td>
                <Td className="font-medium tabular-nums">
                  {role === "DRIVER" ? money(user.todayBalance) : money(user.pendingBalance)}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge value={user.isActive ? "active" : "disabled"} />
                    {role === "DRIVER" ? (
                      <StatusBadge value={user.isOnline ? "online" : "offline"} />
                    ) : null}
                  </div>
                </Td>
                <Td className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {role === "DRIVER" && user.isOnline ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void patch(user.id, { forceOffline: true })}
                      >
                        Force offline
                      </Button>
                    ) : null}
                    {role === "DRIVER" || user.riderKind === "STORE" ? (
                      <Button variant="ghost" size="sm" onClick={() => setResetUser(user)}>
                        Reset password
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-raac hover:text-raac-strong"
                      onClick={() => void patch(user.id, { isActive: !user.isActive })}
                    >
                      {user.isActive ? "Disable" : "Enable"}
                    </Button>
                    {role === "DRIVER" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-red-700"
                        onClick={() => setConfirmDelete(user)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
            {!data?.users.length ? (
              <EmptyRow colSpan={colSpan} message={`No ${title.toLowerCase()} yet.`} />
            ) : null}
          </tbody>
        </Table>
      </Panel>

      <Pagination
        page={page}
        disablePrev={page <= 1}
        disableNext={(data?.users.length || 0) < 20}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      {role === "DRIVER" ? (
        <CreateDriverModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setPage(1);
            void load();
          }}
        />
      ) : (
        <CreateStoreRiderModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setPage(1);
            void load();
          }}
        />
      )}

      <ResetPasswordModal
        open={Boolean(resetUser)}
        user={resetUser}
        onClose={() => setResetUser(null)}
      />

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete driver?"
        description="Removes this fleet login. This cannot be undone."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={Boolean(deleting)}
            >
              Cancel
            </Button>
            <Button variant="danger" disabled={Boolean(deleting)} onClick={() => void removeDriver()}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        {confirmDelete ? (
          <p className="text-sm text-ink">
            <span className="font-semibold">{confirmDelete.name}</span> · {confirmDelete.phone}
          </p>
        ) : null}
      </Modal>
    </Shell>
  );
}
