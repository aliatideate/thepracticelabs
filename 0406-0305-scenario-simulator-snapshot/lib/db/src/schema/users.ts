import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  /** Null until a password is set (seed or later). Phase 2 login must refuse null. */
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof usersTable.$inferSelect;
export type InsertUserRow = typeof usersTable.$inferInsert;
