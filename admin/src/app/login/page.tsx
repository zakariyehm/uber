"use client";

import { api, errorMessage } from "@/lib/api";
import { setSession } from "@/lib/auth";
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
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-2xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-raac">Raac</p>
        <h1 className="mt-2 text-3xl font-semibold">Owner console</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to monitor trips, fleet, payments, and wallets.
        </p>

        <label className="mt-8 block text-xs font-semibold uppercase tracking-wide text-muted">
          Email or phone
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-3 text-sm outline-none ring-raac focus:ring-2"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
        />

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Password
        </label>
        <input
          type="password"
          className="mt-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-3 text-sm outline-none ring-raac focus:ring-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-raac py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Enter operations"}
        </button>
      </form>
    </div>
  );
}
