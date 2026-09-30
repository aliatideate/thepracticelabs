import React, { useState } from "react";
import { Copy } from "lucide-react";
import { Link, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header, PrimaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import { BackLink, StatusTag, formatRanOn } from "./create-shell";

function CopyIconButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Copied" : `Copy ${label}`}
      title={copied ? "Copied" : "Copy"}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#301CA0] hover:bg-[#E6F3EF] transition-colors"
    >
      <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  );
}

const LINK_CLASS = "text-[15px] text-[#301CA0] underline break-all min-w-0";

function LinkRow({
  url,
  label,
  copied,
  onCopy,
}: {
  url: string;
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex gap-2 items-center justify-between">
      <a href={url} className={LINK_CLASS}>
        {url}
      </a>
      <CopyIconButton label={label} copied={copied} onClick={onCopy} />
    </div>
  );
}

function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [facToken, setFacToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["create-session", id],
    queryFn: async () => {
      const res = await fetch(`/api/create/sessions/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{
        id: string;
        title: string;
        clientId: string;
        clientName: string;
        exerciseTitle: string;
        format: string;
        workshopCode: string;
        status: string;
        durationMinutes: number;
        teamCount: number;
        mode: string;
        endedAt: string | null;
        variableValues: Record<string, unknown>;
        resolvedFacilitatorNotes?: string | null;
        archives: { id: string; savedAt: string; teamCount: number; submittedCount: number }[];
        paths: {
          join: string;
          facilitate: string;
          tryOut: string;
          print: string | null;
        };
      }>;
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const regenToken = async () => {
    if (!data) return;
    setMsg(null);
    const res = await fetch(`/api/workshop-sessions/${data.id}/facilitator-token`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) {
      setMsg("Could not regenerate facilitator link.");
      return;
    }
    const body = (await res.json()) as { token: string; facilitatePath: string };
    setFacToken(body.token);
    setMsg("New co-facilitator link issued. Copy it below — any previous token link no longer works.");
    await queryClient.invalidateQueries({ queryKey: ["create-session", id] });
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
        Session not found.
      </div>
    );
  }

  const joinUrl = `${origin}${data.paths.join}`;
  const boardUrl = `${origin}${data.paths.facilitate}`;
  const coFacUrl = facToken
    ? `${origin}${data.paths.facilitate}?token=${encodeURIComponent(facToken)}`
    : null;
  const tryUrl = `${origin}${data.paths.tryOut}`;
  const printUrl = data.paths.print ? `${origin}${data.paths.print}` : null;

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <div className="mb-2">
          <BackLink href={`/create/clients/${data.clientId}`}>
            {data.clientName}
          </BackLink>
        </div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-[32px] mt-0 mb-0">{data.title}</h1>
          <StatusTag status={data.status} />
        </div>
        <p className="text-[16px] text-[#6C6975] mb-8">
          {data.exerciseTitle} · {data.teamCount} teams · {data.durationMinutes} min ·{" "}
          {data.mode.replace("_", " ")}
          {data.status === "ended" && formatRanOn(data.endedAt)
            ? ` · Ran ${formatRanOn(data.endedAt)}`
            : ""}
        </p>

        <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 space-y-5 mb-8">
          <div>
            <div className="text-[14px] font-semibold mb-1">Join link</div>
            <LinkRow
              url={joinUrl}
              label="join link"
              copied={copied === "join"}
              onCopy={() => copy("join", joinUrl)}
            />
            <p className="text-[14px] text-[#6C6975] mt-1 mb-0">Code: {data.workshopCode}</p>
          </div>

          <div className="border-t border-[#E7E4DD] pt-5 space-y-5">
            <div>
              <div className="text-[14px] font-semibold mb-1">Facilitator board</div>
              <LinkRow
                url={boardUrl}
                label="facilitator board link"
                copied={copied === "fac"}
                onCopy={() => copy("fac", boardUrl)}
              />
            </div>

            <div>
              <div className="text-[14px] font-semibold mb-1">Co-facilitator link</div>
              {coFacUrl ? (
                <LinkRow
                  url={coFacUrl}
                  label="co-facilitator link"
                  copied={copied === "cofac"}
                  onCopy={() => copy("cofac", coFacUrl)}
                />
              ) : (
                <p className="text-[14px] text-[#6C6975] m-0">
                  Generate a link for someone who isn’t signed in.
                </p>
              )}
              <button
                type="button"
                onClick={regenToken}
                className="mt-2 text-[14px] font-medium text-[#301CA0] bg-transparent border-0 p-0 cursor-pointer"
              >
                {coFacUrl ? "Regenerate token" : "Generate link"}
              </button>
            </div>
          </div>

          <div>
            <div className="text-[14px] font-semibold mb-1">Try-out</div>
            <LinkRow
              url={tryUrl}
              label="try-out link"
              copied={copied === "try"}
              onCopy={() => copy("try", tryUrl)}
            />
          </div>
          {printUrl && (
            <div>
              <div className="text-[14px] font-semibold mb-1">Print pack</div>
              <LinkRow
                url={printUrl}
                label="print pack link"
                copied={copied === "print"}
                onCopy={() => copy("print", printUrl)}
              />
            </div>
          )}
          {msg && <p className="text-[15px] text-[#496C61] m-0">{msg}</p>}
          <div className="pt-2">
            <Link href={data.paths.facilitate}>
              <PrimaryButton type="button">Open facilitator board</PrimaryButton>
            </Link>
          </div>
        </div>

        <h2 className="text-[20px] mt-0 mb-3 ml-2">Variable values</h2>
        <div className="bg-white border border-[#E7E4DD] rounded-xl p-5 mb-8">
          {Object.keys(data.variableValues || {}).length === 0 ? (
            <p className="text-[#6C6975] m-0">Defaults from the published exercise version.</p>
          ) : (
            <pre className="text-[14px] m-0 whitespace-pre-wrap">
              {JSON.stringify(data.variableValues, null, 2)}
            </pre>
          )}
        </div>

        {data.resolvedFacilitatorNotes && (
          <>
            <h2 className="text-[20px] mt-0 mb-3 ml-2">Facilitator notes (resolved)</h2>
            <pre className="bg-white border border-[#E7E4DD] rounded-xl p-5 mb-8 text-[14px] whitespace-pre-wrap m-0">
              {data.resolvedFacilitatorNotes}
            </pre>
          </>
        )}

        <h2 className="text-[20px] mt-0 mb-3 ml-2">Archives</h2>
        <div className="space-y-2">
          {data.archives.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-[#E7E4DD] rounded-xl px-4 py-3 text-[15px]"
            >
              {new Date(a.savedAt).toLocaleString()} · {a.submittedCount}/{a.teamCount} submitted
            </div>
          ))}
          {data.archives.length === 0 && (
            <p className="text-[#6C6975]">No saved runs for this session yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateSessionPage() {
  return (
    <AuthGate>
      <SessionDetail />
    </AuthGate>
  );
}
