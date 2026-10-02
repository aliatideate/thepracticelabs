import { MousePointer2 } from "lucide-react";
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
  const focusEaseIn = clamp(frame, [420, 454], [0, 1]);
  const focusEaseOut = clamp(frame, [626, 660], [1, 0]);
  const focusAmount = Math.min(focusEaseIn, focusEaseOut);
  const scale = layout === "wide" ? 1 + focusAmount * 0.22 : 1 + focusAmount * 0.14;
  const x = layout === "wide" ? focusAmount * -70 : focusAmount * -18;
  const y = layout === "wide" ? focusAmount * -86 : focusAmount * -54;
  const boardTop = layout === "wide" ? 188 : 174;
  const contentWidth = layout === "wide" ? 1696 : 936;
  const gridColumns = layout === "wide" ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const summary = clamp(frame, [674, 710], [0, 1]);

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
        <div style={{ marginBottom: 34 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
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
            <span style={{ marginLeft: 14, fontSize: 20 }}>⌄</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-between",
            marginBottom: 24
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
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: layout === "wide" ? 22 : 18,
              opacity: 1 - summary,
              translate: `0 ${summary * -24}px`
            }}
          >
            {teams.map((team, index) => (
              <TeamCard
                key={team.id}
                team={team}
                index={index}
                layout={layout}
                focused={focusMode && team.id === "wizards"}
                dimmed={focusMode && team.id !== "wizards"}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: summary,
              translate: `0 ${(1 - summary) * 28}px`,
              pointerEvents: "none"
            }}
          >
            <SummaryComparison layout={layout} />
          </div>
        </div>
      </div>
      {focusMode ? <Cursor layout={layout} /> : null}
    </main>
  );
}

function SummaryComparison({ layout }: { layout: "wide" | "square" }) {
  const compact = layout === "square";

  return (
    <div
      style={{
        display: "grid",
        gap: compact ? 12 : 14
      }}
    >
      {teams.map((team, index) => (
        <div
          key={team.id}
          style={{
            minHeight: compact ? 94 : 106,
            borderRadius: 18,
            border: `2px solid ${brand.colors.soft}`,
            background: brand.colors.paper,
            boxShadow: "0 14px 38px rgba(29, 29, 36, 0.07)",
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "320px 1fr 170px",
            alignItems: "center",
            gap: compact ? 6 : 18,
            padding: compact ? "16px 18px" : "0 24px",
            fontFamily: brand.fonts.sans
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0
            }}
          >
            <span style={{ color: brand.colors.muted, fontSize: compact ? 16 : 18 }}>
              Team {index + 1}:
            </span>
            <span style={{ fontSize: compact ? 17 : 20 }}>{team.emoji}</span>
            <span
              style={{
                fontSize: compact ? 20 : 23,
                fontWeight: 800,
                color: brand.colors.charcoal,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {team.displayName}
            </span>
          </div>
          <div
            style={{
              fontSize: compact ? 19 : 25,
              fontWeight: 800,
              color: brand.colors.charcoal,
              lineHeight: 1.12
            }}
          >
            {team.statement}
          </div>
          <div
            style={{
              justifySelf: compact ? "start" : "end",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: compact ? 17 : 20,
              fontWeight: 800,
              color: brand.colors.charcoal
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background:
                  team.confidence === "High"
                    ? brand.colors.success
                    : team.confidence === "Medium"
                      ? brand.colors.warning
                      : brand.colors.error
              }}
            />
            {team.confidence}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cursor({ layout }: { layout: "wide" | "square" }) {
  const frame = useCurrentFrame();
  const travel = clamp(frame, [558, 594], [0, 1]);
  const click = clamp(frame, [594, 604], [0, 1]) - clamp(frame, [604, 616], [0, 1]);
  const startX = layout === "wide" ? 1370 : 758;
  const startY = layout === "wide" ? 740 : 560;
  const endX = layout === "wide" ? 1510 : 828;
  const endY = layout === "wide" ? 446 : 404;

  return (
    <div
      style={{
        position: "absolute",
        left: startX + (endX - startX) * travel,
        top: startY + (endY - startY) * travel,
        zIndex: 6,
        scale: 1 - click * 0.16,
        color: brand.colors.purple,
        filter: "drop-shadow(0 14px 22px rgba(26, 15, 88, 0.35))"
      }}
    >
      <MousePointer2 size={layout === "wide" ? 54 : 48} fill="white" />
    </div>
  );
}
