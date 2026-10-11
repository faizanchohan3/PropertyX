import { runScheduledJobs } from "@propertyx/core";
import { db } from "@/lib/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled jobs (saved-search alerts, notification delivery, listing expiry, rent reminders, cleanup).
 * Vercel Cron calls this on the schedule in vercel.json and sends `Authorization: Bearer $CRON_SECRET`.
 * Self-hosted setups can run `npm run worker` instead.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set — add it in Vercel → Settings → Environment Variables" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const started = Date.now();
  const results = await runScheduledJobs(db);
  return Response.json({ ok: true, ms: Date.now() - started, results });
}
