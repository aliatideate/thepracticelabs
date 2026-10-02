import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Header } from "../components/Header";
import { DashboardShell } from "../components/DashboardShell";
import { brand } from "../brand";
import { clamp } from "../timing";

type FacilitatorViewProps = {
  layout: "wide" | "square";
};

export function FacilitatorView({ layout }: FacilitatorViewProps) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: brand.colors.warm, overflow: "hidden" }}>
      <DashboardShell layout={layout} />
      <Header layout={layout} />
      <CompletionModal layout={layout} opacity={clamp(frame, [812, 842], [0, 1])} />
    </AbsoluteFill>
  );
}

function CompletionModal({
  layout,
  opacity
}: {
  layout: "wide" | "square";
  opacity: number;
}) {
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: "rgba(26, 15, 88, 0.24)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: brand.colors.charcoal,
        fontFamily: brand.fonts.sans
      }}
    >
      <div
        style={{
          width: layout === "wide" ? 640 : 650,
          minHeight: layout === "wide" ? 340 : 330,
          borderRadius: 24,
          background: brand.colors.paper,
          border: `2px solid ${brand.colors.soft}`,
          boxShadow: "0 34px 90px rgba(26, 15, 88, 0.28)",
          padding: layout === "wide" ? "46px 54px" : "44px 48px",
          textAlign: "center",
          scale: 0.94 + opacity * 0.06
        }}
      >
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 999,
            margin: "0 auto 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: brand.colors.paleMint,
            color: brand.colors.success
          }}
        >
          <CheckCircle2 size={42} strokeWidth={2.4} />
        </div>
        <div
          style={{
            fontFamily: brand.fonts.serif,
            fontSize: layout === "wide" ? 46 : 42,
            lineHeight: 1.05,
            fontWeight: 400
          }}
        >
          All 5 teams have completed the exercise.
        </div>
        <button
          style={{
            marginTop: 34,
            border: 0,
            height: 58,
            borderRadius: 999,
            padding: "0 28px",
            background: brand.colors.purple,
            color: "white",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontFamily: brand.fonts.sans,
            fontSize: layout === "wide" ? 21 : 20,
            fontWeight: 800
          }}
        >
          Start combined debrief
          <ArrowRight size={22} strokeWidth={2.5} />
        </button>
      </div>
    </AbsoluteFill>
  );
}
