import { useCurrentFrame } from "remotion";
import { brand } from "../brand";
import { clamp } from "../timing";

type CaptionProps = {
  start: number;
  end: number;
  children: string;
  layout: "wide" | "square";
};

export function Caption({ start, end, children, layout }: CaptionProps) {
  const frame = useCurrentFrame();
  const inOpacity = clamp(frame, [start, start + 14], [0, 1]);
  const outOpacity = clamp(frame, [end - 14, end], [1, 0]);
  const opacity = Math.min(inOpacity, outOpacity);
  const y = clamp(frame, [start, start + 20], [18, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: layout === "wide" ? 260 : 74,
        right: layout === "wide" ? 260 : 74,
        bottom: layout === "wide" ? 44 : 48,
        opacity,
        translate: `0 ${y}px`,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          maxWidth: layout === "wide" ? 1120 : 840,
          padding: layout === "wide" ? "18px 28px" : "16px 22px",
          borderRadius: 999,
          background: "rgba(26, 15, 88, 0.9)",
          color: "white",
          boxShadow: "0 24px 70px rgba(26, 15, 88, 0.25)",
          fontFamily: brand.fonts.sans,
          fontSize: layout === "wide" ? 32 : 30,
          fontWeight: 700,
          lineHeight: 1.16,
          textAlign: "center"
        }}
      >
        {children}
      </div>
    </div>
  );
}
