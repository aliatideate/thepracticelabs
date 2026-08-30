import { pool } from "@workspace/db";
import { logger } from "./logger";

// Idempotent SQL bootstrap that gets the DB into the shape required by the
// drizzle schema, including backfilling existing sessions to a default
// workshop. Runs at server startup before listen().
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
      VALUES ('DEFAULT', 'Default Workshop')
      ON CONFLICT (code) DO NOTHING
    `);

    // Add workshop_id column to sessions if it does not yet exist. We add it
    // nullable first so existing rows can be backfilled before the NOT NULL.
    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE
    `);

    await client.query(`
      UPDATE sessions
      SET workshop_id = (SELECT id FROM workshops WHERE code = 'DEFAULT')
      WHERE workshop_id IS NULL
    `);

    await client.query(`
      ALTER TABLE sessions
      ALTER COLUMN workshop_id SET NOT NULL
    `);

    // Drop the legacy global unique constraint on team_name if it still exists.
    await client.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_team_name_unique`,
    );
    await client.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_team_name_key`,
    );

    // Add the composite unique (workshop_id, team_name).
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'sessions_workshop_team_unique'
        ) THEN
          ALTER TABLE sessions
          ADD CONSTRAINT sessions_workshop_team_unique UNIQUE (workshop_id, team_name);
        END IF;
      END $$
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
