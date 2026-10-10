import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createDb } from "./client";

// DIRECT_URL: a non-pooled connection (Supabase "Session"/direct, port 5432) for DDL
export async function runMigrations(url = process.env.DIRECT_URL || process.env.DATABASE_URL || "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx") {
  const { sql, db } = createDb(url);
  try {
    await sql.unsafe("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
    await migrate(db, { migrationsFolder: folder });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  // variables already set in the shell win over .env
  if (existsSync(".env")) process.loadEnvFile(".env");
  runMigrations()
    .then(() => console.log("✔ migrations applied"))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
