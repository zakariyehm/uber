"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreFormModal } from "@/components/StoreFormModal";
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
import {
  STORE_CATEGORIES,
  storeCategoryLabel,
  type StoreRow,
} from "@/lib/stores";
import { useEffect, useState } from "react";

export default function StoresPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ stores: StoreRow[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StoreRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      const result = await api<{ stores: StoreRow[]; total: number }>(`/admin/stores?${params}`);
      setData(result);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Could not load stores"));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, page]);

  const patchActive = async (store: StoreRow) => {
    try {
      await api(`/admin/stores/${store.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !store.isActive }),
      });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not update store"));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await api(`/admin/stores/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not delete store"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Shell>
      <PageHeader
        title="Stores"
        subtitle={`${data?.total ?? 0} registered shops · Grocery, coffee, pharmacy, and more`}
        actions={
          <>
            <select
              className="h-10 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-raac focus:ring-2 focus:ring-raac/20"
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
            >
              <option value="">All types</option>
              {STORE_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <SearchInput
              placeholder="Search stores"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Register store
            </Button>
          </>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <Panel>
        <Table>
          <THead>
            <tr>
              <Th>Store</Th>
              <Th>Type</Th>
              <Th>Contact</Th>
              <Th>Location</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <tbody>
            {(data?.stores || []).map((store) => (
              <tr key={store.id} className="border-t border-line/80 hover:bg-panel-2/50">
                <Td>
                  <p className="font-medium text-ink">{store.name}</p>
                  {store.description ? (
                    <p className="max-w-[220px] truncate text-xs text-muted">{store.description}</p>
                  ) : null}
                </Td>
                <Td>
                  <span className="text-sm">{storeCategoryLabel(store.category)}</span>
                </Td>
                <Td>
                  <p>{store.ownerName || "—"}</p>
                  <p className="text-xs text-muted">{store.phone || "—"}</p>
                </Td>
                <Td>
                  <p>{store.district || "—"}</p>
                  <p className="max-w-[180px] truncate text-xs text-muted">{store.address || ""}</p>
                </Td>
                <Td>
                  <StatusBadge value={store.isActive ? "active" : "disabled"} />
                </Td>
                <Td className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(store);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-raac hover:text-raac-strong"
                      onClick={() => void patchActive(store)}
                    >
                      {store.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-red-700"
                      onClick={() => setConfirmDelete(store)}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
            {!data?.stores.length ? (
              <EmptyRow colSpan={6} message="No stores registered yet." />
            ) : null}
          </tbody>
        </Table>
      </Panel>

      <Pagination
        page={page}
        disablePrev={page <= 1}
        disableNext={(data?.stores.length || 0) < 20}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      <StoreFormModal
        open={formOpen}
        store={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setPage(1);
          void load();
        }}
      />

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete store?"
        description="This removes the store from the registry. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" disabled={deleting} onClick={() => void remove()}>
              {deleting ? "Deleting…" : "Delete store"}
            </Button>
          </>
        }
      >
        {confirmDelete ? (
          <p className="text-sm text-ink">
            <span className="font-semibold">{confirmDelete.name}</span> ·{" "}
            {storeCategoryLabel(confirmDelete.category)}
          </p>
        ) : null}
      </Modal>
    </Shell>
  );
}
