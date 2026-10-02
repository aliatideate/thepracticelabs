import { ChevronDown, Hand, MousePointer2 } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { brand } from "../brand";
import { teams } from "../data/demoData";
import { clamp } from "../timing";
import { TeamCard } from "./TeamCard";

type DashboardShellProps = {
  layout: "wide" | "square";
};

export function DashboardShell({ layout }: DashboardShellProps) {
  const frame = useCurrentFrame();
  const joinedTeams = teams.filter((team) => frame >= team.joinAt).length;
  const focusMode = frame >= 420 && frame <= 660;
  const finalFit = clamp(frame, [704, 735], [0, 1]);
  const dropdownReveal = clamp(frame, [48, 72], [0, 1]);
  const titleReveal = clamp(frame, [70, 98], [0, 1]);
  const focusEaseIn = clamp(frame, [420, 454], [0, 1]);
  const focusEaseOut = clamp(frame, [626, 660], [1, 0]);
  const focusAmount = Math.min(focusEaseIn, focusEaseOut);
  const scale =
    (layout === "wide" ? 1 + focusAmount * 0.22 : 1 + focusAmount * 0.14) -
    finalFit * (layout === "wide" ? 0.1 : 0.08);
  const x = layout === "wide" ? focusAmount * -70 : focusAmount * -18;
  const y =
    (layout === "wide" ? focusAmount * -86 : focusAmount * -54) -
    finalFit * (layout === "wide" ? 58 : 42);
  const boardTop = layout === "wide" ? 188 : 174;
  const contentWidth = layout === "wide" ? 1696 : 936;
  const gridColumns = layout === "wide" ? "repeat(2, minmax(0, 1fr))" : "1fr";

  return (
    <main
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: boardTop,
        background: brand.colors.warm,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          width: contentWidth,
          margin: "0 auto",
          scale,
          translate: `${x}px ${y}px`,
          transformOrigin: layout === "wide" ? "72% 48%" : "50% 43%"
        }}
      >
        <div
          style={{
            marginBottom: 34,
            opacity: dropdownReveal,
            translate: `0 ${(1 - dropdownReveal) * 18}px`
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              minHeight: layout === "wide" ? 58 : 54,
              padding: layout === "wide" ? "0 34px" : "0 28px",
              borderRadius: 999,
              background: brand.colors.purple,
              color: "white",
              fontFamily: brand.fonts.sans,
              fontSize: layout === "wide" ? 22 : 20,
              fontWeight: 800
            }}
          >
            Problem Framing: Demand Spike
            <ChevronDown size={layout === "wide" ? 22 : 20} strokeWidth={2.6} />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-between",
            marginBottom: 24,
            opacity: titleReveal,
            translate: `0 ${(1 - titleReveal) * 18}px`
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: brand.colors.purpleDark,
                fontFamily: brand.fonts.serif,
                fontSize: layout === "wide" ? 58 : 48,
                lineHeight: 1,
                fontWeight: 400
              }}
            >
              Demand Spike
            </h1>
            <div
              style={{
                marginTop: 14,
                color: brand.colors.muted,
                fontFamily: brand.fonts.sans,
                fontSize: layout === "wide" ? 23 : 21
              }}
            >
              Facilitator dashboard · live team progress
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: brand.colors.charcoal,
              fontFamily: brand.fonts.sans,
              fontWeight: 800,
              fontSize: layout === "wide" ? 22 : 20
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: brand.colors.success,
                boxShadow: `0 0 0 8px ${brand.colors.paleMint}`
              }}
            />
            Live · {joinedTeams} teams
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: layout === "wide" ? 22 : 18
          }}
        >
          {teams.map((team, index) => {
            const row = layout === "wide" ? Math.floor(index / 2) : index;
            const rowReveal = clamp(frame, [104 + row * 16, 134 + row * 16], [0, 1]);
            return (
              <div
                key={team.id}
                style={{
                  opacity: rowReveal,
                  transform: `perspective(900px) rotateX(${(1 - rowReveal) * -16}deg)`,
                  transformOrigin: "top center",
                  translate: `0 ${(1 - rowReveal) * 16}px`
                }}
              >
                <TeamCard
                  team={team}
                  index={index}
                  layout={layout}
                  focused={focusMode && team.id === "wizards"}
                  dimmed={focusMode && team.id !== "wizards"}
                  finalMode={false}
                />
              </div>
            );
          })}
        </div>
      </div>
      {focusMode ? <Cursor layout={layout} /> : null}
    </main>
  );
}

function Cursor({ layout }: { layout: "wide" | "square" }) {
  const frame = useCurrentFrame();
  const travel = clamp(frame, [452, 472], [0, 1]);
  const click = clamp(frame, [490, 496], [0, 1]) - clamp(frame, [506, 514], [0, 1]);
  const opacity = clamp(frame, [444, 454], [0, 1]) * (1 - clamp(frame, [516, 532], [0, 1]));
  const startX = layout === "wide" ? 1370 : 758;
  const startY = layout === "wide" ? 740 : 560;
  const endX = layout === "wide" ? 1712 : 902;
  const endY = layout === "wide" ? 258 : 258;

  return (
    <div
      style={{
        position: "absolute",
        left: startX + (endX - startX) * travel,
        top: startY + (endY - startY) * travel,
        zIndex: 6,
        opacity,
        scale: 1 - click * 0.16,
        color: brand.colors.purple,
        filter: "drop-shadow(0 14px 22px rgba(26, 15, 88, 0.35))"
      }}
    >
      {travel > 0.96 ? (
        <Hand size={layout === "wide" ? 52 : 46} fill="white" />
      ) : (
        <MousePointer2 size={layout === "wide" ? 54 : 48} fill="white" />
      )}
    </div>
  );
}
