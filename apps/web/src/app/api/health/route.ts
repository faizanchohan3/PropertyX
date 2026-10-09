import { getSql } from "@propertyx/database";

export const dynamic = "force-dynamic";

/**
 * Deployment self-check. Reports only booleans / counts and short error messages, never secret values.
 * Open /api/health after deploying to see which setup step is missing.
 */
export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const checks: Record<string, unknown> = {
    DATABASE_URL: url ? "set" : "MISSING — add it in Vercel → Settings → Environment Variables",
    databaseHost: url ? (url.match(/@([^:/?]+)/)?.[1] ?? "unparseable") : null,
    AUTH_SECRET: (process.env.AUTH_SECRET?.length ?? 0) >= 32 ? "set" : process.env.NODE_ENV === "production" ? "MISSING or shorter than 32 characters" : "not set (development fallback in use)",
    APP_URL: process.env.APP_URL || "not set (optional, used in emails and links)",
  };
  // locally the app falls back to the embedded dev database, so check it too
  if (url || process.env.NODE_ENV !== "production") {
    try {
      const sql = getSql();
      await sql`select 1`;
      checks.databaseConnection = "ok";
      const [t] = await sql<{ n: number }[]>`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name in ('users', 'site_settings', 'property_listings', 'cities')`;
      if (t.n < 4) checks.tables = "MISSING — run `npm run db:migrate` against this database";
      else {
        checks.tables = "ok";
        const [c] = await sql<{ cities: number; settings: number; listings: number; users: number }[]>`
          select (select count(*)::int from cities) as cities, (select count(*)::int from site_settings) as settings,
                 (select count(*)::int from property_listings) as listings, (select count(*)::int from users) as users`;
        checks.data = c;
        if (!c.cities || !c.settings) checks.referenceData = "MISSING — run `npm run db:reference` (or `npm run db:seed` for demo data)";
        else checks.referenceData = "ok";
      }
    } catch (e) {
      checks.databaseConnection = `FAILED — ${(e as Error).message.replace(url, "[DATABASE_URL]").slice(0, 300)}`;
    }
  }
  const ok = Object.values(checks).every((v) => typeof v !== "string" || !/MISSING|FAILED/.test(v));
  return Response.json({ ok, ...checks }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
