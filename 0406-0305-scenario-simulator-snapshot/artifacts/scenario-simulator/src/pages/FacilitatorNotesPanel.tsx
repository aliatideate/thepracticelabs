import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { facilitatorAuthHeaders } from "../lib/facilitatorAuth";

function inlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={`c-${key++}`}
          className="rounded bg-[#F1F0EC] px-1 py-0.5 text-[13px] font-mono"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownNotes({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className="space-y-3 text-[15px] text-[#1A1A1A] leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.length === 1 && lines[0].startsWith("# ")) {
          return (
            <h3 key={i} className="text-[18px] font-semibold m-0">
              {inlineMarkdown(lines[0].slice(2))}
            </h3>
          );
        }
        if (lines.length === 1 && lines[0].startsWith("## ")) {
          return (
            <h4 key={i} className="text-[16px] font-semibold m-0">
              {inlineMarkdown(lines[0].slice(3))}
            </h4>
          );
        }
        return (
          <p key={i} className="m-0 whitespace-pre-wrap">
            {lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inlineMarkdown(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Phase 7 — collapsible session facilitator notes from resolved_facilitator_notes.
 * Hidden when the session has no notes. Mart per-decision notes stay separate.
 */
export function FacilitatorNotesPanel({ workshopCode }: { workshopCode: string }) {
  const [notes, setNotes] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setNotes(null);
    setOpen(false);
    const load = async () => {
      const res = await fetch(
        `/api/workshop-sessions/by-code/${encodeURIComponent(workshopCode)}/facilitator-notes`,
        {
          credentials: "same-origin",
          headers: facilitatorAuthHeaders(),
        },
      );
      if (cancelled) return;
      if (!res.ok) {
        setNotes(null);
        setLoaded(true);
        return;
      }
      const body = (await res.json()) as { notes?: string | null };
      setNotes(body.notes?.trim() ? body.notes : null);
      setLoaded(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [workshopCode]);

  if (!loaded || !notes) return null;

  return (
    <div className="mb-6 rounded-xl border border-[#E7E4DD] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] font-semibold text-[#301CA0]"
        aria-expanded={open}
      >
        Facilitator notes
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-[#E7E4DD] px-4 py-4">
          <MarkdownNotes source={notes} />
        </div>
      )}
    </div>
  );
}
