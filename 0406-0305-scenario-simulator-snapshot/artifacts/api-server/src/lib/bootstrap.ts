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
      INSERT INTO workshops (code, label)
      VALUES ('MART', 'Unilever Session 2 — A Week in the Field')
      ON CONFLICT (code) DO NOTHING
    `);
    await client.query(`
      INSERT INTO workshops (code, label)
      VALUES ('MART-TRY', 'Session 2 try-out')
      ON CONFLICT (code) DO NOTHING
    `);
    await client.query(`
      INSERT INTO workshops (code, label)
      VALUES ('DEMAND-TRY', 'Session 1 try-out')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
        team_name TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        emoji TEXT NOT NULL DEFAULT '',
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
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT ''
    `);
    await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT ''
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
      INSERT INTO session_config (workshop_id, duration_minutes)
      SELECT id, 15 FROM workshops WHERE code = 'MART'
      ON CONFLICT (workshop_id) DO NOTHING
    `);
    await client.query(`
      INSERT INTO session_config (workshop_id, duration_minutes)
      SELECT id, 15 FROM workshops WHERE code = 'MART-TRY'
      ON CONFLICT (workshop_id) DO NOTHING
    `);
    await client.query(`
      INSERT INTO session_config (workshop_id, duration_minutes)
      SELECT id, 30 FROM workshops WHERE code = 'DEMAND-TRY'
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS session_archives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        team_count INTEGER NOT NULL DEFAULT 0,
        submitted_count INTEGER NOT NULL DEFAULT 0,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        scenario_id TEXT NOT NULL DEFAULT '',
        payload JSONB NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS session_archives_workshop_saved_at
      ON session_archives (workshop_id, saved_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS decision_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
        team_name TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        emoji TEXT NOT NULL DEFAULT '',
        current_screen TEXT NOT NULL DEFAULT 'intro',
        decision_index INTEGER NOT NULL DEFAULT 0,
        choices JSONB NOT NULL DEFAULT '[]'::jsonb,
        flagged_for_debrief BOOLEAN NOT NULL DEFAULT FALSE,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'decision_sessions_workshop_team_unique'
        ) THEN
          ALTER TABLE decision_sessions
          ADD CONSTRAINT decision_sessions_workshop_team_unique UNIQUE (workshop_id, team_name);
        END IF;
      END $$
    `);

    // --- Creator-side Phase 1 (additive only; no runtime table changes) ---

    await client.query(`
      CREATE TABLE IF NOT EXISTS organisations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password_hash TEXT,
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
        END IF;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        notes TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ
      )
    `);
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS clients_org_name_idx ON clients (org_id, name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS clients_org_archived_idx ON clients (org_id, archived_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        format TEXT NOT NULL,
        status TEXT NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT exercises_category_check CHECK (
          category IN ('problem-framing', 'decision-making', 'ideation', 'prototyping')
        ),
        CONSTRAINT exercises_format_check CHECK (
          format IN ('investigation', 'branching')
        ),
        CONSTRAINT exercises_status_check CHECK (
          status IN ('published', 'in_design')
        )
      )
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'exercises_org_title_unique'
        ) THEN
          ALTER TABLE exercises
          ADD CONSTRAINT exercises_org_title_unique UNIQUE (org_id, title);
        END IF;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        content JSONB NOT NULL,
        facilitator_notes TEXT,
        variables JSONB NOT NULL DEFAULT '[]'::jsonb,
        default_assets JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'exercise_versions_exercise_version_unique'
        ) THEN
          ALTER TABLE exercise_versions
          ADD CONSTRAINT exercise_versions_exercise_version_unique UNIQUE (exercise_id, version);
        END IF;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id),
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        bytes BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT assets_mime_type_check CHECK (
          mime_type IN ('image/png', 'image/jpeg', 'image/webp')
        )
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS client_copies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        exercise_id UUID NOT NULL REFERENCES exercises(id),
        exercise_version_id UUID NOT NULL REFERENCES exercise_versions(id),
        variable_values JSONB NOT NULL DEFAULT '{}'::jsonb,
        logo_asset_id UUID REFERENCES assets(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'client_copies_client_exercise_unique'
        ) THEN
          ALTER TABLE client_copies
          ADD CONSTRAINT client_copies_client_exercise_unique UNIQUE (client_id, exercise_id);
        END IF;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workshop_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id),
        client_copy_id UUID NOT NULL REFERENCES client_copies(id),
        exercise_version_id UUID NOT NULL REFERENCES exercise_versions(id),
        variable_values JSONB NOT NULL DEFAULT '{}'::jsonb,
        title TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        team_count INTEGER NOT NULL,
        mode TEXT NOT NULL,
        workshop_code TEXT NOT NULL,
        runtime_workshop_id UUID REFERENCES workshops(id),
        resolved_content JSONB NOT NULL,
        resolved_facilitator_notes TEXT,
        facilitator_token_hash TEXT,
        status TEXT NOT NULL,
        is_preview BOOLEAN NOT NULL DEFAULT FALSE,
        preview_expires_at TIMESTAMPTZ,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        CONSTRAINT workshop_sessions_status_check CHECK (
          status IN ('ready', 'live', 'ended')
        ),
        CONSTRAINT workshop_sessions_team_count_check CHECK (
          team_count BETWEEN 1 AND 10
        ),
        CONSTRAINT workshop_sessions_mode_check CHECK (
          mode IN ('in_person', 'remote', 'hybrid')
        )
      )
    `);
    await client.query(`
      ALTER TABLE workshop_sessions
      ADD COLUMN IF NOT EXISTS runtime_workshop_id UUID REFERENCES workshops(id)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workshop_sessions_workshop_code_unique
      ON workshop_sessions (workshop_code)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS workshop_sessions_client_created_idx
      ON workshop_sessions (client_id, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS workshop_sessions_runtime_workshop_idx
      ON workshop_sessions (runtime_workshop_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS workshop_sessions_org_status_idx
      ON workshop_sessions (org_id, status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS workshop_sessions_preview_cleanup_idx
      ON workshop_sessions (preview_expires_at)
      WHERE is_preview = TRUE
    `);

    // Archives → creator session link (after workshop_sessions exists)
    await client.query(`
      ALTER TABLE session_archives
      ADD COLUMN IF NOT EXISTS workshop_session_id UUID
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'session_archives_workshop_session_id_fkey'
        ) THEN
          ALTER TABLE session_archives
          ADD CONSTRAINT session_archives_workshop_session_id_fkey
          FOREIGN KEY (workshop_session_id) REFERENCES workshop_sessions(id);
        END IF;
      END $$
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS session_archives_workshop_session_idx
      ON session_archives (workshop_session_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS briefs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        client_id UUID REFERENCES clients(id),
        title TEXT NOT NULL DEFAULT 'Untitled',
        category TEXT NOT NULL,
        audience TEXT NOT NULL,
        skill TEXT NOT NULL,
        debrief_focus TEXT NOT NULL,
        setting TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        team_count INTEGER NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_design',
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT briefs_category_check CHECK (
          category IN ('problem-framing', 'decision-making', 'ideation', 'prototyping')
        ),
        CONSTRAINT briefs_mode_check CHECK (
          mode IN ('in_person', 'remote', 'hybrid')
        ),
        CONSTRAINT briefs_status_check CHECK (
          status IN ('in_design')
        )
      )
    `);
    await client.query(`
      ALTER TABLE briefs ADD COLUMN IF NOT EXISTS title TEXT
    `);
    await client.query(`
      UPDATE briefs SET title = 'Untitled' WHERE title IS NULL OR title = ''
    `);
    await client.query(`
      ALTER TABLE briefs ALTER COLUMN title SET DEFAULT 'Untitled'
    `);
    await client.query(`
      ALTER TABLE briefs ALTER COLUMN title SET NOT NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at)
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
