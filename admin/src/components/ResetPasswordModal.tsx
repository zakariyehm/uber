"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import type { AdminUserRow } from "@/lib/types";
import { useEffect, useState } from "react";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

type Props = {
  open: boolean;
  user: AdminUserRow | null;
  onClose: () => void;
};

export function ResetPasswordModal({ open, user, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ phone: string; password: string; name: string } | null>(null);

  const kind = user?.role === "RIDER" ? "rider" : "driver";
  const title = kind === "rider" ? "Reset rider password" : "Reset driver password";

  useEffect(() => {
    if (!open) return;
    setPassword(randomPassword());
    setError(null);
    setDone(null);
    setSaving(false);
  }, [open, user?.id]);

  const save = async () => {
    if (!user) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await api<{ phone: string; password: string; name: string }>(
        `/admin/users/${user.id}/password`,
        {
          method: "POST",
          body: JSON.stringify({ password }),
        }
      );
      setDone({
        phone: result.phone,
        password: result.password,
        name: result.name,
      });
    } catch (err) {
      setError(errorMessage(err, "Could not reset password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? "Password updated" : title}
      description={
        done
          ? `Share the new login with this ${kind}.`
          : user
            ? `Set a new password for ${user.name === "—" ? user.phone : user.name} (${user.phone}).`
            : undefined
      }
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={saving || password.length < 6}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save password"}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="rounded-xl border border-raac/25 bg-raac-dim px-4 py-4">
          <p className="text-sm font-medium text-ink">
            {done.name === "—" ? kind : done.name}
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Phone</dt>
              <dd className="mt-1 font-mono text-base font-semibold text-ink">{done.phone}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                New password
              </dt>
              <dd className="mt-1 font-mono text-base font-semibold text-ink">{done.password}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="New password">
            <div className="flex gap-2">
              <TextInput
                className="flex-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
              <Button
                variant="secondary"
                className="shrink-0 whitespace-nowrap"
                onClick={() => setPassword(randomPassword())}
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
