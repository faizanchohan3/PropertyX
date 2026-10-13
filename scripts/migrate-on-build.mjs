/**
 * Runs before `next build` (apps/web "prebuild"). On Vercel production builds it applies pending
 * database migrations, so a deploy that needs a new column never goes live before the column
 * exists. If a migration fails the build fails and the previous deployment keeps serving.
 * Plain JavaScript on purpose: it must run with nothing but Node on the build machine.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const log = (...a) => console.log("migrate-on-build:", ...a);

async function main() {
  if (!process.env.VERCEL) return log("not on Vercel, skipping");
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return log(`${process.env.VERCEL_ENV} build, skipping`);
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!raw) return log("DATABASE_URL not set, skipping");

  const url = new URL(raw);
  // Supabase's pooler on 5432 is session mode (15 clients); 6543 is transaction mode — same as the app
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") url.port = "6543";
  const pooled = url.port === "6543" || url.hostname.includes("-pooler.");
  url.searchParams.delete("pgbouncer");
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  log(`connecting to ${url.hostname}:${url.port || 5432}`);

  const sql = postgres(url.toString(), {
    max: 1,
    connect_timeout: 20,
    prepare: !pooled,
    ssl: local || url.searchParams.has("sslmode") ? undefined : "require",
    onnotice: () => {},
  });
  const t = Date.now();
  try {
    await sql.unsafe("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../packages/database/migrations");
    await migrate(drizzle(sql), { migrationsFolder: folder });
    const [{ n }] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
    log(`up to date (${n} migrations) in ${Date.now() - t} ms`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error("migrate-on-build: FAILED —", e?.code ?? "", e?.message ?? e);
  if (e?.cause) console.error("migrate-on-build: cause —", e.cause.code ?? "", e.cause.message ?? e.cause);
  console.error("migrate-on-build: the previous deployment keeps serving. Fix the database setting (or run `npm run db:migrate`) and redeploy.");
  process.exit(1);
});
