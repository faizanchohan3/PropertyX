import postgres from "postgres";
import { publicAppUrl } from "@propertyx/shared";
import { connectionOptions, db, sql as q } from "@propertyx/database";
import { createSearchEngine } from "@propertyx/search";
import { getSetting, listProjects, listPosts, listAgents } from "@propertyx/core";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Deployment self-check. Open /api/health after deploying to see which setup step is missing.
 * Reports booleans, counts, timings and (truncated) query text of stuck sessions — never secret values.
 * Uses its own single connection with a 5 s statement timeout so it answers even when the app's queries hang.
 */
export async function GET(req: Request) {
  const url = process.env.DATABASE_URL ?? "";
  const checks: Record<string, unknown> = {
    DATABASE_URL: url ? "set" : process.env.NODE_ENV === "production" ? "MISSING — add it in Vercel → Settings → Environment Variables" : "not set (local dev database in use)",
    databaseHost: url ? (url.match(/@([^:/?]+)/)?.[1] ?? "unparseable") : null,
    AUTH_SECRET: (process.env.AUTH_SECRET?.length ?? 0) >= 32 ? "set" : process.env.NODE_ENV === "production" ? "MISSING or shorter than 32 characters" : "not set (development fallback in use)",
    APP_URL: publicAppUrl() + (process.env.APP_URL ? "" : " (auto)"),
    region: process.env.VERCEL_REGION ?? null,
  };
  const dbUrl = url || (process.env.NODE_ENV !== "production" ? "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx" : "");
  if (dbUrl) {
    const { url: u, options } = connectionOptions(dbUrl);
    const sql = postgres(u, { ...options, max: 1, connect_timeout: 8, connection: { statement_timeout: 5000, application_name: "health-check" } });
    const step = async <T,>(name: string, fn: () => Promise<T>) => {
      const t0 = Date.now();
      try {
        const r = await fn();
        checks[name] = { ok: true, ms: Date.now() - t0, ...(r === undefined ? {} : { result: r }) };
        return r;
      } catch (e) {
        checks[name] = { ok: false, ms: Date.now() - t0, error: (e as Error).message.replace(dbUrl, "[DATABASE_URL]").slice(0, 300) };
        return undefined;
      }
    };
    const connected = await step("1_connect", async () => void (await sql`select 1`));
    if (checks["1_connect"] && (checks["1_connect"] as { ok: boolean }).ok) {
      void connected;
      // sessions that are running long or waiting on locks — the usual cause of timeouts
      await step("2_sessions", async () =>
        sql`select pid, state, application_name as app, wait_event_type as waiting_on, round(extract(epoch from now() - query_start))::int as seconds,
                   pg_blocking_pids(pid) as blocked_by, left(regexp_replace(query, '\\s+', ' ', 'g'), 70) as query
            from pg_stat_activity
            where datname = current_database() and pid <> pg_backend_pid() and state <> 'idle'
            order by query_start limit 15`);
      const tables = await step("3_tables", async () => {
        const [t] = await sql<{ n: number }[]>`select count(*)::int as n from information_schema.tables where table_schema = 'public'`;
        return t.n;
      });
      if (!tables) checks.fix = "No tables — run `npm run db:migrate` against this database";
      else {
        await step("4_cities", async () => (await sql<{ n: number }[]>`select count(*)::int as n from cities`)[0].n);
        await step("5_settings", async () => (await sql<{ n: number }[]>`select count(*)::int as n from site_settings`)[0].n);
        await step("6_listings", async () => (await sql<{ n: number }[]>`select count(*)::int as n from property_listings`)[0].n);
        const c = checks["4_cities"] as { ok: boolean; result?: number };
        const st = checks["5_settings"] as { ok: boolean; result?: number };
        if (c.ok && st.ok && (!c.result || !st.result)) checks.fix = "Tables are empty — run `npm run db:reference` (or `npm run db:seed` for demo data)";
        if (!c.ok || !st.ok) checks.fix = "Queries on tables time out — see 2_sessions for the session holding a lock (blocked_by), and end it in Supabase with select pg_terminate_backend(<pid>)";
      }
    }
    await sql.end({ timeout: 2 }).catch(() => {});
  }
  // ?app=1 — the same reads the homepage makes, through the app's shared connection pool, each with its own timer
  if (dbUrl && new URL(req.url).searchParams.get("app")) {
    const appSteps: Record<string, unknown> = {};
    const timed = async (name: string, fn: () => Promise<unknown>) => {
      const t0 = Date.now();
      const r = await Promise.race([fn().then(() => "ok", (e: Error) => `error: ${e.message.slice(0, 160)}`), new Promise<string>((res) => setTimeout(() => res("TIMEOUT"), 6000))]);
      appSteps[name] = { result: r, ms: Date.now() - t0 };
    };
    const engine = createSearchEngine(db);
    await timed("select_1", () => db.execute(q`select 1`));
    await Promise.all([
      timed("setting", () => getSetting(db, "homepage")),
      timed("search_sale", () => engine.search({ sort: "recommended", pageSize: 8, purpose: "sale" })),
      timed("search_rent", () => engine.search({ sort: "newest", pageSize: 4, purpose: "rent" })),
      timed("projects", () => listProjects(db)),
      timed("posts", () => listPosts(db, {})),
      timed("agents", () => listAgents(db, { verified: true })),
    ]);
    checks["7_app_pool"] = appSteps;
  }
  const ok =!checks.fix && Object.values(checks).every((v) => (typeof v === "string" ? !/MISSING|FAILED/.test(v) : !(v && typeof v === "object" && "ok" in v && !(v as { ok: boolean }).ok)));
  return Response.json({ ok, ...checks }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
