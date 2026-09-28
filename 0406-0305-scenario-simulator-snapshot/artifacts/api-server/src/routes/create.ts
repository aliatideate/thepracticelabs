import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  assetsTable,
  clientCopiesTable,
  clientsTable,
  db,
  exercisesTable,
  exerciseVersionsTable,
  sessionArchivesTable,
  sessionConfigTable,
  workshopSessionsTable,
  workshopsTable,
  EXERCISE_CATEGORIES,
  WORKSHOP_SESSION_MODES,
  type ExerciseCategory,
} from "@workspace/db";
import { issueWorkshopFacilitatorToken, requireAuth } from "../lib/auth";
import { allocateUniqueWorkshopCode, resolveContentTokens } from "../lib/resolve-content";

const router: IRouter = Router();

const MAX_ASSET_BYTES = 500 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function orgUser(req: Request) {
  const auth = req.auth;
  if (!auth || auth.kind !== "user") return null;
  return auth.user;
}

router.use("/create", requireAuth);

router.get("/create/clients", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.orgId, user.orgId))
    .orderBy(asc(clientsTable.name));

  const sessions = await db
    .select({
      id: workshopSessionsTable.id,
      clientId: workshopSessionsTable.clientId,
      title: workshopSessionsTable.title,
      status: workshopSessionsTable.status,
      workshopCode: workshopSessionsTable.workshopCode,
      createdAt: workshopSessionsTable.createdAt,
      updatedAt: workshopSessionsTable.updatedAt,
      isPreview: workshopSessionsTable.isPreview,
    })
    .from(workshopSessionsTable)
    .where(
      and(
        eq(workshopSessionsTable.orgId, user.orgId),
        eq(workshopSessionsTable.isPreview, false),
      ),
    )
    .orderBy(desc(workshopSessionsTable.updatedAt));

  return res.json({
    clients: clients.map((c) => {
      const clientSessions = sessions.filter((s) => s.clientId === c.id);
      const timestamps = [
        c.updatedAt.getTime(),
        c.createdAt.getTime(),
        ...clientSessions.map((s) => s.updatedAt.getTime()),
      ];
      const lastModifiedAt = new Date(Math.max(...timestamps)).toISOString();
      return {
        id: c.id,
        name: c.name,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastModifiedAt,
        sessions: clientSessions.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          workshopCode: s.workshopCode,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      };
    }),
  });
});

router.post("/create/clients", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const name = String(req.body?.name ?? "").trim();
  const notes = req.body?.notes != null ? String(req.body.notes).trim() : null;
  if (!name || name.length > 120) {
    return res.status(400).json({ error: "name required (max 120)" });
  }
  const [row] = await db
    .insert(clientsTable)
    .values({
      orgId: user.orgId,
      name,
      notes: notes || null,
      createdBy: user.id,
    })
    .returning();
  return res.status(201).json({
    id: row.id,
    name: row.name,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  });
});

router.get("/create/clients/:id", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const id = String(req.params.id);
  const clients = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, user.orgId)))
    .limit(1);
  const client = clients[0];
  if (!client) return res.status(404).json({ error: "not_found" });

  const sessions = await db
    .select()
    .from(workshopSessionsTable)
    .where(
      and(
        eq(workshopSessionsTable.clientId, client.id),
        eq(workshopSessionsTable.isPreview, false),
      ),
    )
    .orderBy(desc(workshopSessionsTable.createdAt));

  return res.json({
    id: client.id,
    name: client.name,
    notes: client.notes,
    createdAt: client.createdAt.toISOString(),
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      workshopCode: s.workshopCode,
      durationMinutes: s.durationMinutes,
      teamCount: s.teamCount,
      mode: s.mode,
      createdAt: s.createdAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
    })),
  });
});

router.patch("/create/clients/:id", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const id = String(req.params.id);
  const patch: Partial<typeof clientsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof req.body?.name === "string") {
    const name = req.body.name.trim();
    if (!name || name.length > 120) return res.status(400).json({ error: "invalid name" });
    patch.name = name;
  }
  if (req.body?.notes !== undefined) {
    patch.notes = req.body.notes == null ? null : String(req.body.notes).trim() || null;
  }
  const updated = await db
    .update(clientsTable)
    .set(patch)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.orgId, user.orgId)))
    .returning();
  if (!updated[0]) return res.status(404).json({ error: "not_found" });
  return res.json({
    id: updated[0].id,
    name: updated[0].name,
    notes: updated[0].notes,
  });
});

router.get("/create/exercises", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined;
  if (category && !(EXERCISE_CATEGORIES as readonly string[]).includes(category)) {
    return res.status(400).json({ error: "invalid category" });
  }

  const rows = await db
    .select({
      exercise: exercisesTable,
      latestVersion: sql<number>`(
        SELECT MAX(v.version) FROM exercise_versions v WHERE v.exercise_id = ${exercisesTable.id}
      )`.as("latest_version"),
    })
    .from(exercisesTable)
    .where(
      category
        ? and(
            eq(exercisesTable.orgId, user.orgId),
            eq(exercisesTable.category, category as ExerciseCategory),
          )
        : eq(exercisesTable.orgId, user.orgId),
    )
    .orderBy(asc(exercisesTable.category), asc(exercisesTable.title));

  return res.json({
    categories: EXERCISE_CATEGORIES,
    exercises: rows.map((r) => ({
      id: r.exercise.id,
      title: r.exercise.title,
      category: r.exercise.category,
      format: r.exercise.format,
      status: r.exercise.status,
      latestVersion: r.latestVersion,
    })),
  });
});

router.get("/create/exercises/:id", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const id = String(req.params.id);
  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(and(eq(exercisesTable.id, id), eq(exercisesTable.orgId, user.orgId)))
    .limit(1);
  const exercise = exercises[0];
  if (!exercise) return res.status(404).json({ error: "not_found" });

  const versions = await db
    .select()
    .from(exerciseVersionsTable)
    .where(eq(exerciseVersionsTable.exerciseId, exercise.id))
    .orderBy(desc(exerciseVersionsTable.version));

  const copies = await db
    .select({
      id: clientCopiesTable.id,
      clientId: clientCopiesTable.clientId,
      clientName: clientsTable.name,
      exerciseVersionId: clientCopiesTable.exerciseVersionId,
      variableValues: clientCopiesTable.variableValues,
    })
    .from(clientCopiesTable)
    .innerJoin(clientsTable, eq(clientsTable.id, clientCopiesTable.clientId))
    .where(eq(clientCopiesTable.exerciseId, exercise.id));

  return res.json({
    id: exercise.id,
    title: exercise.title,
    category: exercise.category,
    format: exercise.format,
    status: exercise.status,
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      variables: v.variables,
      facilitatorNotes: v.facilitatorNotes,
      createdAt: v.createdAt.toISOString(),
    })),
    clientCopies: copies,
  });
});

router.post("/create/assets", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const { filename, mimeType, base64 } = req.body ?? {};
  if (typeof filename !== "string" || typeof mimeType !== "string" || typeof base64 !== "string") {
    return res.status(400).json({ error: "filename, mimeType, base64 required" });
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return res.status(400).json({ error: "mime must be png, jpeg, or webp" });
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.length > MAX_ASSET_BYTES) {
    return res.status(400).json({ error: "file must be ≤ 500 KB" });
  }
  const [row] = await db
    .insert(assetsTable)
    .values({
      orgId: user.orgId,
      createdBy: user.id,
      filename: filename.slice(0, 200),
      mimeType: mimeType as "image/png" | "image/jpeg" | "image/webp",
      byteSize: bytes.length,
      bytes,
    })
    .returning({ id: assetsTable.id, filename: assetsTable.filename, mimeType: assetsTable.mimeType });
  return res.status(201).json({
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    url: `/api/create/assets/${row.id}`,
  });
});

router.get("/create/assets/:id", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const rows = await db
    .select()
    .from(assetsTable)
    .where(and(eq(assetsTable.id, String(req.params.id)), eq(assetsTable.orgId, user.orgId)))
    .limit(1);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "not_found" });
  res.setHeader("Content-Type", row.mimeType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  return res.send(row.bytes);
});

type CreateSessionBody = {
  clientId: string;
  exerciseId: string;
  title: string;
  durationMinutes: number;
  teamCount: number;
  mode: (typeof WORKSHOP_SESSION_MODES)[number];
  variableValues?: Record<string, unknown>;
  logoAssetId?: string | null;
  isPreview?: boolean;
};

async function latestPublishedVersion(exerciseId: string, orgId: string) {
  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(
      and(
        eq(exercisesTable.id, exerciseId),
        eq(exercisesTable.orgId, orgId),
        eq(exercisesTable.status, "published"),
      ),
    )
    .limit(1);
  const exercise = exercises[0];
  if (!exercise) return null;
  const versions = await db
    .select()
    .from(exerciseVersionsTable)
    .where(eq(exerciseVersionsTable.exerciseId, exercise.id))
    .orderBy(desc(exerciseVersionsTable.version))
    .limit(1);
  const version = versions[0];
  if (!version) return null;
  return { exercise, version };
}

async function upsertClientCopy(opts: {
  orgId: string;
  clientId: string;
  exerciseId: string;
  exerciseVersionId: string;
  variableValues: Record<string, unknown>;
  logoAssetId: string | null;
  createdBy: string;
}) {
  const existing = await db
    .select()
    .from(clientCopiesTable)
    .where(
      and(
        eq(clientCopiesTable.clientId, opts.clientId),
        eq(clientCopiesTable.exerciseId, opts.exerciseId),
      ),
    )
    .limit(1);
  if (existing[0]) {
    const [row] = await db
      .update(clientCopiesTable)
      .set({
        exerciseVersionId: opts.exerciseVersionId,
        variableValues: opts.variableValues,
        logoAssetId: opts.logoAssetId,
        updatedAt: new Date(),
      })
      .where(eq(clientCopiesTable.id, existing[0].id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(clientCopiesTable)
    .values({
      orgId: opts.orgId,
      clientId: opts.clientId,
      exerciseId: opts.exerciseId,
      exerciseVersionId: opts.exerciseVersionId,
      variableValues: opts.variableValues,
      logoAssetId: opts.logoAssetId,
      createdBy: opts.createdBy,
    })
    .returning();
  return row;
}

async function createWorkshopSession(opts: {
  user: { id: string; orgId: string };
  body: CreateSessionBody;
}) {
  const {
    clientId,
    exerciseId,
    title,
    durationMinutes,
    teamCount,
    mode,
    variableValues = {},
    logoAssetId = null,
    isPreview = false,
  } = opts.body;

  if (!title?.trim() || title.trim().length > 160) {
    return { error: "invalid title", status: 400 as const };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
    return { error: "durationMinutes must be 5–180", status: 400 as const };
  }
  if (!Number.isInteger(teamCount) || teamCount < 1 || teamCount > 10) {
    return { error: "teamCount must be 1–10", status: 400 as const };
  }
  if (!(WORKSHOP_SESSION_MODES as readonly string[]).includes(mode)) {
    return { error: "invalid mode", status: 400 as const };
  }

  const clients = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.orgId, opts.user.orgId)))
    .limit(1);
  if (!clients[0]) return { error: "client not found", status: 404 as const };

  const published = await latestPublishedVersion(exerciseId, opts.user.orgId);
  if (!published) return { error: "exercise not found or not published", status: 404 as const };

  const copy = await upsertClientCopy({
    orgId: opts.user.orgId,
    clientId,
    exerciseId,
    exerciseVersionId: published.version.id,
    variableValues,
    logoAssetId,
    createdBy: opts.user.id,
  });

  const resolvedContent = resolveContentTokens(published.version.content, variableValues);
  const code = await allocateUniqueWorkshopCode();

  const [workshop] = await db
    .insert(workshopsTable)
    .values({
      code,
      label: isPreview ? `Preview — ${title.trim()}` : title.trim(),
    })
    .returning();

  await db.insert(sessionConfigTable).values({
    workshopId: workshop.id,
    durationMinutes: Math.round(durationMinutes),
  });

  const [session] = await db
    .insert(workshopSessionsTable)
    .values({
      orgId: opts.user.orgId,
      clientId,
      clientCopyId: copy.id,
      exerciseVersionId: published.version.id,
      variableValues,
      title: title.trim(),
      durationMinutes: Math.round(durationMinutes),
      teamCount,
      mode,
      workshopCode: code,
      runtimeWorkshopId: workshop.id,
      resolvedContent,
      resolvedFacilitatorNotes: published.version.facilitatorNotes,
      status: "ready",
      isPreview,
      previewExpiresAt: isPreview ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      createdBy: opts.user.id,
    })
    .returning();

  const { token } = await issueWorkshopFacilitatorToken(session.id);

  return {
    status: 201 as const,
    session: {
      id: session.id,
      title: session.title,
      workshopCode: session.workshopCode,
      runtimeWorkshopCode: code,
      format: published.exercise.format,
      status: session.status,
      durationMinutes: session.durationMinutes,
      teamCount: session.teamCount,
      mode: session.mode,
      isPreview: session.isPreview,
      variableValues: session.variableValues,
      paths: {
        join: `/s/${session.workshopCode}`,
        facilitate: `/s/${session.workshopCode}/facilitate`,
        tryOut: `/s/${session.workshopCode}/try`,
        print:
          published.exercise.format === "investigation"
            ? `/s/${session.workshopCode}/print`
            : null,
      },
      facilitatorToken: token,
    },
  };
}

router.post("/create/sessions", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const result = await createWorkshopSession({
    user,
    body: { ...(req.body as CreateSessionBody), isPreview: false },
  });
  if ("error" in result) return res.status(result.status).json({ error: result.error });
  return res.status(201).json(result.session);
});

router.post("/create/sessions/preview", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const result = await createWorkshopSession({
    user,
    body: { ...(req.body as CreateSessionBody), isPreview: true },
  });
  if ("error" in result) return res.status(result.status).json({ error: result.error });
  return res.status(201).json(result.session);
});

router.get("/create/sessions/:id", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const id = String(req.params.id);
  const rows = await db
    .select({
      session: workshopSessionsTable,
      format: exercisesTable.format,
      exerciseTitle: exercisesTable.title,
      clientName: clientsTable.name,
      runtimeCode: workshopsTable.code,
    })
    .from(workshopSessionsTable)
    .innerJoin(
      exerciseVersionsTable,
      eq(exerciseVersionsTable.id, workshopSessionsTable.exerciseVersionId),
    )
    .innerJoin(exercisesTable, eq(exercisesTable.id, exerciseVersionsTable.exerciseId))
    .innerJoin(clientsTable, eq(clientsTable.id, workshopSessionsTable.clientId))
    .leftJoin(workshopsTable, eq(workshopsTable.id, workshopSessionsTable.runtimeWorkshopId))
    .where(
      and(eq(workshopSessionsTable.id, id), eq(workshopSessionsTable.orgId, user.orgId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "not_found" });

  const archives = row.session.runtimeWorkshopId
    ? await db
        .select({
          id: sessionArchivesTable.id,
          savedAt: sessionArchivesTable.savedAt,
          teamCount: sessionArchivesTable.teamCount,
          submittedCount: sessionArchivesTable.submittedCount,
          durationMinutes: sessionArchivesTable.durationMinutes,
        })
        .from(sessionArchivesTable)
        .where(eq(sessionArchivesTable.workshopSessionId, row.session.id))
        .orderBy(desc(sessionArchivesTable.savedAt))
    : [];

  return res.json({
    id: row.session.id,
    title: row.session.title,
    clientId: row.session.clientId,
    clientName: row.clientName,
    exerciseTitle: row.exerciseTitle,
    format: row.format,
    workshopCode: row.session.workshopCode,
    runtimeWorkshopCode: row.runtimeCode,
    status: row.session.status,
    durationMinutes: row.session.durationMinutes,
    teamCount: row.session.teamCount,
    mode: row.session.mode,
    isPreview: row.session.isPreview,
    variableValues: row.session.variableValues,
    createdAt: row.session.createdAt.toISOString(),
    archives: archives.map((a) => ({
      id: a.id,
      savedAt: a.savedAt.toISOString(),
      teamCount: a.teamCount,
      submittedCount: a.submittedCount,
      durationMinutes: a.durationMinutes,
    })),
    paths: {
      join: `/s/${row.session.workshopCode}`,
      facilitate: `/s/${row.session.workshopCode}/facilitate`,
      tryOut: `/s/${row.session.workshopCode}/try`,
      print: row.format === "investigation" ? `/s/${row.session.workshopCode}/print` : null,
    },
  });
});

/** Prefill customise from existing client copy */
router.get("/create/clients/:clientId/copies/:exerciseId", async (req, res) => {
  const user = orgUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const rows = await db
    .select({
      copy: clientCopiesTable,
      variables: exerciseVersionsTable.variables,
    })
    .from(clientCopiesTable)
    .innerJoin(
      exerciseVersionsTable,
      eq(exerciseVersionsTable.id, clientCopiesTable.exerciseVersionId),
    )
    .where(
      and(
        eq(clientCopiesTable.clientId, String(req.params.clientId)),
        eq(clientCopiesTable.exerciseId, String(req.params.exerciseId)),
        eq(clientCopiesTable.orgId, user.orgId),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    const published = await latestPublishedVersion(String(req.params.exerciseId), user.orgId);
    if (!published) return res.status(404).json({ error: "not_found" });
    return res.json({
      variableValues: {},
      variables: published.version.variables,
      exerciseVersionId: published.version.id,
      logoAssetId: null,
    });
  }
  return res.json({
    variableValues: rows[0].copy.variableValues,
    variables: rows[0].variables,
    exerciseVersionId: rows[0].copy.exerciseVersionId,
    logoAssetId: rows[0].copy.logoAssetId,
  });
});

export default router;
