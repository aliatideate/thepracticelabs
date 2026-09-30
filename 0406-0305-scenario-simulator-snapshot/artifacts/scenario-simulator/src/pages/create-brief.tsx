import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header, PrimaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import { BackLink, StatusTag, formatFromCategory } from "./create-shell";

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

const FIELD =
  "w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[16px] bg-white";

/** Native arrow hidden; chevron drawn separately with inset from the right edge. */
const SELECT_FIELD =
  "w-full rounded-xl border border-[#E7E4DD] pl-4 pr-10 py-3 text-[16px] bg-white appearance-none";

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <div className="relative">
      <select className={className ?? SELECT_FIELD} {...rest}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]"
        strokeWidth={2}
        aria-hidden
      />
    </div>
  );
}

function BriefEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["create-brief", id],
    enabled: !isNew,
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

  const body = () => ({
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
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (isNew) {
        const res = await fetch("/api/create/briefs", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body()),
        });
        if (!res.ok) {
          setMsg("Could not create activity.");
          setBusy(false);
          return;
        }
        const row = (await res.json()) as { id: string };
        await queryClient.invalidateQueries({ queryKey: ["create-exercises"] });
        setLocation(`/create/briefs/${row.id}`);
        return;
      }

      const res = await fetch(`/api/create/briefs/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body()),
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

  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#6C6975]">
        Loading…
      </div>
    );
  }
  if (!isNew && (isError || !data)) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#B42318]">
        Brief not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <div className="mb-2">
          <BackLink href="/create/library">Back to Activities</BackLink>
          <p className="text-[14px] text-[#6C6975] mt-1 mb-0">
            {formatFromCategory(category)}
          </p>
        </div>
        <div className="flex items-start justify-between gap-3 mb-6">
          <h1 className="text-[32px] mt-0 mb-0 text-[#6C6975]">
            {isNew ? "New activity" : data!.title}
          </h1>
          {!isNew && <StatusTag status={data!.status} />}
        </div>

        <form onSubmit={save} className="bg-white border border-[#E7E4DD] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-title">
              Title
            </label>
            <input
              id="brief-title"
              className={FIELD}
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
              <SelectField
                id="brief-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-client">
                Client (optional)
              </label>
              <SelectField
                id="brief-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">No client</option>
                {(clientsQ.data?.clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-audience">
              Audience
            </label>
            <textarea
              id="brief-audience"
              className={FIELD}
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
              className={FIELD}
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
              className={FIELD}
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
              className={FIELD}
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
                className={FIELD}
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
                className={FIELD}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-[14px] font-semibold mb-2" htmlFor="brief-mode">
                Mode
              </label>
              <SelectField
                id="brief-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          {msg && <p className="text-[14px] text-[#6C6975] m-0">{msg}</p>}
          <div className="flex justify-end pt-2">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? (isNew ? "Creating…" : "Saving…") : isNew ? "Create" : "Save"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateBriefPage() {
  return (
    <AuthGate>
      <BriefEditor />
    </AuthGate>
  );
}
