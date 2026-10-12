/**
 * Runs before `next build` (apps/web "prebuild"). On Vercel it applies pending database migrations,
 * so a deploy that needs a new column never goes live before the column exists. If a migration
 * fails the build fails and the previous deployment keeps serving. Locally it does nothing.
 */
import { runMigrations } from "@propertyx/database/migrate";

async function main() {
  if (!process.env.VERCEL) return console.log("migrate-on-build: not on Vercel, skipping");
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return console.log(`migrate-on-build: ${process.env.VERCEL_ENV} build, skipping`);
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) return console.log("migrate-on-build: DATABASE_URL not set, skipping");
  const t = Date.now();
  await runMigrations();
  console.log(`migrate-on-build: migrations applied in ${Date.now() - t} ms`);
}

main().catch((e) => {
  const err = e as Error & { code?: string; cause?: Error & { code?: string } };
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  const target = url.match(/@([^/?]+)/)?.[1] ?? "?";
  console.error(`migrate-on-build: FAILED connecting to ${target} (${process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL"})`);
  console.error(`migrate-on-build: ${err.code ?? err.cause?.code ?? ""} ${err.message}`);
  if (err.cause) console.error(`migrate-on-build: cause: ${err.cause.message}`);
  console.error("migrate-on-build: the previous deployment keeps serving. Fix the database setting (or run `npm run db:migrate` yourself) and redeploy.");
  process.exit(1);
});
