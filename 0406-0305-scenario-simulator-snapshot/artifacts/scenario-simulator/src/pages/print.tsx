import React from "react";
import { useScenario } from "../lib/scenario";
import { DocumentPanel } from "../simulation/documentBlocks";
import { SESSION_LABEL } from "../lib/constants";

export default function PrintPack() {
  const scenario = useScenario();
  return (
    <div className="bg-white text-[#1D1D24] max-w-[900px] mx-auto px-8 py-10 print:max-w-none">
      <p className="text-[14px] text-[#6C6975] no-print mb-4">
        File → Print → Save as PDF. This pack is the offline fallback.
      </p>
      <h1 className="text-[32px] mb-1">{SESSION_LABEL}</h1>
      <p className="text-[18px] mt-0 mb-8">{scenario.title}</p>

      <section className="mb-10 break-inside-avoid">
        <h2 className="text-[24px]">{scenario.company.name}</h2>
        <p className="text-[#6C6975]">{scenario.company.descriptor}</p>
        <p>{scenario.company.overview}</p>
        <dl>
          {scenario.company.facts.map((f) => (
            <div key={f.label} className="mb-1">
              <dt className="inline font-semibold">{f.label}: </dt>
              <dd className="inline m-0">{f.value}</dd>
            </div>
          ))}
        </dl>
        <h3 className="text-[20px]">The situation</h3>
        <p>{scenario.situation}</p>
      </section>

      {scenario.stakeholders.map((s) => (
        <section key={s.id} className="mb-10 break-inside-avoid">
          <h2 className="text-[24px]">
            {s.name} — {s.role}
          </h2>
          <p>{s.blurb}</p>
          <p>
            <em>{s.sideNote}</em>
          </p>
          <p className="text-[14px] text-[#6C6975]">
            Pool of {s.questions.length}; ask up to {s.askLimit}.
          </p>
          {s.questions.map((q) => (
            <div key={q.id} className="mb-4">
              <p className="font-semibold m-0">{q.text}</p>
              <p className="mt-1">{q.answer}</p>
            </div>
          ))}
        </section>
      ))}

      {scenario.evidence.map((e) => (
        <section key={e.id} className="mb-10">
          <DocumentPanel
            title={e.title}
            subtitle={e.subtitle}
            sourceLabel={e.sourceLabel}
            blocks={e.blocks}
          />
        </section>
      ))}

      <section>
        <h2 className="text-[24px]">Submission prompt</h2>
        <p>{scenario.submission.prompt}</p>
        <p className="text-[#6C6975]">{scenario.submission.placeholder}</p>
      </section>
    </div>
  );
}
