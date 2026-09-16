"use client";

import { Shell } from "@/components/Shell";
import { api, errorMessage } from "@/lib/api";
import { publishDriverFee, publishStatePayout } from "@/lib/fee";
import { money, when } from "@/lib/format";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Settings = {
  driverFeePercent: number;
  driverFeeRate: number;
  stateDriverPayout: number;
  updatedAt?: string;
  live?: boolean;
};

const SAMPLE_MOTO = 2.5;
const SAMPLE_STATE = 3;

function splitMotoPreview(percent: number) {
  const rate = Number.isFinite(percent) ? percent / 100 : 0;
  const fee = Math.round(SAMPLE_MOTO * rate * 100) / 100;
  const driver = Math.round((SAMPLE_MOTO - fee) * 100) / 100;
  return { fee, driver };
}

function splitStatePreview(payout: number) {
  const driver = Math.round(Math.min(Math.max(0, payout), SAMPLE_STATE) * 100) / 100;
  const state = Math.round((SAMPLE_STATE - driver) * 100) / 100;
  return { driver, state };
}

export default function FeesPage() {
  const [percent, setPercent] = useState("5");
  const [payout, setPayout] = useState("0.5");
  const [saved, setSaved] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingFee, setSavingFee] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [loading, setLoading] = useState(true);

  const applySettings = (result: Settings) => {
    setSaved(result);
    setPercent(String(result.driverFeePercent));
    setPayout(String(result.stateDriverPayout));
    publishDriverFee(result.driverFeePercent, result.stateDriverPayout);
  };

  const load = async () => {
    try {
      const result = await api<Settings>("/admin/settings");
      applySettings(result);
      setError(null);
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
  const feeDirty =
    Number.isFinite(draftPercent) &&
    Math.round(draftPercent * 100) / 100 !== Math.round(livePercent * 100) / 100;
  const preview = useMemo(
    () => splitMotoPreview(Number.isFinite(draftPercent) ? draftPercent : 0),
    [draftPercent]
  );
  const liveSplit = useMemo(() => splitMotoPreview(livePercent), [livePercent]);

  const draftPayout = Number(payout);
  const livePayout = saved?.stateDriverPayout ?? 0.5;
  const payoutDirty =
    Number.isFinite(draftPayout) &&
    Math.round(draftPayout * 100) / 100 !== Math.round(livePayout * 100) / 100;
  const statePreview = useMemo(
    () => splitStatePreview(Number.isFinite(draftPayout) ? draftPayout : 0),
    [draftPayout]
  );
  const liveStateSplit = useMemo(() => splitStatePreview(livePayout), [livePayout]);

  const saveFee = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = Math.round(Number(percent) * 100) / 100;
    if (!Number.isFinite(value) || value < 0 || value > 30) {
      setError("Enter a fee between 0% and 30%");
      return;
    }
    setSavingFee(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api<Settings>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ driverFeePercent: value }),
      });
      applySettings(result);
      setNotice(`${result.driverFeePercent}% is live. The next completed Moto trip uses this fee.`);
    } catch (err) {
      setError(errorMessage(err, "Could not save fee"));
    } finally {
      setSavingFee(false);
    }
  };

  const savePayout = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = Math.round(Number(payout) * 100) / 100;
    if (!Number.isFinite(value) || value < 0 || value > 50) {
      setError("Enter a driver payout between $0 and $50");
      return;
    }
    setSavingPayout(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api<Settings>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ stateDriverPayout: value }),
      });
      applySettings(result);
      publishStatePayout(result.stateDriverPayout, result.driverFeePercent);
      setNotice(
        `${money(result.stateDriverPayout)} is live. The next completed Delivery State trip pays the driver this amount.`
      );
    } catch (err) {
      setError(errorMessage(err, "Could not save driver payout"));
    } finally {
      setSavingPayout(false);
    }
  };

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Fees</h2>
          <p className="text-sm text-muted">
            Change the Moto service fee or Delivery State driver payout, then Save. Each goes live
            immediately for the next trip.
          </p>
        </div>
        <div className="rounded-full border border-raac/30 bg-raac-dim px-3 py-1 text-xs font-semibold text-raac">
          Live {loading ? "…" : `${livePercent}% · ${money(livePayout)}`}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-raac">{notice}</p> : null}

      <section className="max-w-xl rounded-xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">Moto driver service fee</h3>
        <p className="mt-1 text-xs text-muted">
          Applied automatically when a Moto trip is completed. Delivery State is not included.
          No-show fees stay $0.50 with 0% platform cut.
        </p>
        <form className="mt-4" onSubmit={(event) => void saveFee(event)}>
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
              disabled={savingFee || loading}
              className="rounded-lg bg-raac px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {savingFee ? "Going live…" : feeDirty ? "Save & go live" : "Save"}
            </button>
          </div>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-line bg-panel-2 px-3 py-3">
            <p className="text-xs text-muted">
              {feeDirty ? "After save, on a" : "On a"} {money(SAMPLE_MOTO)} trip
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
            {money(SAMPLE_MOTO)} trip → {money(liveSplit.driver)} driver · {money(liveSplit.fee)} Raac
          </p>
          {saved?.updatedAt ? (
            <p className="mt-2 text-[11px] text-muted">Went live {when(saved.updatedAt)}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 max-w-xl rounded-xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">Delivery State driver payout</h3>
        <p className="mt-1 text-xs text-muted">
          No system service fee. On complete the driver receives this amount. The rest goes to
          Delivery State balance on Command and Wallets.
        </p>
        <form className="mt-4" onSubmit={(event) => void savePayout(event)}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">$</span>
            <input
              className="w-28 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none ring-raac focus:ring-2"
              inputMode="decimal"
              value={payout}
              onChange={(e) => {
                setPayout(e.target.value);
                setNotice(null);
              }}
              aria-label="Delivery State driver payout"
            />
            <button
              type="submit"
              disabled={savingPayout || loading}
              className="rounded-lg bg-raac px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {savingPayout ? "Going live…" : payoutDirty ? "Save & go live" : "Save"}
            </button>
          </div>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-line bg-panel-2 px-3 py-3">
            <p className="text-xs text-muted">
              {payoutDirty ? "After save, on a" : "On a"} {money(SAMPLE_STATE)} Delivery State trip
            </p>
            <p className="mt-1 font-semibold">{money(statePreview.driver)} to driver</p>
          </div>
          <div className="rounded-lg border border-line bg-panel-2 px-3 py-3">
            <p className="text-xs text-muted">Delivery State keeps</p>
            <p className="mt-1 font-semibold">{money(statePreview.state)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-raac/25 bg-raac-dim px-3 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-raac">In effect now</p>
          <p className="mt-1 font-semibold">{money(livePayout)} driver payout</p>
          <p className="mt-1 text-xs text-muted">
            {money(SAMPLE_STATE)} trip → {money(liveStateSplit.driver)} driver ·{" "}
            {money(liveStateSplit.state)} Delivery State
          </p>
          {saved?.updatedAt ? (
            <p className="mt-2 text-[11px] text-muted">Went live {when(saved.updatedAt)}</p>
          ) : null}
        </div>
      </section>
    </Shell>
  );
}
