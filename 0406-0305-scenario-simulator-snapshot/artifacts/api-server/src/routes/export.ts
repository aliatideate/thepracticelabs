import { assertFacilitator } from "../lib/auth";
import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, sessionsTable, workshopsTable } from "@workspace/db";
import { loadScenario } from "../lib/content";
import { WORKSHOP_CODE } from "../lib/workshop";

const router: IRouter = Router();

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

router.get("/export", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const format = String(req.query.format ?? "json");
  const scenario = loadScenario();

  const ws = await db
    .select()
    .from(workshopsTable)
    .where(eq(workshopsTable.code, WORKSHOP_CODE))
    .limit(1);
  if (!ws[0]) return res.json(format === "csv" ? "" : []);

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.workshopId, ws[0].id))
    .orderBy(asc(sessionsTable.teamName));

  const records = rows.map((row) => {
    const stakeholder = scenario.stakeholders.find(
      (s) => s.id === row.selectedStakeholder,
    );
    const evidence = scenario.evidence.find(
      (e) => e.id === row.selectedEvidenceSource,
    );
    const answers = row.answers ?? [];
    const questionTexts = answers.map((a) => {
      const q = stakeholder?.questions.find((qq) => qq.id === a.questionId);
      return q?.text ?? a.questionId;
    });
    const timings = row.stepTimings?.totals ?? {};
    const toSec = (ms: number | undefined) => Number(((ms ?? 0) / 1000).toFixed(1));
    const stepTimingsSeconds = {
      brief: toSec(timings.brief),
      stakeholder: toSec(timings.stakeholder),
      interview: toSec(timings.interview),
      evidence: toSec(timings.evidence),
      define: toSec(timings.define),
      submit: toSec(timings.submit),
    };
    return {
      team: row.displayName?.trim()
        ? `${row.emoji ? `${row.emoji} ` : ""}${row.displayName.trim()}`
        : row.teamName,
      slot: row.teamName,
      emoji: row.emoji || "",
      displayName: row.displayName || "",
      stakeholderId: row.selectedStakeholder,
      stakeholderName: stakeholder?.name ?? null,
      evidenceId: row.selectedEvidenceSource,
      evidenceTitle: evidence?.title ?? null,
      questionsAsked: questionTexts,
      questionIds: answers.map((a) => a.questionId),
      problemStatement: row.problemStatement,
      confidence: row.confidence,
      stepTimingsSeconds,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      currentScreen: row.currentScreen,
    };
  });

  if (format === "csv") {
    const header = [
      "team",
      "slot",
      "stakeholder",
      "evidence",
      "question_1",
      "question_2",
      "question_3",
      "problem_statement",
      "confidence",
      "s_brief",
      "s_stakeholder",
      "s_interview",
      "s_evidence",
      "s_define",
      "s_submit",
    ];
    const lines = [header.join(",")];
    for (const r of records) {
      lines.push(
        [
          csvEscape(r.team),
          csvEscape(r.slot),
          csvEscape(r.stakeholderName ?? ""),
          csvEscape(r.evidenceTitle ?? ""),
          csvEscape(r.questionsAsked[0] ?? ""),
          csvEscape(r.questionsAsked[1] ?? ""),
          csvEscape(r.questionsAsked[2] ?? ""),
          csvEscape(r.problemStatement),
          csvEscape(r.confidence ?? ""),
          String(r.stepTimingsSeconds.brief),
          String(r.stepTimingsSeconds.stakeholder),
          String(r.stepTimingsSeconds.interview),
          String(r.stepTimingsSeconds.evidence),
          String(r.stepTimingsSeconds.define),
          String(r.stepTimingsSeconds.submit),
        ].join(","),
      );
    }
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader(
      "content-disposition",
      "attachment; filename=session-outputs.csv",
    );
    return res.send(lines.join("\n"));
  }

  return res.json({ scenarioId: scenario.id, teams: records });
});

export default router;
