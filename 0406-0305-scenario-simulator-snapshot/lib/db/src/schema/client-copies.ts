import { jsonb, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { clientsTable } from "./clients";
import { exercisesTable } from "./exercises";
import { exerciseVersionsTable } from "./exercise-versions";
import { assetsTable } from "./assets";
import { usersTable } from "./users";

export const clientCopiesTable = pgTable(
  "client_copies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercisesTable.id),
    exerciseVersionId: uuid("exercise_version_id")
      .notNull()
      .references(() => exerciseVersionsTable.id),
    variableValues: jsonb("variable_values")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    logoAssetId: uuid("logo_asset_id").references(() => assetsTable.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    clientExerciseUnique: unique("client_copies_client_exercise_unique").on(
      t.clientId,
      t.exerciseId,
    ),
  }),
);

export type ClientCopyRow = typeof clientCopiesTable.$inferSelect;
export type InsertClientCopyRow = typeof clientCopiesTable.$inferInsert;
