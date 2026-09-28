import React from "react";
import { Link, useLocation } from "wouter";
import { Header } from "../simulation/components";

const TABS = [
  { key: "clients", label: "Clients", href: "/create" },
  { key: "library", label: "Library", href: "/create/library" },
  { key: "boards", label: "Boards", href: "/create/boards" },] as const;

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
