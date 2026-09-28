import React, { useState } from "react";
import { FACILITATOR_PASSWORD, FACILITATOR_UNLOCK_KEY } from "../lib/constants";
import { Header, PrimaryButton } from "../simulation/components";

function isUnlocked() {
  try {
    return sessionStorage.getItem(FACILITATOR_UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export default function FacilitateUnlock({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(isUnlocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() !== FACILITATOR_PASSWORD) {
      setError("That password is not right.");
      return;
    }
    try {
      sessionStorage.setItem(FACILITATOR_UNLOCK_KEY, "1");
    } catch {
      /* ignore */
    }
    setOk(true);
  };

  if (ok) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header hideFlowNav clock={{ startedAt: null, durationMinutes: 30, endedAt: null }} />
      <div className="mx-auto max-w-[480px] px-6 py-14">
        <h1 className="text-[32px] mt-0 mb-2">Facilitator</h1>
        <p className="text-[16px] text-[#6C6975] mb-6">Enter the session password to continue.</p>
        <form onSubmit={submit} className="bg-white border border-[#E7E4DD] rounded-xl p-6">
          <label className="block text-[14px] font-semibold mb-2" htmlFor="facilitate-password">
            Password
          </label>
          <input
            id="facilitate-password"
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
          <PrimaryButton type="submit" disabled={!password.trim()}>
            Continue
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
