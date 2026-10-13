import { pgTable, text, integer, timestamp, customType } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Uploaded files when the database is the file store (the default on Vercel, whose disk is
 * temporary). Public files (listing photos) are served by /media with long-lived CDN caching, so
 * each photo is read from here only occasionally.
 */
export const storedFiles = pgTable("stored_files", {
  key: text("key").primaryKey(),
  visibility: text("visibility").notNull(),
  data: bytea("data").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
