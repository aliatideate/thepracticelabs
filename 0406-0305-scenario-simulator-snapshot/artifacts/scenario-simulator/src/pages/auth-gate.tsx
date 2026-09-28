import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

/** Redirects to /login when the session cookie is missing. */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (cancelled) return;
        if (!res.ok) {
          const next = encodeURIComponent(location || "/facilitate");
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
  }, [location, setLocation]);

  if (!ok) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#6C6975]">
        Checking sign-in…
      </div>
    );
  }

  return <>{children}</>;
}
