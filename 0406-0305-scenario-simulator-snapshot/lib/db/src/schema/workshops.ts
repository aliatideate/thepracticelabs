import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const workshopsTable = pgTable("workshops", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type WorkshopRow = typeof workshopsTable.$inferSelect;
export type InsertWorkshopRow = typeof workshopsTable.$inferInsert;

export const DEFAULT_WORKSHOP_CODE = "DEFAULT";
export const DEFAULT_WORKSHOP_LABEL = "Default Workshop";
