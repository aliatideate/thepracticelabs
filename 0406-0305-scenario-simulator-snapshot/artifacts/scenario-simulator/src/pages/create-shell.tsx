import React from "react";
import { Link, useLocation } from "wouter";
import { Header } from "../simulation/components";

const TABS = [
  { key: "clients", label: "Clients", href: "/create" },
  { key: "library", label: "Library", href: "/create/library" },
  { key: "boards", label: "Facilitator boards", href: "/create/boards" },
] as const;

export type CreateTab = (typeof TABS)[number]["key"];

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
      <Header hideFlowNav clock={{ startedAt: null, durationMinutes: 30, endedAt: null }} />
      <div className="mx-auto max-w-[960px] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <nav className="flex items-center gap-1" aria-label="Creator sections">
            {TABS.map((tab) => {
              const isActive = selected === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`px-4 py-2 text-[16px] font-semibold rounded-lg no-underline transition-colors ${
                    isActive
                      ? "bg-white text-[#301CA0] border border-[#E7E4DD] shadow-[inset_0_1px_0_#fff]"
                      : "text-[#6C6975] border border-transparent hover:text-[#301CA0]"
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
