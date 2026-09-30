import React, { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

type AuthGateProps = {
  children: React.ReactNode;
  /**
   * When true, a co-facilitator `?token=` / `?facilitatorToken=` on the URL
   * is enough to enter (APIs already accept x-facilitator-token).
   */
  allowFacilitatorToken?: boolean;
};

function hasFacilitatorToken(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return Boolean(params.get("token") || params.get("facilitatorToken"));
}

/** Redirects to /login when the session cookie is missing. */
export default function AuthGate({ children, allowFacilitatorToken = false }: AuthGateProps) {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (allowFacilitatorToken && hasFacilitatorToken(search)) {
        if (!cancelled) setOk(true);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (cancelled) return;
        if (!res.ok) {
          const next = encodeURIComponent(`${location || "/facilitate"}${search || ""}`);
          setLocation(`/login?next=${next}`, { replace: true });
          return;
        }
        setOk(true);
      } catch {
        if (!cancelled) {
          setLocation("/login?next=/facilitate", { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowFacilitatorToken, location, search, setLocation]);

  if (!ok) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#6C6975]">
        Checking sign-in…
      </div>
    );
  }

  return <>{children}</>;
}
