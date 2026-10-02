import { Check, PhoneCall } from "lucide-react";
import type { ReactNode } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { brand } from "../brand";
import {
  evidenceSources,
  getStepIndex,
  isAttentionActive,
  stakeholders,
  Team
} from "../data/demoData";
import { clamp, softSpring } from "../timing";
import { ProgressPills } from "./ProgressPills";

type TeamCardProps = {
  team: Team;
  index: number;
  layout: "wide" | "square";
  focused: boolean;
  dimmed: boolean;
};

function confidenceColor(confidence: Team["confidence"]) {
  if (confidence === "High") return brand.colors.success;
  if (confidence === "Medium") return brand.colors.warning;
  return brand.colors.error;
}

export function TeamCard({ team, index, layout, focused, dimmed }: TeamCardProps) {
  const frame = useCurrentFrame();
  const entered = frame >= team.joinAt;
  const enter = softSpring(frame, team.joinAt);
  const currentStep = getStepIndex(team, frame);
  const stakeholder = stakeholders[team.stakeholder];
  const attentionActive = isAttentionActive(team, frame);
  const compact = layout === "square";
  const showStakeholder = frame >= team.stakeholderAt;
  const showEvidence = frame >= team.evidenceAt;
  const showStatement = frame >= team.defineAt;
  const showSubmit = frame >= team.submitAt;
  const breathe = focused ? 1 + Math.sin(frame / 8) * 0.01 : 1;

  return (
    <div
      style={{
        position: "relative",
        minHeight: compact ? 194 : 226,
        borderRadius: 18,
        border: `2px solid ${
          focused ? "rgba(48, 28, 160, 0.5)" : "rgba(231, 228, 221, 0.95)"
        }`,
        background: brand.colors.paper,
        boxShadow: focused
          ? "0 28px 80px rgba(48, 28, 160, 0.24)"
          : "0 18px 48px rgba(29, 29, 36, 0.08)",
        opacity: entered ? (dimmed ? 0.35 : 1) : 0,
        translate: `0 ${entered ? (1 - enter) * 36 : 36}px`,
        scale: entered ? enter * breathe : 0.98,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          height: compact ? 56 : 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: compact ? "0 18px" : "0 22px",
          borderBottom: `2px solid ${brand.colors.soft}`,
          background: "#FEFDF8"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            minWidth: 0,
            fontFamily: brand.fonts.sans
          }}
        >
          <span
            style={{
              color: brand.colors.muted,
              fontSize: compact ? 16 : 18,
              whiteSpace: "nowrap"
            }}
          >
            Team {index + 1}:
          </span>
          <span style={{ fontSize: compact ? 16 : 18 }}>{team.emoji}</span>
          <span
            style={{
              color: brand.colors.charcoal,
              fontSize: compact ? 19 : 22,
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {team.displayName}
          </span>
        </div>
        {attentionActive ? (
          <div
            className="attention-pill"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              height: compact ? 36 : 42,
              padding: compact ? "0 14px" : "0 18px",
              borderRadius: 999,
              color: brand.colors.muted,
              background: "#F9F7F1",
              border: `2px solid ${brand.colors.soft}`,
              fontSize: compact ? 15 : 17,
              fontWeight: 700
            }}
          >
            <PhoneCall size={compact ? 17 : 20} strokeWidth={2.2} />
            Attention requested
          </div>
        ) : showSubmit ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: compact ? 34 : 38,
              padding: compact ? "0 12px" : "0 15px",
              borderRadius: 999,
              color: brand.colors.success,
              background: brand.colors.paleMint,
              fontSize: compact ? 14 : 16,
              fontWeight: 800
            }}
          >
            <Check size={compact ? 16 : 18} />
            Submitted
          </div>
        ) : null}
      </div>
      <div
        style={{
          padding: compact ? "16px 18px 18px" : "20px 22px 24px",
          display: "grid",
          gap: compact ? 14 : 18
        }}
      >
        <ProgressPills currentStep={currentStep} compact={compact} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "0.95fr 1.25fr",
            gap: compact ? 10 : 14,
            alignItems: "stretch"
          }}
        >
          <InfoPanel
            label="Stakeholder"
            visible={showStakeholder}
            compact={compact}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Img
                src={staticFile(stakeholder.avatar)}
                style={{
                  width: compact ? 38 : 44,
                  height: compact ? 38 : 44,
                  borderRadius: 999,
                  objectFit: "cover",
                  border: `2px solid ${brand.colors.soft}`
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: compact ? 17 : 19,
                    fontWeight: 800,
                    color: brand.colors.charcoal,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {stakeholder.name}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: compact ? 13 : 15,
                    color: brand.colors.muted
                  }}
                >
                  {stakeholder.role}
                </div>
              </div>
            </div>
          </InfoPanel>
          <InfoPanel label="Evidence source" visible={showEvidence} compact={compact}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: compact ? 38 : 44,
                fontSize: compact ? 17 : 19,
                fontWeight: 800,
                color: brand.colors.charcoal,
                lineHeight: 1.14
              }}
            >
              {evidenceSources[team.evidence]}
            </div>
          </InfoPanel>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "1fr 160px",
            gap: compact ? 10 : 14
          }}
        >
          <InfoPanel label="Problem statement" visible={showStatement} compact={compact}>
            <div
              style={{
                minHeight: compact ? 40 : 48,
                display: "flex",
                alignItems: "center",
                fontSize: compact ? 19 : 23,
                lineHeight: 1.16,
                fontWeight: 800,
                color: brand.colors.charcoal
              }}
            >
              {team.statement}
            </div>
          </InfoPanel>
          <InfoPanel label="Confidence" visible={showSubmit} compact={compact}>
            <div
              style={{
                minHeight: compact ? 34 : 48,
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
                  background: confidenceColor(team.confidence)
                }}
              />
              {team.confidence}
            </div>
          </InfoPanel>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({
  label,
  visible,
  compact,
  children
}: {
  label: string;
  visible: boolean;
  compact: boolean;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const reveal = visible ? clamp(frame, [0, 1], [1, 1]) : 0;

  return (
    <div
      style={{
        minHeight: compact ? 74 : 88,
        borderRadius: 14,
        background: visible ? "#FBFAF5" : "#F2EFE8",
        border: `2px solid ${brand.colors.soft}`,
        padding: compact ? "10px 12px" : "12px 14px",
        opacity: visible ? reveal : 0.6
      }}
    >
      <div
        style={{
          marginBottom: 7,
          color: brand.colors.muted,
          fontSize: compact ? 12 : 14,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0
        }}
      >
        {label}
      </div>
      {visible ? (
        children
      ) : (
        <div
          style={{
            height: compact ? 26 : 32,
            width: "78%",
            borderRadius: 999,
            background: "rgba(108, 105, 117, 0.14)"
          }}
        />
      )}
    </div>
  );
}
