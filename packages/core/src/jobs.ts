/**
 * Background jobs. Run with `npm run worker` (loops every minute) or trigger a single
 * pass via POST /api/v1/admin/jobs (super admin) / a cron calling scripts/worker.ts --once.
 */
import { and, eq, lt, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { processOutbox, notify } from "@propertyx/notifications";
import { createSearchEngine } from "@propertyx/search";
import type { SearchQuery } from "@propertyx/shared";
import { generateRentDues, sendRentReminders } from "./rentals";
import { endExpiredCampaigns } from "./ads";
import { expireVerifications } from "./trust";
import { markPastVisits } from "./engagement";
import { refreshLocationCounts } from "./admin";

export async function expireListings(db: Database) {
  const expired = await db.update(s.propertyListings).set({ status: "expired" }).where(and(eq(s.propertyListings.status, "active"), lt(s.propertyListings.expiresAt, new Date()))).returning({ id: s.propertyListings.id, postedById: s.propertyListings.postedById, title: s.propertyListings.title });
  for (const l of expired) if (l.postedById) await notify(db, { userId: l.postedById, type: "listing_status", title: "Listing expired", body: `“${l.title}” has expired. Renew it to show it to buyers again.`, link: "/dashboard/listings?status=expired" });
  return expired.length;
}

export async function expireSubscriptions(db: Database) {
  const soon = await db.execute<{ user_id: string; name: string; end: string }>(sql`
    select s.user_id, p.name, s.current_period_end as end from subscriptions s join subscription_plans p on p.id = s.plan_id
    where s.status = 'active' and s.current_period_end between now() + interval '6 days' and now() + interval '7 days'`);
  for (const r of soon) await notify(db, { userId: r.user_id, type: "subscription", title: `Your ${r.name} plan renews in 7 days`, body: "Renew to keep your listing limits and featured credits.", link: "/dashboard/billing" });
  const ended = await db.update(s.subscriptions).set({ status: "expired" }).where(and(eq(s.subscriptions.status, "active"), lt(s.subscriptions.currentPeriodEnd, new Date()))).returning();
  return ended.length;
}

/** Daily / weekly digests for saved searches that aren't "instant". */
export async function savedSearchDigests(db: Database) {
  const due = await db.execute<{ id: string; user_id: string; name: string; query: SearchQuery; last_checked_at: string }>(sql`
    select id, user_id, name, query, last_checked_at from saved_searches
    where is_active and ((frequency = 'daily' and coalesce(last_notified_at, created_at) < now() - interval '1 day') or (frequency = 'weekly' and coalesce(last_notified_at, created_at) < now() - interval '7 days'))`);
  const engine = createSearchEngine(db);
  let sent = 0;
  for (const ss of due) {
    const r = await engine.search({ ...ss.query, sort: "newest", pageSize: 30 });
    const since = new Date(ss.last_checked_at);
    const fresh = r.items.filter((i) => i.publishedAt && new Date(i.publishedAt) > since);
    if (fresh.length) {
      await notify(db, { userId: ss.user_id, type: "new_match", title: `${fresh.length} new ${fresh.length === 1 ? "property" : "properties"}: ${ss.name}`, body: fresh.slice(0, 3).map((f) => f.title).join(" · "), link: "/alerts" });
      sent++;
    }
    await db.update(s.savedSearches).set({ lastNotifiedAt: new Date() }).where(eq(s.savedSearches.id, ss.id));
  }
  return sent;
}

export async function cleanup(db: Database) {
  await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
  await db.execute(sql`delete from otp_codes where expires_at < now() - interval '1 day'`);
  await db.execute(sql`delete from sessions where expires_at < now() - interval '7 days' or revoked_at < now() - interval '7 days'`);
  // orphan uploads never attached to a listing after 2 days
  await db.execute(sql`delete from property_media where property_id is null and created_at < now() - interval '2 days'`);
}

export async function runScheduledJobs(db: Database, opts: { log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  const results: Record<string, number | string> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      const r = await fn();
      results[name] = typeof r === "number" ? r : "ok";
    } catch (e) {
      results[name] = `error: ${(e as Error).message}`;
    }
    log(`${name}: ${results[name]}`);
  };
  await step("expireListings", () => expireListings(db));
  await step("expireSubscriptions", () => expireSubscriptions(db));
  await step("endCampaigns", () => endExpiredCampaigns(db));
  await step("expireVerifications", () => expireVerifications(db));
  await step("pastVisits", () => markPastVisits(db));
  await step("rentDues", () => generateRentDues(db));
  await step("rentReminders", () => sendRentReminders(db));
  await step("savedSearchDigests", () => savedSearchDigests(db));
  await step("locationCounts", () => refreshLocationCounts(db));
  await step("outbox", async () => (await processOutbox(db, 200)).sent);
  await step("cleanup", () => cleanup(db));
  return results;
}
