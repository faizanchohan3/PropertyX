/**
 * Internal advertising. Campaigns are created by advertisers, paid via the payment
 * layer, approved by admins and then served by placement. Impressions are charged
 * per mille (CPM) against the campaign budget; the campaign ends when the budget
 * or the end date is reached.
 */
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { audit } from "@propertyx/auth";
import { notify } from "@propertyx/notifications";
import { z } from "zod";
import { AD_FORMATS } from "@propertyx/shared";
import { badRequest, forbidden, notFound, requirePerm, type Actor } from "./errors";

const adSchema = z.object({
  campaignName: z.string().trim().min(3).max(100),
  format: z.enum(AD_FORMATS.map((f) => f.key) as [string, ...string[]]),
  targetType: z.enum(["listing", "project", "agency", "agent", "brand"]),
  targetId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().max(200).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  linkUrl: z.string().trim().max(500).regex(/^\/[^\s]*$|^https:\/\/[^\s]+$/, "Use a site path (/project/...) or an https:// link").optional().nullable(),
  locationSlug: z.string().optional().nullable(),
  budget: z.coerce.number().int().min(5_000, "Minimum budget is PKR 5,000").max(50_000_000),
  startAt: z.string(),
  endAt: z.string(),
});

const CPM: Record<string, number> = { featured_listing: 200, top_search: 250, homepage_banner: 350, project_promotion: 300, area_sponsorship: 250, agent_promotion: 200 };

async function assertTargetOwner(db: Database, actor: Actor, type: string, id?: string | null) {
  if (type === "brand") return;
  if (!id) throw badRequest("Choose what to promote");
  const owner =
    type === "listing"
      ? (await db.select({ u: s.propertyListings.postedById }).from(s.propertyListings).where(eq(s.propertyListings.id, id)))[0]?.u
      : type === "project"
        ? (await db.select({ u: s.developers.ownerId }).from(s.projects).innerJoin(s.developers, eq(s.developers.id, s.projects.developerId)).where(eq(s.projects.id, id)))[0]?.u
        : type === "agency"
          ? (await db.select({ u: s.agencies.ownerId }).from(s.agencies).where(eq(s.agencies.id, id)))[0]?.u
          : (await db.select({ u: s.agents.userId }).from(s.agents).where(eq(s.agents.id, id)))[0]?.u;
  if (owner !== actor.id && !actor.isStaff) throw forbidden("You can only promote your own listings, projects or profiles");
}

export async function createCampaign(db: Database, actor: Actor | null, raw: unknown) {
  requirePerm(actor, "ads.create");
  const parsed = adSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Check the campaign details", parsed.error.flatten());
  const d = parsed.data;
  const start = new Date(d.startAt);
  const end = new Date(d.endAt);
  if (!(start.getTime() > 0) || !(end > start)) throw badRequest("End date must be after start date");
  await assertTargetOwner(db, actor, d.targetType, d.targetId);
  const [loc] = d.locationSlug ? await db.select({ id: s.locations.id }).from(s.locations).where(eq(s.locations.slug, d.locationSlug)) : [];
  if (d.format === "area_sponsorship" && !loc) throw badRequest("Choose the area to sponsor");
  const [ad] = await db
    .insert(s.advertisements)
    .values({ advertiserId: actor.id, campaignName: d.campaignName, format: d.format as "homepage_banner", targetType: d.targetType, targetId: d.targetId ?? null, title: d.title, body: d.body ?? null, imageUrl: d.imageUrl ?? null, linkUrl: d.linkUrl ?? null, locationId: loc?.id ?? null, budget: d.budget, costPerMille: CPM[d.format], startAt: start, endAt: end, status: "draft" })
    .returning();
  return ad;
}

export async function myCampaigns(db: Database, actor: Actor) {
  return db.select().from(s.advertisements).where(eq(s.advertisements.advertiserId, actor.id)).orderBy(desc(s.advertisements.createdAt));
}

export async function listCampaigns(db: Database, actor: Actor | null, status?: string) {
  requirePerm(actor, "ads.manage");
  return db
    .select({ ad: s.advertisements, advertiser: s.users.name })
    .from(s.advertisements)
    .innerJoin(s.users, eq(s.users.id, s.advertisements.advertiserId))
    .where(status && status !== "all" ? eq(s.advertisements.status, status as "active") : sql`true`)
    .orderBy(desc(s.advertisements.createdAt));
}

export async function moderateCampaign(db: Database, actor: Actor | null, id: string, action: "approve" | "reject" | "pause" | "resume" | "end", reason?: string, patch?: { budget?: number; endAt?: string }) {
  requirePerm(actor, "ads.manage");
  const [ad] = await db.select().from(s.advertisements).where(eq(s.advertisements.id, id));
  if (!ad) throw notFound("Campaign");
  const status = { approve: "active", reject: "rejected", pause: "paused", resume: "active", end: "ended" }[action] as "active";
  await db.update(s.advertisements).set({ status, rejectionReason: action === "reject" ? reason ?? "Does not meet advertising guidelines" : null, reviewedById: actor.id, ...(patch?.budget ? { budget: patch.budget } : {}), ...(patch?.endAt ? { endAt: new Date(patch.endAt) } : {}) }).where(eq(s.advertisements.id, id));
  await audit(db, { actorId: actor.id, action: `ad.${action}`, entityType: "advertisement", entityId: id, metadata: { reason } });
  if (action === "approve" || action === "reject") await notify(db, { userId: ad.advertiserId, type: "system", title: action === "approve" ? "Campaign approved" : "Campaign rejected", body: action === "approve" ? `“${ad.campaignName}” is live.` : `“${ad.campaignName}”: ${reason}`, link: "/dashboard/ads" });
}

/** Pick ads for a placement and count impressions (charging CPM against the budget). */
export async function serveAds(db: Database, format: string, opts: { locationId?: string | null; limit?: number } = {}) {
  const now = new Date();
  const ads = await db
    .select()
    .from(s.advertisements)
    .where(and(eq(s.advertisements.status, "active"), eq(s.advertisements.format, format as "homepage_banner"), lt(s.advertisements.startAt, now), gt(s.advertisements.endAt, now), sql`${s.advertisements.spent} < ${s.advertisements.budget}`, opts.locationId ? eq(s.advertisements.locationId, opts.locationId) : sql`true`))
    .orderBy(sql`random()`)
    .limit(opts.limit ?? 1);
  for (const ad of ads) {
    await db.execute(sql`update advertisements set impressions = impressions + 1, spent = least(budget, spent + ceil(cost_per_mille / 1000.0)::bigint) where id = ${ad.id}`);
  }
  return ads;
}

export async function recordAdClick(db: Database, id: string) {
  const [ad] = await db.update(s.advertisements).set({ clicks: sql`${s.advertisements.clicks} + 1` }).where(eq(s.advertisements.id, id)).returning();
  return ad?.linkUrl ?? "/";
}

export async function endExpiredCampaigns(db: Database) {
  const r = await db.update(s.advertisements).set({ status: "ended" }).where(and(eq(s.advertisements.status, "active"), sql`(${s.advertisements.endAt} < now() or ${s.advertisements.spent} >= ${s.advertisements.budget})`)).returning({ id: s.advertisements.id });
  return r.length;
}
