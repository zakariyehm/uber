"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput, TextSelect } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import {
  BANADIR_DISTRICTS,
  STORE_CATEGORIES,
  type StoreCategoryId,
  type StoreRow,
} from "@/lib/stores";
import { useEffect, useState } from "react";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

type BranchForm = {
  name: string;
  district: string;
  address: string;
};

type StaffForm = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  branchIndex: number;
};

type FormState = {
  name: string;
  category: StoreCategoryId | "";
  phone: string;
  ownerName: string;
  address: string;
  district: string;
  description: string;
  branches: BranchForm[];
  staff: StaffForm[];
};

const emptyBranch = (district = ""): BranchForm => ({
  name: "",
  district,
  address: "",
});

const emptyStaff = (branchIndex = 0): StaffForm => ({
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  branchIndex,
});

const emptyForm = (): FormState => ({
  name: "",
  category: "",
  phone: "",
  ownerName: "",
  address: "",
  district: "",
  description: "",
  branches: [emptyBranch()],
  staff: [emptyStaff()],
});

type CreatedStaff = {
  name: string;
  phone: string;
  password: string;
};

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
  const [createdStaff, setCreatedStaff] = useState<CreatedStaff[] | null>(null);
  const editing = Boolean(store);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setCreatedStaff(null);
    if (store) {
      setForm({
        name: store.name,
        category: (store.category as StoreCategoryId) || "",
        phone: store.phone || "",
        ownerName: store.ownerName || "",
        address: store.address || "",
        district: store.district || "",
        description: store.description || "",
        branches: [emptyBranch(store.district || "")],
        staff: [emptyStaff()],
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, store]);

  const branchesReady = form.branches.every(
    (row) => row.name.trim() && row.district.trim() && row.address.trim()
  );
  const staffReady = form.staff.every(
    (row) =>
      row.firstName.trim() &&
      row.lastName.trim() &&
      row.phone.trim() &&
      row.password.length >= 6 &&
      row.branchIndex >= 0 &&
      row.branchIndex < form.branches.length
  );
  const canSave =
    form.name.trim().length >= 2 &&
    Boolean(form.category) &&
    form.ownerName.trim() &&
    form.phone.trim() &&
    form.district.trim() &&
    form.address.trim() &&
    (editing || (form.branches.length > 0 && branchesReady && form.staff.length > 0 && staffReady)) &&
    !saving;

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
      phone: form.phone.trim(),
      ownerName: form.ownerName.trim(),
      address: form.address.trim(),
      district: form.district.trim(),
      description: form.description.trim() || undefined,
    };
    try {
      if (store) {
        await api(`/admin/stores/${store.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...body,
            description: form.description.trim() || null,
          }),
        });
        onSaved();
        onClose();
      } else {
        const created = await api<StoreRow & { staff?: CreatedStaff[] }>("/admin/stores", {
          method: "POST",
          body: JSON.stringify({
            ...body,
            branches: form.branches.map((row) => ({
              name: row.name.trim(),
              district: row.district.trim(),
              address: row.address.trim(),
            })),
            staff: form.staff.map((row) => ({
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              phone: row.phone.trim(),
              password: row.password,
              branchIndex: row.branchIndex,
            })),
          }),
        });
        setCreatedStaff(created.staff || []);
        onSaved();
      }
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
      title={createdStaff ? "Store staff ready" : editing ? "Edit store" : "Register store"}
      description={
        createdStaff
          ? "Share these Raac app logins with store staff. They sign in with phone + password."
          : editing
            ? "Update the store profile."
            : "Full store details plus staff who will log in to the Raac app."
      }
      width="xl"
      footer={
        createdStaff ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canSave} onClick={() => void save()}>
              {saving ? "Saving…" : editing ? "Save changes" : "Register store + staff"}
            </Button>
          </>
        )
      }
    >
      {createdStaff ? (
        <div className="space-y-4">
          {createdStaff.map((row) => (
            <div key={row.phone} className="rounded-xl border border-raac/25 bg-raac-dim px-4 py-4">
              <p className="text-sm font-medium text-ink">{row.name}</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Phone</dt>
                  <dd className="mt-1 font-mono text-base font-semibold text-ink">{row.phone}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Password</dt>
                  <dd className="mt-1 font-mono text-base font-semibold text-ink">{row.password}</dd>
                </div>
              </dl>
            </div>
          ))}
          <p className="text-xs text-muted">
            Copy these now — passwords are not shown again after you close this dialog.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Store</p>
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
                  placeholder="Owner full name"
                  value={form.ownerName}
                  onChange={(e) => setForm((c) => ({ ...c, ownerName: e.target.value }))}
                />
              </Field>
              <Field label="Store phone" hint="Somalia, e.g. 61xxxxxxx">
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
                <TextSelect
                  value={form.district}
                  onChange={(e) => setForm((c) => ({ ...c, district: e.target.value }))}
                >
                  <option value="">Select district</option>
                  {BANADIR_DISTRICTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  {form.district && !BANADIR_DISTRICTS.includes(form.district as (typeof BANADIR_DISTRICTS)[number]) ? (
                    <option value={form.district}>{form.district}</option>
                  ) : null}
                </TextSelect>
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
          </div>

          {!editing ? (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Branches
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Assign each staff to a branch. Pickup uses that branch automatically.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setForm((c) => ({
                      ...c,
                      branches: [...c.branches, emptyBranch(c.district)],
                    }))
                  }
                >
                  Add branch
                </Button>
              </div>

              {form.branches.map((row, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Branch {index + 1}</p>
                    {form.branches.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() =>
                          setForm((c) => {
                            const branches = c.branches.filter((_, i) => i !== index);
                            return {
                              ...c,
                              branches,
                              staff: c.staff.map((person) => ({
                                ...person,
                                branchIndex:
                                  person.branchIndex === index
                                    ? 0
                                    : person.branchIndex > index
                                      ? person.branchIndex - 1
                                      : person.branchIndex,
                              })),
                            };
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <Field label="Branch name">
                    <TextInput
                      placeholder="e.g. Hodan branch"
                      value={row.name}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          branches: c.branches.map((item, i) =>
                            i === index ? { ...item, name: e.target.value } : item
                          ),
                        }))
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="District">
                      <TextSelect
                        value={row.district}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            branches: c.branches.map((item, i) =>
                              i === index ? { ...item, district: e.target.value } : item
                            ),
                          }))
                        }
                      >
                        <option value="">Select district</option>
                        {BANADIR_DISTRICTS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </TextSelect>
                    </Field>
                    <Field label="Address">
                      <TextInput
                        placeholder="Street / landmark"
                        value={row.address}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            branches: c.branches.map((item, i) =>
                              i === index ? { ...item, address: e.target.value } : item
                            ),
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!editing ? (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    App staff
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    These people log in to the Raac app with their phone number.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setForm((c) => ({ ...c, staff: [...c.staff, emptyStaff(0)] }))}
                >
                  Add staff
                </Button>
              </div>

              {form.staff.map((row, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Staff {index + 1}</p>
                    {form.staff.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() =>
                          setForm((c) => ({
                            ...c,
                            staff: c.staff.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="First name">
                      <TextInput
                        placeholder="First name"
                        value={row.firstName}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            staff: c.staff.map((item, i) =>
                              i === index ? { ...item, firstName: e.target.value } : item
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Last name">
                      <TextInput
                        placeholder="Last name"
                        value={row.lastName}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            staff: c.staff.map((item, i) =>
                              i === index ? { ...item, lastName: e.target.value } : item
                            ),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Branch" hint="This staff's default pickup">
                    <TextSelect
                      value={String(row.branchIndex)}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          staff: c.staff.map((item, i) =>
                            i === index ? { ...item, branchIndex: Number(e.target.value) } : item
                          ),
                        }))
                      }
                    >
                      {form.branches.map((branch, branchIndex) => (
                        <option key={branchIndex} value={branchIndex}>
                          {branch.name.trim() || `Branch ${branchIndex + 1}`}
                          {branch.district ? ` · ${branch.district}` : ""}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <Field label="Phone / login" hint="This number signs in to the Raac app">
                    <TextInput
                      placeholder="61xxxxxxx"
                      inputMode="tel"
                      value={row.phone}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          staff: c.staff.map((item, i) =>
                            i === index ? { ...item, phone: e.target.value } : item
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Password">
                    <div className="flex gap-2">
                      <TextInput
                        className="flex-1"
                        placeholder="Min. 6 characters"
                        value={row.password}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            staff: c.staff.map((item, i) =>
                              i === index ? { ...item, password: e.target.value } : item
                            ),
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        size="md"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() =>
                          setForm((c) => ({
                            ...c,
                            staff: c.staff.map((item, i) =>
                              i === index ? { ...item, password: randomPassword() } : item
                            ),
                          }))
                        }
                      >
                        Generate
                      </Button>
                    </div>
                  </Field>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
