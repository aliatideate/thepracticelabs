import React, { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Header, PrimaryButton } from "../simulation/components";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const next = new URLSearchParams(search).get("next") || "/create";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        setError("That email or password is not right.");
        setBusy(false);
        return;
      }
      setLocation(next.startsWith("/") ? next : "/create", { replace: true });
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[480px] px-6 py-14">
        <h1 className="text-[32px] mt-0 mb-2">Sign in</h1>
        <p className="text-[16px] text-[#6C6975] mb-6">
          Use your Practice Labs account to open Clients and Boards.
        </p>
        <form onSubmit={submit} className="bg-white border border-[#E7E4DD] rounded-xl p-6">
          <label className="block text-[14px] font-semibold mb-2" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
          />
          <label className="block text-[14px] font-semibold mb-2" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
          />
          {error && <p className="text-[#B42318] text-[16px] mb-4">{error}</p>}
          <PrimaryButton type="submit" disabled={busy || !email.trim() || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
