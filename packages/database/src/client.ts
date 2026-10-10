import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

const DEFAULT_DEV_URL = "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx";

declare global {
  // eslint-disable-next-line no-var
  var __propertyxDb: { sql: postgres.Sql; db: Database } | undefined;
}

/**
 * Transaction-mode poolers (Supabase pooler on port 6543, PgBouncer, Neon "-pooler" hosts)
 * don't support prepared statements. Override with DB_PREPARE=true|false.
 */
function usePrepared(url: string) {
  if (process.env.DB_PREPARE) return process.env.DB_PREPARE === "true";
  return !/:6543\b|pgbouncer=true|-pooler\./.test(url);
}

function create(url: string) {
  const pooled = !usePrepared(url);
  const sql = postgres(url, {
    // serverless instances behind a transaction pooler should hold very few connections each
    max: Number(process.env.DB_POOL_MAX ?? (pooled ? 3 : 10)),
    connect_timeout: 15,
    idle_timeout: 30,
    prepare: usePrepared(url),
    onnotice: () => {},
  });
  return { sql, db: drizzle(sql, { schema, casing: "snake_case" }) };
}

function resolveUrl() {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is not set");
  return url ?? DEFAULT_DEV_URL;
}

/** Singleton (survives Next.js dev hot reloads). */
export function getDb(): Database {
  if (!globalThis.__propertyxDb) globalThis.__propertyxDb = create(resolveUrl());
  return globalThis.__propertyxDb.db;
}

export function getSql(): postgres.Sql {
  getDb();
  return globalThis.__propertyxDb!.sql;
}

export const db: Database = new Proxy({} as Database, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export function createDb(url: string) {
  return create(url);
}

export async function closeDb() {
  if (globalThis.__propertyxDb) {
    await globalThis.__propertyxDb.sql.end({ timeout: 5 });
    globalThis.__propertyxDb = undefined;
  }
}
