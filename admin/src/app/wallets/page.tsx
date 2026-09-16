"use client";

import { Shell } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { api, errorMessage } from "@/lib/api";
import { money } from "@/lib/format";
import { useEffect, useState } from "react";

type WalletPayload = {
  drivers: {
    userId: string;
    name: string;
    phone: string;
    isActive: boolean;
    isOnline: boolean;
    todayBalance: string;
    tripsCompletedToday: number;
    tripsCancelled: number;
  }[];
  riders: {
    userId: string;
    name: string;
    phone: string;
    isActive: boolean;
    pendingBalance: string;
  }[];
};

export default function WalletsPage() {
  const [data, setData] = useState<WalletPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<WalletPayload>("/admin/wallets")
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Wallets</h2>
        <p className="text-sm text-muted">Driver daily earnings and rider pending credits</p>
      </div>
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold">Drivers · today</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2">Balance</th>
                <th className="px-4 py-2">Trips</th>
              </tr>
            </thead>
            <tbody>
              {(data?.drivers || []).map((row) => (
                <tr key={row.userId} className="border-t border-line/70">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted">{row.phone}</p>
                    <StatusBadge value={row.isOnline ? "online" : "offline"} />
                  </td>
                  <td className="px-4 py-3">{money(row.todayBalance)}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {row.tripsCompletedToday} done · {row.tripsCancelled} cancelled
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold">Riders · pending credits</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Rider</th>
                <th className="px-4 py-2">Pending</th>
              </tr>
            </thead>
            <tbody>
              {(data?.riders || []).map((row) => (
                <tr key={row.userId} className="border-t border-line/70">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted">{row.phone}</p>
                  </td>
                  <td className="px-4 py-3">{money(row.pendingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </Shell>
  );
}
