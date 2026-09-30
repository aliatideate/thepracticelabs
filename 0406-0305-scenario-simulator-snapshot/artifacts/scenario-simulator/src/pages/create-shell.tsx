import React from "react";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Header } from "../simulation/components";

const BACK_LINK_CLASS =
  "inline-flex items-center gap-1.5 text-[14px] font-medium text-[#301CA0] no-underline";

/** Standard Creator back crumb: ← Back to {destination}. */
export function BackLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BACK_LINK_CLASS} ${className}`.trim()}>
      <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      {children}
    </Link>
  );
}

/** Same look as BackLink, for in-wizard step backs (button, not route). */
export function BackButton({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BACK_LINK_CLASS} bg-transparent border-0 p-0 cursor-pointer ${className}`.trim()}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      {children}
    </button>
  );
}

const TABS = [
  { key: "clients", label: "Clients", href: "/create" },
  { key: "library", label: "Activities", href: "/create/library" },
  { key: "boards", label: "Sessions", href: "/create/boards" },
] as const;

export type CreateTab = (typeof TABS)[number]["key"];

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  live: "Live",
  ended: "Ended",
  published: "Published",
  in_design: "In design",
};

const STATUS_TAG_CLASS: Record<string, string> = {
  ready: "bg-[#E8F1FB] text-[#1B4F8A] border-[#C5DBF0]",
  live: "bg-[#E7F6ED] text-[#1B6B3A] border-[#B9E0C7]",
  ended: "bg-[#F1F0EC] text-[#5C5A55] border-[#DDDAD2]",
  published: "bg-[#E7F6ED] text-[#1B6B3A] border-[#B9E0C7]",
  in_design: "bg-[#F4F3F0] text-[#6C6975] border-[#E0DDD4]",
};

/** Display helper for API statuses (`ready` → `Ready`). */
export function formatStatus(status: string): string {
  if (!status) return status;
  return STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

export function StatusTag({ status }: { status: string }) {
  const label = formatStatus(status);
  const tone = STATUS_TAG_CLASS[status] ?? STATUS_TAG_CLASS.in_design;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap shrink-0 ${tone}`}
    >
      {status === "published" && (
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      )}
      {status === "in_design" && (
        <Pencil className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
      )}
      {label}
    </span>
  );
}

export function formatExerciseFormat(format: string): string {
  if (!format) return format;
  return format.charAt(0).toUpperCase() + format.slice(1);
}

/** Briefs don't store format; map category → display format label. */
export function formatFromCategory(category: string): string {
  if (category === "problem-framing") return "Investigation";
  if (category === "decision-making") return "Branching";
  if (category === "ideation") return "Ideation";
  if (category === "prototyping") return "Prototyping";
  return formatStatus(category);
}

export function formatRanOn(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tabFromPath(path: string): CreateTab {
  if (path.startsWith("/create/library")) return "library";
  if (path.startsWith("/create/boards")) return "boards";
  return "clients";
}

export function CreateShell({
  children,
  actions,
  activeTab,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Override when path alone is not enough */
  activeTab?: CreateTab;
}) {
  const [location] = useLocation();
  const selected = activeTab ?? tabFromPath(location);

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[960px] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <nav
            className="inline-flex items-center gap-1 rounded-full border border-[#E7E4DD] bg-white p-1 shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgba(48,28,160,0.04)]"
            aria-label="Creator sections"
          >
            {TABS.map((tab) => {
              const isActive = selected === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`rounded-full px-5 py-2 text-[15px] font-semibold no-underline whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-[#301CA0] to-[#1A0F58] text-white shadow-[0_8px_24px_rgba(48,28,160,0.28)]"
                      : "text-[#6C6975] hover:bg-[#EAE8F6] hover:text-[#301CA0]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
