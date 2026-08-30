import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { product, session, assets } from "../data/data";

export function useTypewriter(fullText: string, enabled: boolean, charMs = 12) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayed("");
      setDone(false);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(id);
        setDone(true);
      }
    }, charMs);
    return () => clearInterval(id);
  }, [fullText, enabled, charMs]);

  return { displayed, done };
}

export function Header({ onExit, onHome }: { onExit?: () => void; onHome?: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#100f24]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={onHome}
          aria-label={`Return to ${product.name} home`}
          className="flex items-center gap-3 cursor-pointer rounded-lg -ml-1 px-1 py-0.5 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
        >
          <img
            src={assets.scenarioSimulatorLogo}
            alt={`Ideate Internal Tools — ${product.name}`}
            className="h-9 w-auto object-contain pl-[0px] pr-[0px] ml-[0px] mr-[0px] mt-[0px] mb-[0px] pt-[5px] pb-[5px]"
          />
          <div className="hidden md:block ml-2 text-[11px] text-white/35 border-l border-white/10 pl-3 opacity-[0]">
            {product.subtitle}
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 text-[11px]">
              Workshop {session.workshopNumber}: {session.workshop}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 text-[11px] flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-yellow-400 inline-block"></span>
              {session.timeRemaining}
            </span>
          </div>
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-full text-white/50 text-[11px] hover:text-white hover:bg-white/[0.05] cursor-pointer transition-colors"
          >
            Exit Session
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="bg-gradient-to-t from-[#100a23]/90 via-[#100a23]/60 to-transparent pt-6 pb-3 text-center text-white/35 text-[11px] tracking-wide">
        Ideate Innovation © Copyright 2026
      </div>
    </footer>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  if (disabled) {
    return (
      <button
        disabled
        className={`px-5 py-2.5 rounded-full font-medium text-sm bg-white/[0.04] text-white/30 cursor-not-allowed transition-all ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <span className="relative inline-flex group">
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur opacity-25 group-hover:opacity-40 transition-opacity duration-300 animate-pulse"
      />
      <button
        onClick={onClick}
        className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm cursor-pointer transition-all duration-300 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 hover:-translate-y-0.5 shadow-[0_4px_12px_-8px_rgba(251,146,60,0.3)] hover:shadow-[0_6px_18px_-6px_rgba(251,146,60,0.42)] active:translate-y-0 active:shadow-[0_2px_6px_-4px_rgba(251,146,60,0.3)] ${className}`}
      >
        <span>{children}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="transition-transform duration-300 ease-out group-hover:translate-x-1"
        >
          <path
            d="M5 12h14m-6-6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </span>
  );
}

export function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 rounded-full font-medium text-sm text-white/70 border border-white/10 hover:text-white hover:bg-white/[0.04] cursor-pointer transition-all"
    >
      {children}
    </button>
  );
}

export function DepartmentIcon({ department }: { department?: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (department) {
    case "Sales":
      return (
        <svg {...common}>
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="14 7 21 7 21 14" />
        </svg>
      );
    case "Planning":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" />
          <circle cx="8.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="15" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "Procurement":
      return (
        <svg {...common}>
          <rect x="1" y="6" width="13" height="11" rx="1" />
          <path d="M14 10h4l3 3v4h-7" />
          <circle cx="6" cy="19" r="2" />
          <circle cx="17" cy="19" r="2" />
        </svg>
      );
    case "Manufacturing":
      return (
        <svg {...common}>
          <path d="M3 21V10l5 3V10l5 3V8l8 5v8z" />
          <path d="M7 17h1M11 17h1M15 17h1M19 17h1" />
        </svg>
      );
    case "Finance":
      return (
        <svg {...common}>
          <path d="M12 2v20" />
          <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function CallModeratorButton() {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-label="Call moderator Ali into your workspace"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.05] hover:bg-emerald-400/[0.12] hover:border-emerald-400/45 px-2.5 py-1 text-emerald-300/90 hover:text-emerald-200 text-[11px] font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
      >
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </span>
        <span>Call moderator</span>
      </button>
      <div
        role="tooltip"
        className="absolute right-0 top-full mt-2 z-20 pointer-events-none opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200"
      >
        <div className="rounded-lg border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-sm px-3 py-2 shadow-xl whitespace-nowrap">
          <div className="text-white text-[12px] font-medium">This will ping Ali to join your workspace</div>
          <div className="text-white/50 text-[11px] mt-0.5">Feel free to use this if you want to discuss something</div>
        </div>
      </div>
    </div>
  );
}

export function BackButton({ onClick }: { onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {onClick ? (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 px-2.5 py-1 text-white/55 hover:text-white text-[11px] font-medium transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Back</span>
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
      <CallModeratorButton />
    </div>
  );
}

export function Card({
  children,
  className = "",
  selected,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-xl border transition-all ${
        selected
          ? "border-yellow-400/60 bg-gradient-to-br from-yellow-400/[0.12] via-yellow-400/[0.05] to-yellow-400/[0.02] shadow-[inset_0_1px_0_rgba(250,204,21,0.08)]"
          : disabled
          ? "border-white/[0.06] bg-white/[0.015] opacity-60"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
      } ${onClick && !disabled ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Tab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
        onClick ? "cursor-pointer" : "cursor-default"
      } ${
        active
          ? "bg-yellow-400/10 border border-yellow-400/40 text-yellow-400"
          : "border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8 flex-wrap">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <Tab active={i === current}>
            <span className="mr-1.5 opacity-60">0{i + 1}</span>
            {label}
          </Tab>
          {i < steps.length - 1 && <div className="w-6 h-px bg-white/10 hidden md:block" />}
        </div>
      ))}
    </div>
  );
}

export function Pill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "yellow" | "green" | "red";
}) {
  const variants = {
    default: "bg-white/[0.04] border-white/10 text-white/60",
    yellow: "bg-yellow-400/10 border-yellow-400/30 text-yellow-400",
    green: "bg-emerald-400/10 border-emerald-400/30 text-emerald-400",
    red: "bg-red-400/10 border-red-400/30 text-red-400",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 mb-3">
      {children}
    </div>
  );
}

export function Avatar({
  src,
  alt,
  size = "md",
  ring,
}: {
  src: string;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: boolean;
}) {
  const sizes = {
    xs: "w-8 h-8",
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-28 h-28",
  };
  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-full object-cover flex-shrink-0 ${sizes[size]} ${
        ring ? "ring-2 ring-white/10" : ""
      }`}
    />
  );
}

export function FacilitatorNote({
  noteId,
  message,
  dismissed,
  onDismiss,
}: {
  noteId: string;
  message: string;
  dismissed: boolean;
  onDismiss: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, [dismissed]);

  const handleDismiss = () => {
    setClosing(true);
    setOpen(false);
    setTimeout(() => onDismiss(noteId), 450);
  };

  if (dismissed && !closing) return null;

  return (
    <div
      aria-hidden={!open}
      className={`grid w-full ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      style={{
        transitionProperty: "grid-template-rows, opacity",
        transitionDuration: "450ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div className="overflow-hidden min-h-0">
        <div
          className={`mb-5 transition-transform duration-500 ease-out ${
            open ? "translate-y-0" : "-translate-y-1"
          }`}
        >
          <div className="relative rounded-xl border border-yellow-400/25 bg-yellow-400/[0.035] backdrop-blur-sm p-3.5 pr-9 shadow-[inset_0_1px_0_rgba(250,204,21,0.05)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-yellow-400/90 flex-shrink-0">
                <path
                  d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-yellow-400 text-[10px] font-semibold uppercase tracking-[0.14em]">
                Facilitator note
              </span>
              <span className="text-white/30 text-[10px] ml-auto mr-3 hidden sm:inline">
                Workshop guidance
              </span>
            </div>
            <p className="text-white/75 text-[13px] leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss facilitator note"
              className="absolute top-2 right-2 w-6 h-6 inline-flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InsightGrid({
  items,
  accent = "yellow",
}: {
  items: { title: string; body: string }[];
  accent?: "yellow" | "orange";
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((c, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 mt-0.5 ${
              accent === "yellow"
                ? "bg-yellow-400/10 border border-yellow-400/30 text-yellow-400"
                : "bg-orange-400/10 border border-orange-400/30 text-orange-400"
            }`}>
              {i + 1}
            </div>
            <div>
              <div className="text-white font-medium text-sm mb-1">{c.title}</div>
              <div className="text-white/55 text-[13px] leading-relaxed">{c.body}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-20 pb-16 px-6 min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}