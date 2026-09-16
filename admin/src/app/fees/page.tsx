"use client";

import { Shell } from "@/components/Shell";
import { api, errorMessage } from "@/lib/api";
import { publishDriverFee } from "@/lib/fee";
import { money, when } from "@/lib/format";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Settings = {
  driverFeePercent: number;
  driverFeeRate: number;
  updatedAt?: string;
  live?: boolean;
};

const SAMPLE = 2.5;

function splitPreview(percent: number) {
  const rate = Number.isFinite(percent) ? percent / 100 : 0;
  const fee = Math.round(SAMPLE * rate * 100) / 100;
  const driver = Math.round((SAMPLE - fee) * 100) / 100;
  return { fee, driver };
}

export default function FeesPage() {
  const [percent, setPercent] = useState("5");
  const [saved, setSaved] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const result = await api<Settings>("/admin/settings");
      setSaved(result);
      setPercent(String(result.driverFeePercent));
      setError(null);
      publishDriverFee(result.driverFeePercent);
    } catch (err) {
      setError(errorMessage(err, "Could not load fee settings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const draftPercent = Number(percent);
  const livePercent = saved?.driverFeePercent ?? 5;
  const dirty =
    Number.isFinite(draftPercent) &&
    Math.round(draftPercent * 100) / 100 !== Math.round(livePercent * 100) / 100;
  const preview = useMemo(() => splitPreview(Number.isFinite(draftPercent) ? draftPercent : 0), [draftPercent]);
  const liveSplit = useMemo(() => splitPreview(livePercent), [livePercent]);

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = Math.round(Number(percent) * 100) / 100;
    if (!Number.isFinite(value) || value < 0 || value > 30) {
      setError("Enter a fee between 0% and 30%");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api<Settings>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ driverFeePercent: value }),
      });
      setSaved(result);
      setPercent(String(result.driverFeePercent));
      publishDriverFee(result.driverFeePercent);
      setNotice(`${result.driverFeePercent}% is live. The next completed trip uses this fee.`);
    } catch (err) {
      setError(errorMessage(err, "Could not save fee"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Fees</h2>
          <p className="text-sm text-muted">
            Change the driver service fee and Save. It goes live immediately.
          </p>
        </div>
        <div className="rounded-full border border-raac/30 bg-raac-dim px-3 py-1 text-xs font-semibold text-raac">
          Live {loading ? "…" : `${livePercent}%`}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-raac">{notice}</p> : null}

      <section className="max-w-xl rounded-xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">Driver service fee</h3>
        <p className="mt-1 text-xs text-muted">
          Applied automatically the moment a trip is completed. No-show fees stay $0.50 with 0% platform cut.
        </p>
        <form className="mt-4" onSubmit={(event) => void save(event)}>
          <div className="flex items-center gap-3">
            <input
              className="w-28 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none ring-raac focus:ring-2"
              inputMode="decimal"
              value={percent}
              onChange={(e) => {
                setPercent(e.target.value);
                setNotice(null);
              }}
              aria-label="Driver fee percent"
            />
            <span className="text-sm text-muted">%</span>
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-lg bg-raac px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {saving ? "Going live…" : dirty ? "Save & go live" : "Save"}
            </button>
          </div>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-line bg-panel-2 px-3 py-3">
            <p className="text-xs text-muted">
              {dirty ? "After save, on a" : "On a"} {money(SAMPLE)} trip
            </p>
            <p className="mt-1 font-semibold">{money(preview.driver)} to driver</p>
          </div>
          <div className="rounded-lg border border-line bg-panel-2 px-3 py-3">
            <p className="text-xs text-muted">Raac keeps</p>
            <p className="mt-1 font-semibold">{money(preview.fee)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-raac/25 bg-raac-dim px-3 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-raac">In effect now</p>
          <p className="mt-1 font-semibold">{livePercent}% service fee</p>
          <p className="mt-1 text-xs text-muted">
            {money(SAMPLE)} trip → {money(liveSplit.driver)} driver · {money(liveSplit.fee)} Raac
          </p>
          {saved?.updatedAt ? (
            <p className="mt-2 text-[11px] text-muted">Went live {when(saved.updatedAt)}</p>
          ) : null}
        </div>
      </section>
    </Shell>
  );
}
