import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function bootstrapDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO workshops (code, label)
      VALUES ('DEFAULT', 'Unilever Session 1')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
        team_name TEXT NOT NULL,
        current_screen TEXT NOT NULL DEFAULT 'brief',
        selected_stakeholder TEXT,
        selected_evidence_source TEXT,
        answers JSONB NOT NULL DEFAULT '[]'::jsonb,
        problem_statement TEXT NOT NULL DEFAULT '',
        confidence TEXT,
        assumption TEXT NOT NULL DEFAULT '',
        flagged_for_debrief BOOLEAN NOT NULL DEFAULT FALSE,
        step_timings JSONB NOT NULL DEFAULT '{"totals":{},"currentStep":null,"currentStepStartedAt":null}'::jsonb,
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE
    `);
    await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS step_timings JSONB NOT NULL DEFAULT '{"totals":{},"currentStep":null,"currentStepStartedAt":null}'::jsonb
    `);

    await client.query(`
      UPDATE sessions
      SET workshop_id = (SELECT id FROM workshops WHERE code = 'DEFAULT')
      WHERE workshop_id IS NULL
    `);

    await client.query(`
      ALTER TABLE sessions ALTER COLUMN workshop_id SET NOT NULL
    `);

    await client.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_team_name_unique`,
    );
    await client.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_team_name_key`,
    );

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sessions_workshop_team_unique'
        ) THEN
          ALTER TABLE sessions
          ADD CONSTRAINT sessions_workshop_team_unique UNIQUE (workshop_id, team_name);
        END IF;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS session_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workshop_id UUID NOT NULL UNIQUE REFERENCES workshops(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        ended_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO session_config (workshop_id, duration_minutes)
      SELECT id, 30 FROM workshops WHERE code = 'DEFAULT'
      ON CONFLICT (workshop_id) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS moderator_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        template_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        dismissed_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        responded_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS access_requests_pending_per_session
      ON access_requests (session_id) WHERE status = 'pending'
    `);

    await client.query("COMMIT");
    logger.info("database bootstrap complete");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    logger.error({ err }, "database bootstrap failed");
    throw err;
  } finally {
    client.release();
  }
}
