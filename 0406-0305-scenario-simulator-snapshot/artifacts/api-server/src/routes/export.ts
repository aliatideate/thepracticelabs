import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, sessionsTable, workshopsTable } from "@workspace/db";
import { loadScenario } from "../lib/content";
import {
  WORKSHOP_CODE,
  checkFacilitatorSecret,
} from "../lib/workshop";

const router: IRouter = Router();

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

router.get("/export", async (req, res) => {
  if (!checkFacilitatorSecret(String(req.headers["x-facilitator-secret"] ?? req.query.secret ?? ""))) {
    return res.status(401).json({ error: "unauthorized" });
  }
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
    return {
      team: row.teamName,
      stakeholderId: row.selectedStakeholder,
      stakeholderName: stakeholder?.name ?? null,
      evidenceId: row.selectedEvidenceSource,
      evidenceTitle: evidence?.title ?? null,
      questionsAsked: questionTexts,
      questionIds: answers.map((a) => a.questionId),
      problemStatement: row.problemStatement,
      confidence: row.confidence,
      stepTimingsMs: timings,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      currentScreen: row.currentScreen,
    };
  });

  if (format === "csv") {
    const header = [
      "team",
      "stakeholder",
      "evidence",
      "questions_asked",
      "problem_statement",
      "confidence",
      "ms_brief",
      "ms_stakeholder",
      "ms_interview",
      "ms_evidence",
      "ms_define",
      "ms_submit",
    ];
    const lines = [header.join(",")];
    for (const r of records) {
      lines.push(
        [
          csvEscape(r.team),
          csvEscape(r.stakeholderName ?? ""),
          csvEscape(r.evidenceTitle ?? ""),
          csvEscape(r.questionsAsked.join(" | ")),
          csvEscape(r.problemStatement),
          csvEscape(r.confidence ?? ""),
          String(r.stepTimingsMs.brief ?? 0),
          String(r.stepTimingsMs.stakeholder ?? 0),
          String(r.stepTimingsMs.interview ?? 0),
          String(r.stepTimingsMs.evidence ?? 0),
          String(r.stepTimingsMs.define ?? 0),
          String(r.stepTimingsMs.submit ?? 0),
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
