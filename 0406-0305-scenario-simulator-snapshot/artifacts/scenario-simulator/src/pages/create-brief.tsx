import React, { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header, PrimaryButton, SecondaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import { StatusTag, formatFromCategory } from "./create-shell";

const CATEGORIES = [
  { value: "problem-framing", label: "Problem framing" },
  { value: "decision-making", label: "Decision-making" },
  { value: "ideation", label: "Ideation" },
  { value: "prototyping", label: "Prototyping" },
] as const;

const MODES = [
  { value: "in_person", label: "In person" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
] as const;

function BriefDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["create-brief", id],
    queryFn: async () => {
      const res = await fetch(`/api/create/briefs/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{
        id: string;
        title: string;
        category: string;
        audience: string;
        skill: string;
        debriefFocus: string;
        setting: string;
        durationMinutes: number;
        teamCount: number;
        mode: string;
        status: string;
        clientId: string | null;
        clientName: string | null;
      }>;
    },
  });

  const clientsQ = useQuery({
    queryKey: ["create-clients"],
    queryFn: async () => {
      const res = await fetch("/api/create/clients", { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { clients: { id: string; name: string }[] };
    },
  });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("problem-framing");
  const [audience, setAudience] = useState("");
  const [skill, setSkill] = useState("");
  const [debriefFocus, setDebriefFocus] = useState("");
  const [setting, setSetting] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [teamCount, setTeamCount] = useState(5);
  const [mode, setMode] = useState("in_person");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setCategory(data.category);
    setAudience(data.audience);
    setSkill(data.skill);
    setDebriefFocus(data.debriefFocus);
    setSetting(data.setting);
    setDurationMinutes(data.durationMinutes);
    setTeamCount(data.teamCount);
    setMode(data.mode);
    setClientId(data.clientId ?? "");
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/create/briefs/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          audience,
          skill,
          debriefFocus,
          setting,
          durationMinutes,
          teamCount,
          mode,
          clientId: clientId || null,
        }),
      });
      if (!res.ok) {
        setMsg("Could not save brief.");
        setBusy(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["create-brief", id] });
      await queryClient.invalidateQueries({ queryKey: ["create-exercises"] });
      setMsg("Saved.");
    } catch {
      setMsg("Could not reach the server.");
    }
    setBusy(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#6C6975]">
        Loading…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#B42318]">
        Brief not found.
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[16px] bg-white";

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <p className="text-[14px] text-[#6C6975] mb-2">
          <Link href="/create/library" className="text-[#301CA0] underline">
            Library
          </Link>
          {" · "}
          {formatFromCategory(category)}
        </p>
        <div className="flex items-start justify-between gap-3 mb-6">
          <h1 className="text-[32px] mt-0 mb-0 text-[#6C6975]">{data.title}</h1>
          <StatusTag status={data.status} />
        </div>

        <form onSubmit={save} className="bg-white border border-[#E7E4DD] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-title">
              Title
            </label>
            <input
              id="brief-title"
              className={field}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-category">
                Category
              </label>
              <select
                id="brief-category"
                className={field}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-client">
                Client (optional)
              </label>
              <select
                id="brief-client"
                className={field}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">No client</option>
                {(clientsQ.data?.clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-audience">
              Audience
            </label>
            <textarea
              id="brief-audience"
              className={field}
              rows={2}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-skill">
              Skill
            </label>
            <textarea
              id="brief-skill"
              className={field}
              rows={2}
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-debrief">
              Debrief focus
            </label>
            <textarea
              id="brief-debrief"
              className={field}
              rows={2}
              value={debriefFocus}
              onChange={(e) => setDebriefFocus(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-setting">
              Setting
            </label>
            <textarea
              id="brief-setting"
              className={field}
              rows={2}
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-duration">
                Duration (min)
              </label>
              <input
                id="brief-duration"
                type="number"
                min={5}
                max={480}
                className={field}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-teams">
                Teams
              </label>
              <input
                id="brief-teams"
                type="number"
                min={1}
                max={40}
                className={field}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-mode">
                Mode
              </label>
              <select
                id="brief-mode"
                className={field}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {msg && <p className="text-[14px] text-[#6C6975] m-0">{msg}</p>}
          <div className="flex gap-3 pt-2">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </PrimaryButton>
            <Link href="/create/library">
              <SecondaryButton>Back to Library</SecondaryButton>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateBriefPage() {
  return (
    <AuthGate>
      <BriefDetail />
    </AuthGate>
  );
}
