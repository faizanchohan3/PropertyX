import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { assignRole, removeRole, audit, revokeAllSessions } from "@propertyx/auth";
import { notify } from "@propertyx/notifications";
import { STAFF_ROLES, ROLE_KEYS, slugify, type Role } from "@propertyx/shared";
import { badRequest, forbidden, notFound, requirePerm, type Actor } from "./errors";

export async function searchUsers(db: Database, actor: Actor | null, opts: { q?: string; role?: string; status?: string; page?: number } = {}) {
  requirePerm(actor, "user.read");
  const page = opts.page ?? 1;
  const rows = await db.execute<Record<string, unknown>>(sql`
    select u.id, u.name, u.email, u.phone, u.status, u.primary_role, u.verification_level, u.created_at, u.last_login_at, u.is_seed,
      array(select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = u.id) as roles,
      (select count(*)::int from property_listings l where l.posted_by_id = u.id) as listings,
      count(*) over() as total
    from users u
    where true
      ${opts.q ? sql`and (u.name ilike ${"%" + opts.q + "%"} or u.email ilike ${"%" + opts.q + "%"} or u.phone ilike ${"%" + opts.q + "%"})` : sql``}
      ${opts.status ? sql`and u.status = ${opts.status}` : sql``}
      ${opts.role ? sql`and exists (select 1 from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = u.id and r.key = ${opts.role})` : sql``}
    order by u.created_at desc limit 50 offset ${(page - 1) * 50}`);
  return { items: rows, total: Number(rows[0]?.total ?? 0) };
}

export async function setUserStatus(db: Database, actor: Actor | null, userId: string, status: "active" | "suspended", reason?: string) {
  requirePerm(actor, "user.suspend");
  if (userId === actor.id) throw badRequest("You can't suspend yourself");
  const [target] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (!target) throw notFound("User");
  const targetRoles = (await db.execute<{ key: string }>(sql`select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = ${userId}`)).map((r) => r.key);
  if (targetRoles.includes("super_admin") && !actor.roles.includes("super_admin")) throw forbidden("Only a super admin can suspend a super admin");
  if (status === "suspended" && !reason?.trim()) throw badRequest("Give a reason for the suspension");
  await db.update(s.users).set({ status, suspendedReason: status === "suspended" ? reason! : null }).where(eq(s.users.id, userId));
  if (status === "suspended") {
    await revokeAllSessions(db, userId);
    await db.update(s.propertyListings).set({ status: "paused" }).where(and(eq(s.propertyListings.postedById, userId), eq(s.propertyListings.status, "active")));
  }
  await audit(db, { actorId: actor.id, action: `user.${status}`, entityType: "user", entityId: userId, metadata: { reason } });
}

export async function setUserRole(db: Database, actor: Actor | null, userId: string, role: string, grant: boolean) {
  requirePerm(actor, "user.suspend");
  if (!ROLE_KEYS.includes(role as Role)) throw badRequest("Unknown role");
  if (STAFF_ROLES.includes(role as Role) && !actor.permissions.includes("role.manage")) throw forbidden("Only super admins can grant staff roles");
  if (userId === actor.id && !grant && role === "super_admin") throw badRequest("You can't remove your own super admin role");
  if (grant) await assignRole(db, userId, role, actor.id);
  else await removeRole(db, userId, role);
  await audit(db, { actorId: actor.id, action: grant ? "role.grant" : "role.revoke", entityType: "user", entityId: userId, metadata: { role } });
  if (grant) await notify(db, { userId, type: "system", title: "Account role updated", body: `Your account now has the ${role.replace("_", " ")} role.`, link: "/account" });
}

export async function auditLog(db: Database, actor: Actor | null, opts: { q?: string; page?: number } = {}) {
  requirePerm(actor, "audit.read");
  const page = opts.page ?? 1;
  return db.execute<Record<string, unknown>>(sql`
    select a.*, u.name as actor_name from audit_logs a left join users u on u.id = a.actor_id
    ${opts.q ? sql`where a.action ilike ${"%" + opts.q + "%"} or a.entity_type ilike ${"%" + opts.q + "%"} or u.name ilike ${"%" + opts.q + "%"}` : sql``}
    order by a.created_at desc limit 100 offset ${(page - 1) * 100}`);
}

/* ---------------- locations management ---------------- */

export async function addLocation(db: Database, actor: Actor | null, input: { kind: "area" | "society" | "block"; cityId: string; parentSlug?: string; name: string; lat: number; lng: number; description?: string }) {
  requirePerm(actor, "content.manage");
  const [city] = await db.select().from(s.cities).where(eq(s.cities.id, input.cityId));
  if (!city) throw badRequest("Unknown city");
  if (!input.name?.trim()) throw badRequest("Enter a name");
  if (!(input.lat > 23 && input.lat < 38 && input.lng > 60 && input.lng < 78)) throw badRequest("Coordinates must be inside Pakistan");
  const base = slugify(input.name);
  let refId: string;
  let parentLoc: typeof s.locations.$inferSelect | undefined;
  let slug = base.includes(city.slug) ? base : `${base}-${city.slug}`;
  if (input.kind === "block") {
    [parentLoc] = input.parentSlug ? await db.select().from(s.locations).where(eq(s.locations.slug, input.parentSlug)) : [];
    if (!parentLoc || !["area", "society"].includes(parentLoc.kind)) throw badRequest("Choose the parent area or society");
    slug = `${base}-${parentLoc.slug}`;
    const [b] = await db.insert(s.blocks).values({ cityId: city.id, name: input.name, slug, lat: input.lat, lng: input.lng, societyId: parentLoc.kind === "society" ? parentLoc.refId : null, areaId: parentLoc.kind === "area" ? parentLoc.refId : null }).returning();
    refId = b.id;
  } else if (input.kind === "area") {
    const [a] = await db.insert(s.areas).values({ cityId: city.id, name: input.name, slug, lat: input.lat, lng: input.lng, description: input.description ?? null }).returning();
    refId = a.id;
  } else {
    const [so] = await db.insert(s.societies).values({ cityId: city.id, name: input.name, slug, lat: input.lat, lng: input.lng, description: input.description ?? null }).returning();
    refId = so.id;
  }
  const [cityLoc] = await db.select().from(s.locations).where(and(eq(s.locations.kind, "city"), eq(s.locations.refId, city.id)));
  const fullName = input.kind === "block" ? `${input.name}, ${parentLoc!.name}, ${city.name}` : `${input.name}, ${city.name}`;
  const [loc] = await db.insert(s.locations).values({ kind: input.kind, refId, cityId: city.id, parentId: input.kind === "block" ? parentLoc!.id : cityLoc?.id ?? null, name: input.name, fullName, slug, lat: input.lat, lng: input.lng, overview: input.description ?? null }).returning();
  await audit(db, { actorId: actor.id, action: "location.create", entityType: "location", entityId: loc.id });
  return loc;
}

export async function refreshLocationCounts(db: Database) {
  await db.execute(sql`
    update locations l set active_listings = coalesce(x.n, 0)
    from (select loc.id, count(pl.id) as n from locations loc
      left join properties p on ((loc.kind = 'city' and p.city_id = loc.ref_id) or (loc.kind = 'area' and p.area_id = loc.ref_id) or (loc.kind = 'society' and p.society_id = loc.ref_id) or (loc.kind = 'block' and p.block_id = loc.ref_id))
      left join property_listings pl on pl.property_id = p.id and pl.status = 'active' group by loc.id) x
    where x.id = l.id`);
}

/* ---------------- plans ---------------- */

export async function updatePlan(db: Database, actor: Actor | null, planId: string, patch: { name?: string; priceMonthly?: number; priceYearly?: number; listingQuota?: number; featuredQuota?: number; agentSeats?: number; isActive?: boolean; features?: string[] }) {
  requirePerm(actor, "billing.manage");
  for (const k of ["priceMonthly", "priceYearly", "listingQuota", "featuredQuota", "agentSeats"] as const) if (patch[k] != null && (!Number.isInteger(patch[k]) || patch[k]! < 0)) throw badRequest(`${k} must be a whole number`);
  await db.update(s.subscriptionPlans).set(patch).where(eq(s.subscriptionPlans.id, planId));
  await audit(db, { actorId: actor.id, action: "plan.update", entityType: "subscription_plan", entityId: planId, metadata: patch });
}

export async function listAllPayments(db: Database, actor: Actor | null, status?: string) {
  requirePerm(actor, "billing.manage");
  return db.select({ p: s.payments, userName: s.users.name, email: s.users.email }).from(s.payments).innerJoin(s.users, eq(s.users.id, s.payments.userId)).where(status && status !== "all" ? eq(s.payments.status, status as "succeeded") : sql`true`).orderBy(desc(s.payments.createdAt)).limit(200);
}

export async function listAllSubscriptions(db: Database, actor: Actor | null) {
  requirePerm(actor, "billing.manage");
  return db.select({ sub: s.subscriptions, plan: s.subscriptionPlans.name, userName: s.users.name, email: s.users.email }).from(s.subscriptions).innerJoin(s.subscriptionPlans, eq(s.subscriptionPlans.id, s.subscriptions.planId)).innerJoin(s.users, eq(s.users.id, s.subscriptions.userId)).orderBy(desc(s.subscriptions.createdAt)).limit(200);
}

export async function refundPayment(db: Database, actor: Actor | null, paymentId: string, reason: string) {
  requirePerm(actor, "billing.manage");
  const [p] = await db.select().from(s.payments).where(eq(s.payments.id, paymentId));
  if (!p || p.status !== "succeeded") throw badRequest("Only successful payments can be refunded");
  // Refund is recorded here; the money movement happens in the gateway's merchant portal.
  await db.update(s.payments).set({ status: "refunded", metadata: { ...(p.metadata ?? {}), refundReason: reason, refundedBy: actor.id } }).where(eq(s.payments.id, paymentId));
  await audit(db, { actorId: actor.id, action: "payment.refund", entityType: "payment", entityId: paymentId, metadata: { reason } });
}

/* ---------------- moderation lists ---------------- */

export async function adminListings(db: Database, actor: Actor | null, opts: { q?: string; status?: string; city?: string; seed?: string; page?: number } = {}) {
  requirePerm(actor, "listing.moderate");
  const page = opts.page ?? 1;
  const { CARD_COLUMNS, CARD_FROM, mapCard } = await import("@propertyx/search");
  const rows = await db.execute<Record<string, unknown>>(sql`
    select ${CARD_COLUMNS}, l.fraud_score, l.posted_by_id, u.name as poster_name, u.email as poster_email, count(*) over() as total
    ${CARD_FROM} left join users u on u.id = l.posted_by_id
    where true
      ${opts.status && opts.status !== "all" ? sql`and l.status = ${opts.status}` : sql``}
      ${opts.city ? sql`and c.slug = ${opts.city}` : sql``}
      ${opts.q ? sql`and (l.title ilike ${"%" + opts.q + "%"} or l.reference_code ilike ${"%" + opts.q + "%"} or u.email ilike ${"%" + opts.q + "%"} or l.contact_phone ilike ${"%" + opts.q + "%"})` : sql``}
    order by l.updated_at desc limit 50 offset ${(page - 1) * 50}`);
  return { total: Number(rows[0]?.total ?? 0), items: rows.map((r) => ({ ...mapCard(r), fraudScore: Number(r.fraud_score), posterName: (r.poster_name as string) ?? null, posterEmail: (r.poster_email as string) ?? null })) };
}

export async function adminUpdateListing(db: Database, actor: Actor | null, id: string, patch: { verificationLevel?: number; featuredDays?: number; unfeature?: boolean; status?: "paused" | "rejected"; reason?: string }) {
  requirePerm(actor, "listing.moderate");
  const [l] = await db.select().from(s.propertyListings).where(eq(s.propertyListings.id, id));
  if (!l) throw notFound("Listing");
  const set: Partial<typeof s.propertyListings.$inferInsert> = {};
  if (patch.verificationLevel != null) {
    if (patch.verificationLevel < 0 || patch.verificationLevel > 5) throw badRequest("Level must be 0–5");
    set.verificationLevel = patch.verificationLevel;
    set.verifiedAt = patch.verificationLevel >= 2 ? new Date() : null;
  }
  if (patch.featuredDays) set.featuredUntil = new Date(Date.now() + patch.featuredDays * 86400_000);
  if (patch.unfeature) set.featuredUntil = null;
  if (patch.status) {
    if (patch.status === "rejected" && !patch.reason?.trim()) throw badRequest("Give a reason");
    set.status = patch.status;
    if (patch.reason) set.rejectionReason = patch.reason;
  }
  await db.update(s.propertyListings).set(set).where(eq(s.propertyListings.id, id));
  await audit(db, { actorId: actor.id, action: "listing.admin_update", entityType: "listing", entityId: id, metadata: patch });
  if (patch.status === "rejected" && l.postedById) await notify(db, { userId: l.postedById, type: "listing_status", title: "Listing removed", body: `“${l.title}”: ${patch.reason}`, link: "/dashboard/listings" });
}

export async function listFraudFlags(db: Database, actor: Actor | null, status = "open") {
  requirePerm(actor, "fraud.manage");
  return db.execute<Record<string, unknown>>(sql`
    select f.*,
      case f.target_type when 'listing' then (select title from property_listings where id = f.target_id)
        when 'user' then (select name from users where id = f.target_id)
        when 'document' then (select original_name from documents where id = f.target_id)
        when 'message' then (select left(body, 80) from messages where id = f.target_id) end as target_label,
      case f.target_type when 'listing' then (select slug from property_listings where id = f.target_id) end as target_slug,
      case f.target_type when 'listing' then (select status from property_listings where id = f.target_id) end as target_status
    from fraud_flags f where ${status === "all" ? sql`true` : sql`f.status = ${status}`}
    order by case f.severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end, f.created_at desc limit 200`);
}

export async function pendingReviews(db: Database, actor: Actor | null, status = "pending") {
  requirePerm(actor, "review.moderate");
  return db.execute<Record<string, unknown>>(sql`
    select r.*, u.name as author_name, u.email as author_email,
      case r.target_type when 'agent' then (select display_name from agents where id = r.target_id)
        when 'agency' then (select name from agencies where id = r.target_id)
        when 'developer' then (select name from developers where id = r.target_id)
        when 'project' then (select name from projects where id = r.target_id) end as target_label
    from reviews r join users u on u.id = r.author_id
    where ${status === "all" ? sql`true` : sql`r.status = ${status}`} order by r.created_at desc limit 200`);
}

export async function adminThreads(db: Database, actor: Actor | null) {
  requirePerm(actor, "forum.moderate");
  return db.execute<Record<string, unknown>>(sql`
    select t.id, t.slug, t.title, t.category, t.is_pinned, t.is_hidden, t.is_locked, t.replies_count, t.views_count, t.created_at, u.name as author_name,
      (select count(*)::int from reports r where r.target_type = 'forum_post' and r.target_id in (select id from forum_posts p where p.thread_id = t.id) and r.status = 'open') as open_reports
    from forum_threads t join users u on u.id = t.author_id order by t.created_at desc limit 200`);
}

export async function adminLocations(db: Database, actor: Actor | null, opts: { city?: string; q?: string } = {}) {
  requirePerm(actor, "content.manage");
  return db.execute<Record<string, unknown>>(sql`
    select l.id, l.kind, l.name, l.full_name, l.slug, l.active_listings, l.overview, l.investment_outlook, l.highlights, l.seo_title, l.seo_description, l.city_id,
      g.title as guide_title, g.summary as guide_summary, g.body as guide_body, g.pros as guide_pros, g.cons as guide_cons
    from locations l left join area_guides g on g.location_id = l.id
    where l.kind in ('city','area','society')
      ${opts.city ? sql`and l.city_id = (select id from cities where slug = ${opts.city})` : sql``}
      ${opts.q ? sql`and l.full_name ilike ${"%" + opts.q + "%"}` : sql``}
    order by l.kind = 'city' desc, l.active_listings desc limit 200`);
}
