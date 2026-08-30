import React, { useState } from "react";
import { useParams } from "wouter";
import {
  getListSessionsQueryKey,
  useListSessions,
} from "@workspace/api-client-react";
import { WORKSHOP_CODE } from "../lib/constants";
import { Header } from "../simulation/components";
import { PrimaryButton, SecondaryButton } from "../simulation/components";
import { useScenario } from "../lib/scenario";
import { formatCountdown, isExpired, remainingMs, type SessionConfig } from "../lib/timer";

function secretHeader(secret: string) {
  return { "x-facilitator-secret": secret };
}

export default function FacilitatePage() {
  const { secret } = useParams<{ secret: string }>();
  const scenario = useScenario();
  const listParams = { workshopCode: WORKSHOP_CODE };
  const { data: sessions = [], refetch } = useListSessions(listParams, {
    query: { refetchInterval: 5000, queryKey: getListSessionsQueryKey(listParams) },
  });
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [duration, setDuration] = useState(String(scenario.timing.defaultMinutes));
  const [msg, setMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  React.useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/session-config");
      if (res.ok) {
        const data = (await res.json()) as SessionConfig;
        setConfig(data);
        setDuration(String(data.durationMinutes));
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const call = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...secretHeader(secret), ...init?.headers },
    });
    if (!res.ok) {
      setMsg("Request failed. Check the facilitator secret in the URL.");
      return null;
    }
    return res;
  };

  const start = async () => {
    const res = await call("/api/session-config/start", { method: "POST", body: "{}" });
    if (res) {
      setConfig((await res.json()) as SessionConfig);
      setMsg("Exercise started.");
    }
  };
  const adjust = async () => {
    const res = await call("/api/session-config", {
      method: "PATCH",
      body: JSON.stringify({ durationMinutes: Number(duration) }),
    });
    if (res) {
      setConfig((await res.json()) as SessionConfig);
      setMsg("Timer updated.");
    }
  };
  const end = async () => {
    const res = await call("/api/session-config", {
      method: "PATCH",
      body: JSON.stringify({ end: true }),
    });
    if (res) {
      setConfig((await res.json()) as SessionConfig);
      setMsg("Exercise ended.");
    }
  };
  const release = async (id: string) => {
    await call(`/api/sessions/${id}`, { method: "DELETE" });
    refetch();
  };
  const resetAll = async () => {
    const ok = window.confirm(
      "Delete every team session and reset the shared timer? Testers should return to the join page and claim a slot again.",
    );
    if (!ok) return;
    setResetting(true);
    try {
      const res = await call("/api/sessions/reset-all", { method: "POST", body: "{}" });
      if (!res) return;
      const data = (await res.json()) as { deleted: number };
      const cfgRes = await fetch("/api/session-config");
      if (cfgRes.ok) {
        const next = (await cfgRes.json()) as SessionConfig;
        setConfig(next);
        setDuration(String(next.durationMinutes));
      }
      await refetch();
      setMsg(
        data.deleted === 0
          ? "No sessions to clear. Timer reset."
          : `Cleared ${data.deleted} session${data.deleted === 1 ? "" : "s"}. Timer reset.`,
      );
    } finally {
      setResetting(false);
    }
  };
  const download = async (format: "csv" | "json") => {
    const res = await call(`/api/export?format=${format}`);
    if (!res) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = format === "csv" ? "session-outputs.csv" : "session-outputs.json";
    a.click();
  };

  const remaining = config ? remainingMs(config) : null;
  const expired = config ? isExpired(config) : false;

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <h1 className="text-[32px] mt-0 mb-2">Facilitator</h1>
        <p className="text-[16px] text-[#6C6975] mb-6">
          {scenario.title}. The shared countdown starts when the first team claims a slot. Use
          Restart timer only if you need a fresh {scenario.timing.defaultMinutes} minutes. Polls
          every 5 seconds.
        </p>
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <PrimaryButton onClick={start}>Restart timer</PrimaryButton>
          <label className="text-[14px] text-[#6C6975]">
            Duration (minutes)
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="ml-2 w-20 rounded-lg border border-[#E7E4DD] px-2 py-1 text-[16px]"
            />
          </label>
          <SecondaryButton onClick={adjust}>Adjust timer</SecondaryButton>
          <SecondaryButton onClick={end}>End exercise</SecondaryButton>
          <SecondaryButton onClick={resetAll} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset all sessions"}
          </SecondaryButton>
          <SecondaryButton onClick={() => download("csv")}>Download CSV</SecondaryButton>
          <SecondaryButton onClick={() => download("json")}>Download JSON</SecondaryButton>
          <a href="/print" target="_blank" rel="noreferrer" className="text-[#301CA0] text-[16px] underline">
            Fallback pack
          </a>
        </div>
        <p className="text-[16px] mb-4">
          Timer:{" "}
          {!config?.startedAt
            ? "not started"
            : expired
              ? "expired / ended"
              : formatCountdown(remaining ?? 0)}
        </p>
        {msg && <p className="text-[14px] text-[#2E7D5B] mb-4">{msg}</p>}
        <div className="overflow-x-auto bg-white border border-[#E7E4DD] rounded-xl">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left border-b border-[#E7E4DD]">
                <th className="p-3">Team</th>
                <th className="p-3">Current step</th>
                <th className="p-3">Stakeholder</th>
                <th className="p-3">Evidence</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Slot</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr>
                  <td className="p-3 text-[#6C6975]" colSpan={7}>
                    No teams have joined yet.
                  </td>
                </tr>
              )}
              {sessions.map((s) => {
                const sh = scenario.stakeholders.find((x) => x.id === s.selectedStakeholder);
                const ev = scenario.evidence.find((x) => x.id === s.selectedEvidenceSource);
                return (
                  <tr key={s.id} className="border-b border-[#E7E4DD]">
                    <td className="p-3 font-semibold">{s.teamName}</td>
                    <td className="p-3">{s.currentScreen}</td>
                    <td className="p-3">{sh?.name ?? "—"}</td>
                    <td className="p-3">{ev?.title ?? "—"}</td>
                    <td className="p-3">{s.submittedAt ? "Yes" : "No"}</td>
                    <td className="p-3">{s.confidence ?? "—"}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="text-[#B42318] underline text-[14px]"
                        onClick={() => release(s.id)}
                      >
                        Release
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
