import { brand } from "../brand";
import { steps } from "../data/demoData";

type ProgressPillsProps = {
  currentStep: number;
  compact?: boolean;
};

export function ProgressPills({ currentStep, compact }: ProgressPillsProps) {
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
                isPast || isCurrent ? brand.colors.purple : brand.colors.soft
              }`,
              background: isPast
                ? brand.colors.purple
                : isCurrent
                  ? brand.colors.paper
                  : "#F1EFE7",
              color: isPast
                ? "white"
                : isCurrent
                  ? brand.colors.purple
                  : brand.colors.muted,
              fontSize: compact ? 13 : 15,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}
