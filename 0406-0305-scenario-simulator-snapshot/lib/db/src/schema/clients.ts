import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { usersTable } from "./users";

export const clientsTable = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    notes: text("notes"),
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
    orgNameIdx: index("clients_org_name_idx").on(t.orgId, t.name),
  }),
);

export type ClientRow = typeof clientsTable.$inferSelect;
export type InsertClientRow = typeof clientsTable.$inferInsert;
