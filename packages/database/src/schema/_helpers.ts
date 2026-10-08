import { boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();
export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
/** Marks rows created by the seed script so demo data can be identified / purged. */
export const isSeed = () => boolean("is_seed").notNull().default(false);

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/** numeric columns returned as JS numbers */
export const numericNumber = customType<{ data: number; driverData: string; config: { precision?: number; scale?: number } }>({
  dataType(config) {
    return config?.precision ? `numeric(${config.precision}, ${config.scale ?? 0})` : "numeric";
  },
  fromDriver(v) {
    return Number(v);
  },
  toDriver(v) {
    return String(v);
  },
});
