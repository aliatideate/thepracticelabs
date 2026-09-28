import { customType, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { usersTable } from "./users";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const ASSET_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type AssetMimeType = (typeof ASSET_MIME_TYPES)[number];

export const assetsTable = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => usersTable.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type", { enum: ASSET_MIME_TYPES }).notNull(),
  byteSize: integer("byte_size").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type AssetRow = typeof assetsTable.$inferSelect;
export type InsertAssetRow = typeof assetsTable.$inferInsert;
