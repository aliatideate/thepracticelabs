import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const organisationsTable = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type OrganisationRow = typeof organisationsTable.$inferSelect;
export type InsertOrganisationRow = typeof organisationsTable.$inferInsert;
