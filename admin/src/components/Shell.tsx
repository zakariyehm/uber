"use client";

import { adminDisplayName, clearSession, getAdminUser, getToken } from "@/lib/auth";
import { getHealth } from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = { href?: string; label: string; section?: boolean };

const NAV: NavItem[] = [
  { section: true, label: "Operations" },
  { href: "/dispatch", label: "Dispatch" },
  { href: "/", label: "Command" },
  { href: "/trips", label: "Trips" },
  { section: true, label: "People" },
  { href: "/customers", label: "Customers" },
  { href: "/drivers", label: "Drivers" },
  { href: "/stores", label: "Stores" },
  { section: true, label: "Fleet" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/states", label: "Delivery State" },
  { section: true, label: "Money" },
  { href: "/payments", label: "Payments" },
  { href: "/wallets", label: "Wallets" },
  { href: "/fees", label: "Fees" },
  { section: true, label: "Insights" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reports", label: "Reports" },
];

export function Shell({ children, flush }: { children: React.ReactNode; flush?: boolean }) {
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
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[240px] flex-col bg-sidebar text-sidebar-ink">
        <div className="border-b border-sidebar-line px-4 py-5">
          <Link href="/" className="inline-flex items-center">
            <img src="/raac-logo.png?v=3" alt="RAAC" width={128} height={56} className="h-9 w-auto" />
          </Link>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted">
            Operations
          </p>
          <h1 className="mt-1 text-base font-semibold tracking-tight text-sidebar-ink">
            Command center
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {NAV.map((item) => {
            if (item.section || !item.href) {
              return (
                <p
                  key={item.label}
                  className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white first:pt-1"
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
                className={`relative mb-0.5 flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                  active
                    ? "bg-sidebar-active text-white"
                    : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
                }`}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-raac" />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-line p-4">
          <p className="truncate text-sm font-medium text-sidebar-ink">{adminDisplayName(user)}</p>
          <p className="mt-0.5 truncate text-xs text-sidebar-muted">{user?.email || user?.phone}</p>
        </div>
      </aside>

      <div className="pl-[240px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel/95 px-6 py-3 backdrop-blur">
          <div>
            <p className="text-sm font-semibold tracking-tight">Live operations</p>
            <p className="text-xs text-muted">Mogadishu · Raac network</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-2 px-3 py-1.5 text-xs font-medium text-ink">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  healthy ? "bg-emerald-500" : healthy === null ? "bg-amber-400" : "bg-danger"
                }`}
              />
              {healthy ? "API healthy" : healthy === null ? "Checking…" : "API down"}
            </span>
            <button
              type="button"
              className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-panel-2 hover:text-ink"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className={flush ? "h-[calc(100vh-57px)] overflow-hidden" : "min-h-[calc(100vh-57px)] p-6"}>
          {children}
        </main>
      </div>
    </div>
  );
}
