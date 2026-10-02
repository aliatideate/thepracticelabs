import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Header } from "../components/Header";
import { DashboardShell } from "../components/DashboardShell";
import { Caption } from "../components/Caption";
import { brand } from "../brand";
import { clamp } from "../timing";

type FacilitatorViewProps = {
  layout: "wide" | "square";
};

const captions = [
  { start: 56, end: 138, text: "A live facilitator view starts empty, then fills as teams enter the Demand Spike exercise." },
  { start: 150, end: 246, text: "Team progress updates without the facilitator leaving the dashboard." },
  { start: 314, end: 420, text: "Stakeholders, evidence, and confidence build into a scannable operating picture." },
  { start: 444, end: 606, text: "When a team needs help, the interface surfaces the request in context." },
  { start: 622, end: 704, text: "By the end, the facilitator can compare every team’s final problem framing." }
];

export function FacilitatorView({ layout }: FacilitatorViewProps) {
  const frame = useCurrentFrame();
  const endOpacity = clamp(frame, [782, 820], [0, 1]);
  const dashboardOpacity = 1 - clamp(frame, [782, 816], [0, 1]);

  return (
    <AbsoluteFill style={{ background: brand.colors.warm, overflow: "hidden" }}>
      <div style={{ opacity: dashboardOpacity }}>
        <DashboardShell layout={layout} />
        <Header layout={layout} />
        {captions.map((caption) => (
          <Caption
            key={caption.start}
            start={caption.start}
            end={caption.end}
            layout={layout}
          >
            {caption.text}
          </Caption>
        ))}
      </div>
      <EndCard layout={layout} opacity={endOpacity} />
    </AbsoluteFill>
  );
}

function EndCard({
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
        background:
          "linear-gradient(45deg, #1A0F58 0%, #301CA0 52%, #84C5B1 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontFamily: brand.fonts.sans
      }}
    >
      <div
        style={{
          width: layout === "wide" ? 820 : 760,
          textAlign: "center"
        }}
      >
        <Img
          src={staticFile("assets/logo-practice-labs.png")}
          style={{
            width: layout === "wide" ? 430 : 390,
            display: "block",
            margin: "0 auto 34px",
            objectFit: "contain"
          }}
        />
        <div
          style={{
            fontFamily: brand.fonts.serif,
            fontSize: layout === "wide" ? 76 : 64,
            lineHeight: 1,
            fontWeight: 400
          }}
        >
          Facilitator view
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: layout === "wide" ? 28 : 26,
            color: "rgba(255,255,255,0.78)",
            fontWeight: 700
          }}
        >
          Demand Spike team progress animation
        </div>
      </div>
    </AbsoluteFill>
  );
}
