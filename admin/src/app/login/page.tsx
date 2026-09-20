"use client";

import { api, errorMessage } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("owner@raac.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail
        ? { email: identifier.trim().toLowerCase(), password }
        : { phone: identifier.replace(/\s+/g, ""), password };
      const result = await api<{ token: string; user: { role: string } & Record<string, string | null> }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify(payload) }
      );
      if (result.user.role !== "ADMIN") {
        throw new Error("This console is for the Raac owner only");
      }
      setSession(result.token, {
        id: String(result.user.id),
        role: result.user.role,
        phone: String(result.user.phone || ""),
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      });
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err, "Could not sign in"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-sidebar px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-sidebar-line bg-[#161616] p-8 text-sidebar-ink shadow-modal"
      >
        <img src="/raac-logo.png" alt="RAAC" width={160} height={62} className="h-12 w-auto" />
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted">
          Operations
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-sidebar-ink">
          Command center
        </h1>
        <p className="mt-2 text-sm text-sidebar-muted">
          Sign in to monitor trips, fleet, payments, and wallets.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">
              Email or phone
            </span>
            <input
              className="w-full rounded-lg border border-sidebar-line bg-sidebar-hover px-3 py-3 text-sm text-sidebar-ink outline-none placeholder:text-sidebar-muted focus:border-raac focus:ring-2 focus:ring-raac/30"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">
              Password
            </span>
            <input
              type="password"
              className="w-full rounded-lg border border-sidebar-line bg-sidebar-hover px-3 py-3 text-sm text-sidebar-ink outline-none focus:border-raac focus:ring-2 focus:ring-raac/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <Button type="submit" variant="primary" className="mt-6 w-full" disabled={busy}>
          {busy ? "Signing in…" : "Enter operations"}
        </Button>
      </form>
    </div>
  );
}
