import { brand } from "../brand";
import { steps } from "../data/demoData";
import { useCurrentFrame } from "remotion";

type ProgressPillsProps = {
  currentStep: number;
  compact?: boolean;
};

export function ProgressPills({ currentStep, compact }: ProgressPillsProps) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        gap: compact ? 6 : 8,
        width: "100%"
      }}
    >
      {steps.map((step, index) => {
        const isPast = index < currentStep;
        const isCurrent = index === currentStep;
        const isSubmitted = index === steps.length - 1 && currentStep >= steps.length - 1;
        const pulse = isCurrent ? Math.sin(frame * 0.09) * 0.5 + 0.5 : 0;
        const currentBlue = `rgb(${Math.round(48 + pulse * 72)}, ${Math.round(
          28 + pulse * 70
        )}, ${Math.round(160 + pulse * 64)})`;
        return (
          <div
            key={step}
            style={{
              height: compact ? 32 : 38,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 8px",
              border: `2px solid ${
                isSubmitted
                  ? brand.colors.success
                  : isPast || isCurrent
                    ? brand.colors.purple
                    : brand.colors.soft
              }`,
              background: isSubmitted
                ? brand.colors.success
                : isCurrent
                  ? currentBlue
                  : isPast
                    ? brand.colors.purple
                    : "#F1EFE7",
              color: isPast || isCurrent || isSubmitted
                ? "white"
                : brand.colors.muted,
              fontSize: compact ? 13 : 15,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              scale: isCurrent && !isSubmitted ? 1 + pulse * 0.04 : 1
            }}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}
