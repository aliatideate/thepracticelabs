import { Check, PhoneCall } from "lucide-react";
import type { ReactNode } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { brand } from "../brand";
import {
  evidenceSources,
  getConfidenceRevealAt,
  getStepIndex,
  isAttentionActive,
  stakeholders,
  Team
} from "../data/demoData";
import { clamp } from "../timing";
import { ProgressPills } from "./ProgressPills";

type TeamCardProps = {
  team: Team;
  index: number;
  layout: "wide" | "square";
  focused: boolean;
  dimmed: boolean;
  finalMode: boolean;
};

function confidenceColor(confidence: Team["confidence"]) {
  if (confidence === "High") return brand.colors.success;
  if (confidence === "Medium") return brand.colors.warning;
  return brand.colors.error;
}

function confidenceBackground(confidence: Team["confidence"]) {
  if (confidence === "High") return "rgba(46, 125, 91, 0.25)";
  if (confidence === "Medium") return "rgba(183, 121, 31, 0.25)";
  return "rgba(180, 35, 24, 0.25)";
}

function mix(from: [number, number, number], to: [number, number, number], amount: number) {
  return `rgb(${from
    .map((value, index) => Math.round(value + (to[index] - value) * amount))
    .join(", ")})`;
}

function typeText(text: string, frame: number, start: number, duration: number) {
  const progress = clamp(frame, [start, start + duration], [0, 1]);
  return text.slice(0, Math.floor(progress * text.length));
}

export function TeamCard({
  team,
  index,
  layout,
  focused,
  dimmed,
  finalMode
}: TeamCardProps) {
  const frame = useCurrentFrame();
  const entered = frame >= team.joinAt;
  const currentStep = entered ? getStepIndex(team, frame) : -1;
  const stakeholder = stakeholders[team.stakeholder];
  const attentionActive = isAttentionActive(team, frame);
  const compact = layout === "square";
  const showStakeholder = frame >= team.stakeholderAt;
  const showEvidence = frame >= team.evidenceAt;
  const showStatement = frame >= team.defineAt;
  const showSubmit = frame >= team.submitAt;
  const showConfidence = frame >= getConfidenceRevealAt(team);
  const breathe = focused ? 1 + Math.sin(frame / 8) * 0.01 : 1;
  const attentionPulse = attentionActive ? Math.sin(frame * 0.14) * 0.5 + 0.5 : 0;
  const attentionClickState = frame >= 486 && frame < 512;
  const attentionFill = attentionClickState ? 1 : attentionPulse * 0.75;
  const typedName = typeText(team.displayName, frame, team.joinAt, 20);
  const typedStatement = typeText(team.statement, frame, team.defineAt, 34);

  return (
    <div
      style={{
        position: "relative",
        minHeight: finalMode ? (compact ? 118 : 138) : compact ? 194 : 226,
        borderRadius: 18,
        border: `2px solid ${
          focused ? "rgba(48, 28, 160, 0.5)" : "rgba(231, 228, 221, 0.95)"
        }`,
        background: brand.colors.paper,
        boxShadow: focused
          ? "0 28px 80px rgba(48, 28, 160, 0.24)"
          : "0 18px 48px rgba(29, 29, 36, 0.08)",
        opacity: dimmed ? 0.35 : 1,
        scale: breathe,
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
          background: entered ? brand.colors.paleMint : "#F5F2EA"
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
          <span style={{ fontSize: compact ? 16 : 18 }}>{typedName ? team.emoji : ""}</span>
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
            {entered ? typedName : "Awaiting team update"}
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
              color: attentionFill > 0.55 ? "white" : brand.colors.error,
              background: mix([253, 244, 241], [223, 43, 30], attentionFill),
              border: `2px solid ${mix([220, 138, 130], [223, 43, 30], attentionFill)}`,
              boxShadow: `0 0 0 ${Math.round(attentionPulse * 9)}px rgba(180, 35, 24, ${0.1 * (1 - attentionPulse)})`,
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
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: compact ? 34 : 38,
              padding: compact ? "0 12px" : "0 15px",
              borderRadius: 999,
              color: brand.colors.muted,
              background: "#FBFAF5",
              border: `2px solid ${brand.colors.soft}`,
              fontSize: compact ? 13 : 15,
              fontWeight: 800,
              whiteSpace: "nowrap"
            }}
          >
            <PhoneCall size={compact ? 15 : 17} strokeWidth={2.2} />
            Request to join team
          </div>
        )}
      </div>
      <div
        style={{
          padding: finalMode
            ? compact
              ? "14px 18px 18px"
              : "16px 22px 20px"
            : compact
              ? "16px 18px 18px"
              : "20px 22px 24px",
          display: "grid",
          gap: compact ? 14 : 18
        }}
      >
        {finalMode ? null : <ProgressPills currentStep={currentStep} compact={compact} />}
        {finalMode ? null : (
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
        )}
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
                fontWeight: 500,
                color: brand.colors.charcoal
              }}
            >
              {typedStatement}
            </div>
          </InfoPanel>
          <InfoPanel
            label="Confidence"
            visible={showConfidence}
            compact={compact}
            background={showConfidence ? confidenceBackground(team.confidence) : undefined}
          >
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
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: confidenceColor(team.confidence),
                  boxShadow: `0 0 0 8px ${
                    team.confidence === "High"
                      ? brand.colors.paleMint
                      : team.confidence === "Medium"
                        ? "rgba(183, 121, 31, 0.12)"
                        : "rgba(180, 35, 24, 0.12)"
                  }`
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
  background,
  children
}: {
  label: string;
  visible: boolean;
  compact: boolean;
  background?: string;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const reveal = visible ? clamp(frame, [0, 1], [1, 1]) : 0;

  return (
    <div
      style={{
        minHeight: compact ? 74 : 88,
        borderRadius: 14,
        background: visible ? background ?? "#FBFAF5" : "#F2EFE8",
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
