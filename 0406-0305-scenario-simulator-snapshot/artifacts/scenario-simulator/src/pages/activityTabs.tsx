import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { useSessionRoom } from "../lib/sessionRoom";

const OPTIONS = [
  { id: "demand" as const, label: "Problem Framing: Demand Spike" },
  { id: "mart" as const, label: "Decision-making: Mart" },
];

/**
 * Legacy Unilever hub switcher between /facilitate?tab=demand|mart.
 * Hidden on Creator `/s/:code/facilitate` rooms (session title is shown instead).
 */
export function ActivityTabs({ active }: { active: "demand" | "mart" }) {
  const room = useSessionRoom();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.id === active) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (room) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-6">
      <div className="relative inline-block" ref={root}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-[#E7E4DD] bg-[#301CA0] text-white text-[15px] font-semibold whitespace-nowrap px-5 py-2.5"
        >
          {current.label}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.25} />
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-full rounded-[22px] border border-[#E7E4DD] bg-white p-1 shadow-[0_8px_24px_rgba(29,29,36,0.08)]"
          >
            {OPTIONS.map((option) => {
              const selected = option.id === active;
              return (
                <li key={option.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`w-full rounded-full px-5 py-2 text-left text-[15px] font-semibold whitespace-nowrap ${
                      selected ? "bg-[#301CA0] text-white" : "text-[#301CA0] hover:bg-[#EAE8F6]"
                    }`}
                    onClick={() => {
                      setOpen(false);
                      setLocation(`/facilitate?tab=${option.id}`);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
