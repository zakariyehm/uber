"use client";

import { adminDisplayName, clearSession, getAdminUser, getToken } from "@/lib/auth";
import { getHealth } from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const NAV: { href?: string; label: string; section?: boolean }[] = [
  { href: "/", label: "Command" },
  { label: "Trips", section: true },
  { href: "/trips/local", label: "Local" },
  { href: "/trips/state", label: "State" },
  { href: "/moto", label: "Moto" },
  { href: "/states", label: "States" },
  { href: "/drivers", label: "Drivers" },
  { href: "/riders", label: "Riders" },
  { href: "/payments", label: "Payments" },
  { href: "/fees", label: "Fees" },
  { href: "/wallets", label: "Wallets" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const user = useMemo(() => (ready ? getAdminUser() : null), [ready]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const tick = async () => {
      const ok = await getHealth().catch(() => false);
      if (!cancelled) setHealthy(ok);
    };
    void tick();
    const id = setInterval(tick, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ready]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-sm text-muted">
        Loading console…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col bg-sidebar text-sidebar-ink">
        <div className="border-b border-sidebar-line px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-raac">Raac</p>
          <h1 className="mt-1 text-lg font-semibold text-sidebar-ink">Operations</h1>
          <p className="mt-1 text-xs text-sidebar-muted">Owner command center</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            if (item.section || !item.href) {
              return (
                <p
                  key={item.label}
                  className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted first:pt-1"
                >
                  {item.label}
                </p>
              );
            }
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-raac-dim text-raac"
                    : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-line p-4 text-xs text-sidebar-muted">
          <p className="font-medium text-sidebar-ink">{adminDisplayName(user)}</p>
          <p>{user?.email || user?.phone}</p>
        </div>
      </aside>

      <div className="pl-60">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-3">
          <div>
            <p className="text-sm font-medium">Live operations</p>
            <p className="text-xs text-muted">Mogadishu · Raac network</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-ink">
              <span className={`h-2 w-2 rounded-full ${healthy ? "bg-raac" : "bg-danger"}`} />
              {healthy ? "System healthy" : healthy === null ? "Checking…" : "API down"}
            </span>
            <button
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="bg-bg p-6">{children}</main>
      </div>
    </div>
  );
}
