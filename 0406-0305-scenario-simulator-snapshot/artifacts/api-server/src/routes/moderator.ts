import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  ListSessionNotesParams,
  CreateSessionNoteParams,
  CreateSessionNoteBody,
  BroadcastNoteBody,
  DismissNoteParams,
  ListSessionAccessRequestsParams,
  CreateSessionAccessRequestParams,
  RespondAccessRequestParams,
  RespondAccessRequestBody,
} from "@workspace/api-zod";
import {
  db,
  sessionsTable,
  workshopsTable,
  moderatorNotesTable,
  accessRequestsTable,
  type ModeratorNoteRow,
  type AccessRequestRow,
} from "@workspace/db";
import { submissionsBus } from "../lib/events";

// Resolve a session's workshop scope so SSE consumers can filter without
// extra round-trips. Returns undefined fields when the session is missing
// (caller is expected to have already validated existence).
async function workshopScopeForSession(
  sessionId: string,
): Promise<{ workshopId?: string; workshopCode?: string }> {
  const rows = await db
    .select({
      workshopId: sessionsTable.workshopId,
      workshopCode: workshopsTable.code,
    })
    .from(sessionsTable)
    .leftJoin(workshopsTable, eq(workshopsTable.id, sessionsTable.workshopId))
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);
  const row = rows[0];
  return {
    workshopId: row?.workshopId ?? undefined,
    workshopCode: row?.workshopCode ?? undefined,
  };
}

const router: IRouter = Router();

function serializeNote(row: ModeratorNoteRow) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    message: row.message,
    templateId: row.templateId,
    createdAt: row.createdAt.toISOString(),
    dismissedAt: row.dismissedAt ? row.dismissedAt.toISOString() : null,
  };
}

function serializeAccess(row: AccessRequestRow) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
  };
}

router.get("/sessions/:id/notes", async (req, res) => {
  const params = ListSessionNotesParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const rows = await db
    .select()
    .from(moderatorNotesTable)
    .where(eq(moderatorNotesTable.sessionId, params.data.id))
    .orderBy(desc(moderatorNotesTable.createdAt));
  return res.json(rows.map(serializeNote));
});

router.post("/sessions/:id/notes", async (req, res) => {
  const params = CreateSessionNoteParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const body = CreateSessionNoteBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }
  const session = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id))
    .limit(1);
  if (!session[0]) return res.status(404).json({ error: "not found" });

  const inserted = await db
    .insert(moderatorNotesTable)
    .values({
      sessionId: params.data.id,
      message: body.data.message,
      templateId: body.data.templateId ?? null,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    req.log.error("failed to insert moderator note");
    return res.status(500).json({ error: "insert failed" });
  }
  const scope = await workshopScopeForSession(row.sessionId);
  submissionsBus.emitSubmission({
    type: "note.created",
    sessionId: row.sessionId,
    workshopId: scope.workshopId,
    workshopCode: scope.workshopCode,
    noteId: row.id,
    at: new Date().toISOString(),
  });
  return res.json(serializeNote(row));
});

router.post("/notes/broadcast", async (req, res) => {
  const body = BroadcastNoteBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }
  const code = body.data.workshopCode.toUpperCase();
  const workshop = await db
    .select({ id: workshopsTable.id, code: workshopsTable.code })
    .from(workshopsTable)
    .where(eq(workshopsTable.code, code))
    .limit(1);
  const ws = workshop[0];
  if (!ws) {
    return res.status(404).json({ error: "workshop not found" });
  }

  const sessions = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(eq(sessionsTable.workshopId, ws.id));
  if (sessions.length === 0) return res.json([]);

  const inserted = await db
    .insert(moderatorNotesTable)
    .values(
      sessions.map((s) => ({
        sessionId: s.id,
        message: body.data.message,
        templateId: body.data.templateId ?? null,
      })),
    )
    .returning();

  const at = new Date().toISOString();
  for (const row of inserted) {
    submissionsBus.emitSubmission({
      type: "note.created",
      sessionId: row.sessionId,
      workshopId: ws.id,
      workshopCode: ws.code,
      noteId: row.id,
      at,
    });
  }
  return res.json(inserted.map(serializeNote));
});

router.post("/notes/:id/dismiss", async (req, res) => {
  const params = DismissNoteParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const updated = await db
    .update(moderatorNotesTable)
    .set({ dismissedAt: new Date() })
    .where(eq(moderatorNotesTable.id, params.data.id))
    .returning();
  const row = updated[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const scope = await workshopScopeForSession(row.sessionId);
  submissionsBus.emitSubmission({
    type: "note.dismissed",
    sessionId: row.sessionId,
    workshopId: scope.workshopId,
    workshopCode: scope.workshopCode,
    noteId: row.id,
    at: new Date().toISOString(),
  });
  return res.json(serializeNote(row));
});

router.get("/sessions/:id/access-requests", async (req, res) => {
  const params = ListSessionAccessRequestsParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const rows = await db
    .select()
    .from(accessRequestsTable)
    .where(eq(accessRequestsTable.sessionId, params.data.id))
    .orderBy(desc(accessRequestsTable.createdAt));
  return res.json(rows.map(serializeAccess));
});

router.post("/sessions/:id/access-requests", async (req, res) => {
  const params = CreateSessionAccessRequestParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const session = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id))
    .limit(1);
  if (!session[0]) return res.status(404).json({ error: "not found" });

  // Atomically dedupe: a partial unique index on (session_id) WHERE
  // status = 'pending' guarantees at most one pending request per session.
  // ON CONFLICT DO NOTHING means concurrent callers race safely — one row
  // is inserted and the other receives no returned row, after which we
  // re-fetch and return the existing pending request.
  const inserted = await db
    .insert(accessRequestsTable)
    .values({ sessionId: params.data.id, status: "pending" })
    .onConflictDoNothing()
    .returning();
  let row = inserted[0];
  if (!row) {
    const existing = await db
      .select()
      .from(accessRequestsTable)
      .where(
        and(
          eq(accessRequestsTable.sessionId, params.data.id),
          eq(accessRequestsTable.status, "pending"),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return res.json(serializeAccess(existing[0]));
    }
    req.log.error("failed to insert access request");
    return res.status(500).json({ error: "insert failed" });
  }
  const scope = await workshopScopeForSession(row.sessionId);
  submissionsBus.emitSubmission({
    type: "access.requested",
    sessionId: row.sessionId,
    workshopId: scope.workshopId,
    workshopCode: scope.workshopCode,
    requestId: row.id,
    at: new Date().toISOString(),
  });
  return res.json(serializeAccess(row));
});

router.post("/access-requests/:id/respond", async (req, res) => {
  const params = RespondAccessRequestParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const body = RespondAccessRequestBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }
  const updated = await db
    .update(accessRequestsTable)
    .set({ status: body.data.status, respondedAt: new Date() })
    .where(eq(accessRequestsTable.id, params.data.id))
    .returning();
  const row = updated[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const scope = await workshopScopeForSession(row.sessionId);
  submissionsBus.emitSubmission({
    type: "access.responded",
    sessionId: row.sessionId,
    workshopId: scope.workshopId,
    workshopCode: scope.workshopCode,
    requestId: row.id,
    status: row.status,
    at: new Date().toISOString(),
  });
  return res.json(serializeAccess(row));
});

export default router;
