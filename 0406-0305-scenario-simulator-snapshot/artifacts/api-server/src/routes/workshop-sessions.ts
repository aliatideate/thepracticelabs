import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, workshopSessionsTable } from "@workspace/db";
import { issueWorkshopFacilitatorToken, requireAuth } from "../lib/auth";
import {
  legacyAliasCodes,
  workshopSessionSummary,
} from "../lib/workshop-session";

const router: IRouter = Router();

router.get("/legacy-aliases", async (_req, res) => {
  return res.json(await legacyAliasCodes());
});

router.get("/workshop-sessions/by-code/:code", async (req, res) => {
  const summary = await workshopSessionSummary(String(req.params.code ?? ""));
  if (!summary) return res.status(404).json({ error: "not_found" });
  return res.json(summary);
});

/** Issue or regenerate a per-session facilitator token (raw returned once). */
router.post(
  "/workshop-sessions/:id/facilitator-token",
  requireAuth,
  async (req, res) => {
    const auth = req.auth;
    if (!auth || auth.kind !== "user") {
      return res.status(401).json({ error: "unauthorized" });
    }

    const id = String(req.params.id);
    const rows = await db
      .select()
      .from(workshopSessionsTable)
      .where(
        and(eq(workshopSessionsTable.id, id), eq(workshopSessionsTable.orgId, auth.user.orgId)),
      )
      .limit(1);
    const session = rows[0];
    if (!session) {
      return res.status(404).json({ error: "not_found" });
    }

    const { token } = await issueWorkshopFacilitatorToken(session.id);
    return res.json({
      workshopSessionId: session.id,
      token,
      facilitatePath: `/s/${session.workshopCode}/facilitate?token=${encodeURIComponent(token)}`,
    });
  },
);

export default router;
