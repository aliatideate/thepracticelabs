import React from "react";
import { useLocation } from "wouter";
import { useNarrowScreen } from "../lib/useNarrowScreen";
import { useScenario } from "../lib/scenario";

function shareUrl(path: string) {
  const origin = window.location.origin;
  if (path.startsWith("/demand/try")) return `${origin}/demand/try`;
  if (path.startsWith("/demand")) return `${origin}/demand`;
  if (path.startsWith("/mart/try") || path.startsWith("/try")) return `${origin}/mart/try`;
  if (path.startsWith("/mart")) return `${origin}/mart`;
  if (path.startsWith("/facilitate")) return `${origin}/facilitate`;
  return `${origin}/demand`;
}

function isMart(path: string) {
  const search = window.location.search;
  if (path.startsWith("/facilitate") && new URLSearchParams(search).get("tab") === "mart") return true;
  return path.startsWith("/mart") || path.startsWith("/try");
}

export default function DesktopGate({ children }: { children: React.ReactNode }) {
  const [path] = useLocation();
  const narrow = useNarrowScreen();
  const scenario = useScenario();

  if (path.startsWith("/print") || !narrow) {
    return <>{children}</>;
  }

  const url = shareUrl(path);
  const mart = isMart(path);
  const title = mart ? "A Week in the Field" : scenario.title;
  const kicker = mart ? "The week needs a laptop" : "This is a table exercise";
  const body = mart
    ? "Six branches, three doors, and a 15-minute clock are built for a shared screen — not a phone. Open this same link on a computer to play."
    : "Teams work from one shared laptop in the breakout. Open this same link on a computer to join.";

  return (
    <div className={mart ? "mart-shell w-full" : "min-h-dvh w-full bg-[#F8F6EF]"}>
      <header className="tpl-nav-mesh text-white relative overflow-hidden">
        <div className="animated-gradient" aria-hidden />
        <div className="relative z-10 px-5 py-5 flex items-center gap-3">
          <img
            src="/content/media/logo-practice-labs.svg"
            alt="the Practice Labs"
            className="h-[28px] w-auto"
          />
          <div className="min-w-0">
            <div className="text-[13px] font-medium leading-snug">{mart ? "Mart" : "Demand"}</div>
            <div className="text-[13px] text-white/75 leading-snug">{title}</div>
          </div>
        </div>
      </header>

      <div className="px-5 py-10 flex justify-center">
        <div
          className={
            mart
              ? "mart-card w-full max-w-[420px] p-6"
              : "w-full max-w-[420px] rounded-xl border border-[#E7E4DD] bg-white p-6"
          }
        >
          {mart ? (
            <p className="mart-pixel text-[26px] text-[#301CA0] mt-0 mb-3">{kicker}</p>
          ) : (
            <h1 className="text-[28px] mt-0 mb-3">{kicker}</h1>
          )}
          <p className="text-[16px] leading-relaxed m-0 mb-5">{body}</p>
          <p className="text-[13px] uppercase tracking-wide font-semibold text-[#6C6975] m-0 mb-2">
            Open on a computer
          </p>
          <p className="m-0 rounded-xl bg-[#F8F6EF] border border-[#E7E4DD] px-3 py-3 text-[15px] font-medium break-all text-[#301CA0]">
            {url}
          </p>
        </div>
      </div>
    </div>
  );
}
