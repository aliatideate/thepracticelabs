import { Img, staticFile, useCurrentFrame } from "remotion";
import { brand } from "../brand";
import { clamp, linear } from "../timing";

type HeaderProps = {
  layout: "wide" | "square";
};

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function Header({ layout }: HeaderProps) {
  const frame = useCurrentFrame();
  const height = layout === "wide" ? 138 : 132;
  const timerStart = 118;
  const reveal = clamp(frame, [8, 42], [-height, 0]);
  const seconds = Math.max(
    12 * 60 + 20,
    30 * 60 - Math.floor(linear(frame, [timerStart, 800], [0, 1060]))
  );

  return (
    <header
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: 10,
        translate: `0 ${reveal}px`,
        background:
          "linear-gradient(45deg, #1A0F58 0%, #301CA0 50%, #84C5B1 100%)",
        color: "white",
        boxShadow: "0 8px 0 rgba(232, 229, 220, 0.85)"
      }}
    >
      <div
        style={{
          width: layout === "wide" ? 1696 : 936,
          height: "100%",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: layout === "wide" ? 272 : 238 }}>
            <Img
              src={staticFile("assets/logo-practice-labs.png")}
              style={{
                width: "100%",
                display: "block",
                objectFit: "contain"
              }}
            />
          </div>
          <div
            style={{
              width: 1,
              height: layout === "wide" ? 58 : 54,
              background: "rgba(255, 255, 255, 0.35)"
            }}
          />
          <div>
            <div
              style={{
                fontFamily: brand.fonts.sans,
                fontSize: layout === "wide" ? 28 : 25,
                lineHeight: 1.2,
                fontWeight: 700
              }}
            >
              Session 1: Foundations + Problem Framing
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: brand.fonts.sans,
                fontSize: layout === "wide" ? 24 : 22,
                color: "rgba(255, 255, 255, 0.72)"
              }}
            >
              The Demand Spike
            </div>
          </div>
        </div>
        <div
          style={{
            minWidth: layout === "wide" ? 132 : 122,
            height: layout === "wide" ? 58 : 54,
            borderRadius: 999,
            border: "2px solid rgba(255, 255, 255, 0.24)",
            background: "rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: brand.fonts.mono,
            fontSize: layout === "wide" ? 27 : 25,
            color: "white",
            fontWeight: 800
          }}
        >
          {formatTimer(seconds)}
        </div>
      </div>
    </header>
  );
}
