import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { hashPassword, verifyPassword, createSession, assignRole, createOtp, verifyOtp, rateLimit, audit, revokeAllSessions } from "@propertyx/auth";
import { notify, sendDirect } from "@propertyx/notifications";
import { registerSchema, loginSchema, passwordSchema, pkPhone, savedSearchInputSchema, searchQuerySchema, SELF_SERVICE_ROLES, NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, slugify, shortId, type Role } from "@propertyx/shared";
import { defaultsFor } from "@propertyx/notifications";
import { AppError, badRequest, conflict, forbidden, notFound, requireActor, tooMany, unauthorized, type Actor } from "./errors";
import { createSearchEngine } from "@propertyx/search";

export async function register(db: Database, raw: unknown, meta: { ip?: string | null; userAgent?: string | null; client?: string }) {
  const rl = await rateLimit(db, `register:${meta.ip ?? "unknown"}`, 10, 3600);
  if (!rl.ok) throw tooMany("Too many sign-ups from this network. Try again later.");
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Please fix the highlighted fields", parsed.error.flatten());
  const d = parsed.data;
  const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, d.email));
  if (exists) throw conflict("An account with this email already exists");
  const role = d.role as Role;
  const [u] = await db.insert(s.users).values({ email: d.email, name: d.name, phone: d.phone ?? null, passwordHash: await hashPassword(d.password), primaryRole: role }).returning();
  await assignRole(db, u.id, role);
  if (role !== "buyer") await assignRole(db, u.id, "buyer"); // everyone can browse, save and enquire
  if (role === "agency" && d.agencyName) {
    const [ag] = await db.insert(s.agencies).values({ ownerId: u.id, name: d.agencyName, slug: `${slugify(d.agencyName)}-${shortId(3)}` }).returning();
    await db.insert(s.agencyMembers).values({ agencyId: ag.id, userId: u.id, role: "admin" });
    await assignRole(db, u.id, "agent");
    await db.insert(s.agents).values({ userId: u.id, agencyId: ag.id, slug: `${slugify(d.name)}-${shortId(4)}`, displayName: d.name, phone: d.phone ?? null, whatsapp: d.phone ?? null });
  }
  if (role === "agent") await db.insert(s.agents).values({ userId: u.id, slug: `${slugify(d.name)}-${shortId(4)}`, displayName: d.name, phone: d.phone ?? null, whatsapp: d.phone ?? null });
  if (role === "developer" && d.companyName) await db.insert(s.developers).values({ ownerId: u.id, name: d.companyName, slug: `${slugify(d.companyName)}-${shortId(3)}` });
  if (role === "construction_company" && d.companyName) await db.insert(s.constructionCompanies).values({ ownerId: u.id, name: d.companyName, slug: `${slugify(d.companyName)}-${shortId(3)}` });
  // tenants invited to a lease before signing up get linked automatically
  await db.update(s.leases).set({ tenantUserId: u.id }).where(and(eq(s.leases.tenantEmail, d.email), sql`${s.leases.tenantUserId} is null`));
  await audit(db, { actorId: u.id, action: "user.register", entityType: "user", entityId: u.id, ip: meta.ip });
  await notify(db, { userId: u.id, type: "system", title: "Welcome to Bismillah", body: "Verify your phone number to start posting and messaging with a trusted badge.", link: "/account" });
  const session = await createSession(db, u.id, meta);
  return { user: u, ...session };
}

export async function login(db: Database, raw: unknown, meta: { ip?: string | null; userAgent?: string | null; client?: string }) {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Enter your email and password");
  const { email, password } = parsed.data;
  const ipLimit = await rateLimit(db, `login-ip:${meta.ip ?? "unknown"}`, 30, 900);
  const userLimit = await rateLimit(db, `login:${email}`, 8, 900);
  if (!ipLimit.ok || !userLimit.ok) throw tooMany("Too many sign-in attempts. Please wait 15 minutes.");
  const [u] = await db.select().from(s.users).where(eq(s.users.email, email));
  const ok = await verifyPassword(password, u?.passwordHash);
  if (!u || !ok) {
    await audit(db, { actorId: u?.id ?? null, action: "auth.login_failed", entityType: "user", entityId: u?.id ?? null, ip: meta.ip, metadata: { email } });
    throw unauthorized("Incorrect email or password");
  }
  if (u.status === "suspended") throw new AppError(403, "suspended", `This account is suspended${u.suspendedReason ? `: ${u.suspendedReason}` : ""}. Contact support.`);
  if (u.status !== "active") throw forbidden("This account is not active");
  await audit(db, { actorId: u.id, action: "auth.login", entityType: "user", entityId: u.id, ip: meta.ip });
  return { user: u, ...(await createSession(db, u.id, meta)) };
}

export async function requestPhoneOtp(db: Database, actor: Actor | null, phoneRaw: string) {
  requireActor(actor);
  const parsed = pkPhone.safeParse(phoneRaw);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const phone = parsed.data;
  const rl = await rateLimit(db, `otp:${actor.id}`, 5, 3600);
  if (!rl.ok) throw tooMany("Too many codes requested. Try again in an hour.");
  const [taken] = await db.select({ id: s.users.id }).from(s.users).where(and(eq(s.users.phone, phone), sql`${s.users.phoneVerifiedAt} is not null`, sql`${s.users.id} <> ${actor.id}`));
  if (taken) throw conflict("This number is already verified on another account");
  const code = await createOtp(db, { userId: actor.id, target: phone, purpose: "phone_verify" });
  await sendDirect(db, "sms", phone, `Your Bismillah verification code is ${code}. It expires in 10 minutes.`);
  // In development the code is also returned so testers can verify without an SMS gateway.
  return { sent: true, devCode: process.env.NODE_ENV !== "production" && (process.env.SMS_PROVIDER ?? "console") === "console" ? code : undefined };
}

export async function confirmPhoneOtp(db: Database, actor: Actor | null, phoneRaw: string, code: string) {
  requireActor(actor);
  const phone = pkPhone.parse(phoneRaw);
  const ok = await verifyOtp(db, { target: phone, purpose: "phone_verify", code });
  if (!ok) throw badRequest("That code is incorrect or has expired");
  await db.update(s.users).set({ phone, phoneVerifiedAt: new Date(), verificationLevel: sql`greatest(${s.users.verificationLevel}, 1)` }).where(eq(s.users.id, actor.id));
  // listings by this user with this phone get the phone-verified badge
  await db.update(s.propertyListings).set({ verificationLevel: sql`greatest(${s.propertyListings.verificationLevel}, 1)` }).where(and(eq(s.propertyListings.postedById, actor.id), eq(s.propertyListings.contactPhone, phone)));
  return { verified: true };
}

export async function updateProfile(db: Database, actor: Actor | null, input: { name?: string; bio?: string; cityId?: string | null; avatarUrl?: string | null; preferences?: { budgetMax?: number; cities?: string[]; types?: string[] } }) {
  requireActor(actor);
  if (input.name != null && (input.name.trim().length < 2 || input.name.length > 80)) throw badRequest("Enter your name");
  await db.update(s.users).set({ ...(input.name ? { name: input.name.trim() } : {}), ...(input.bio != null ? { bio: input.bio.slice(0, 1000) } : {}), ...(input.cityId !== undefined ? { cityId: input.cityId } : {}), ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}), ...(input.preferences ? { preferences: input.preferences } : {}) }).where(eq(s.users.id, actor.id));
}

export async function changePassword(db: Database, actor: Actor | null, current: string, next: string, keepSessionId?: string) {
  requireActor(actor);
  const [u] = await db.select().from(s.users).where(eq(s.users.id, actor.id));
  if (!(await verifyPassword(current, u.passwordHash))) throw badRequest("Current password is incorrect");
  const p = passwordSchema.safeParse(next);
  if (!p.success) throw badRequest(p.error.issues[0].message);
  await db.update(s.users).set({ passwordHash: await hashPassword(next) }).where(eq(s.users.id, actor.id));
  await revokeAllSessions(db, actor.id);
  await audit(db, { actorId: actor.id, action: "auth.password_change", entityType: "user", entityId: actor.id });
  return { keepSessionId };
}

/** Self-service extra roles, e.g. a buyer who becomes a landlord. */
export async function addSelfRole(db: Database, actor: Actor | null, role: string) {
  requireActor(actor);
  if (!SELF_SERVICE_ROLES.includes(role as Role)) throw forbidden("That role can't be added from your account");
  await assignRole(db, actor.id, role);
  if (role === "agent") {
    const [a] = await db.select().from(s.agents).where(eq(s.agents.userId, actor.id));
    if (!a) await db.insert(s.agents).values({ userId: actor.id, slug: `${slugify(actor.name)}-${shortId(4)}`, displayName: actor.name });
  }
  await db.update(s.users).set({ primaryRole: role }).where(eq(s.users.id, actor.id));
}

export async function getNotificationPreferences(db: Database, actor: Actor) {
  const rows = await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, actor.id));
  const byType = new Map(rows.map((r) => [r.type, r]));
  return NOTIFICATION_TYPES.map((t) => {
    const r = byType.get(t.key);
    const d = defaultsFor(t.key);
    return { type: t.key, label: t.label, channels: r ? { in_app: r.inApp, email: r.email, sms: r.sms, whatsapp: r.whatsapp, push: r.push } : d };
  });
}

export async function setNotificationPreferences(db: Database, actor: Actor | null, prefs: Record<string, Record<string, boolean>>) {
  requireActor(actor);
  for (const [type, ch] of Object.entries(prefs)) {
    if (!NOTIFICATION_TYPES.some((t) => t.key === type)) continue;
    const v = Object.fromEntries(NOTIFICATION_CHANNELS.map((c) => [c, !!ch[c]])) as Record<string, boolean>;
    const row = { inApp: v.in_app, email: v.email, sms: v.sms, whatsapp: v.whatsapp, push: v.push };
    await db.insert(s.notificationPreferences).values({ userId: actor.id, type, ...row }).onConflictDoUpdate({ target: [s.notificationPreferences.userId, s.notificationPreferences.type], set: row });
  }
}

export async function listNotifications(db: Database, actor: Actor, limit = 50) {
  return db.select().from(s.notifications).where(eq(s.notifications.userId, actor.id)).orderBy(desc(s.notifications.createdAt)).limit(limit);
}

/* ---------------- saved searches ---------------- */

export async function createSavedSearch(db: Database, actor: Actor | null, raw: unknown) {
  requireActor(actor);
  const parsed = savedSearchInputSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Name your search", parsed.error.flatten());
  const q = searchQuerySchema.safeParse(parsed.data.query);
  if (!q.success) throw badRequest("Invalid search filters");
  const { page: _p, pageSize: _ps, sort: _s, ...query } = q.data;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.savedSearches).where(eq(s.savedSearches.userId, actor.id));
  if (n >= 25) throw badRequest("You can save up to 25 searches");
  const [row] = await db.insert(s.savedSearches).values({ userId: actor.id, name: parsed.data.name, query, frequency: parsed.data.frequency }).returning();
  return row;
}

export async function listSavedSearches(db: Database, actor: Actor) {
  const rows = await db.select().from(s.savedSearches).where(eq(s.savedSearches.userId, actor.id)).orderBy(desc(s.savedSearches.createdAt));
  const engine = createSearchEngine(db);
  return Promise.all(
    rows.map(async (r) => {
      const res = await engine.search({ ...(r.query as object), pageSize: 1 });
      const fresh = await engine.search({ ...(r.query as object), sort: "newest", pageSize: 20 });
      const newCount = fresh.items.filter((i) => i.publishedAt && r.lastCheckedAt && new Date(i.publishedAt) > r.lastCheckedAt).length;
      return { ...r, total: res.total, newCount };
    }),
  );
}

export async function updateSavedSearch(db: Database, actor: Actor | null, id: string, patch: { name?: string; frequency?: string; isActive?: boolean; markChecked?: boolean }) {
  requireActor(actor);
  const [r] = await db.select().from(s.savedSearches).where(eq(s.savedSearches.id, id));
  if (!r || r.userId !== actor.id) throw notFound("Saved search");
  if (patch.frequency && !["instant", "daily", "weekly"].includes(patch.frequency)) throw badRequest("Invalid frequency");
  await db.update(s.savedSearches).set({ ...(patch.name ? { name: patch.name.slice(0, 120) } : {}), ...(patch.frequency ? { frequency: patch.frequency } : {}), ...(patch.isActive != null ? { isActive: patch.isActive } : {}), ...(patch.markChecked ? { lastCheckedAt: new Date() } : {}) }).where(eq(s.savedSearches.id, id));
}

export async function deleteSavedSearch(db: Database, actor: Actor | null, id: string) {
  requireActor(actor);
  await db.delete(s.savedSearches).where(and(eq(s.savedSearches.id, id), eq(s.savedSearches.userId, actor.id)));
}

export async function registerPushToken(db: Database, actor: Actor | null, platform: string, token: string) {
  requireActor(actor);
  if (!["ios", "android", "web"].includes(platform) || !token || token.length > 400) throw badRequest("Invalid push token");
  await db.insert(s.pushTokens).values({ userId: actor.id, platform, token }).onConflictDoUpdate({ target: s.pushTokens.token, set: { userId: actor.id, platform } });
}

export async function getAccount(db: Database, actor: Actor) {
  const [u] = await db.select({ id: s.users.id, name: s.users.name, email: s.users.email, phone: s.users.phone, phoneVerifiedAt: s.users.phoneVerifiedAt, avatarUrl: s.users.avatarUrl, bio: s.users.bio, cityId: s.users.cityId, verificationLevel: s.users.verificationLevel, primaryRole: s.users.primaryRole, preferences: s.users.preferences, createdAt: s.users.createdAt }).from(s.users).where(eq(s.users.id, actor.id));
  const sessions = await db.select({ id: s.sessions.id, userAgent: s.sessions.userAgent, ip: s.sessions.ip, client: s.sessions.client, createdAt: s.sessions.createdAt }).from(s.sessions).where(and(eq(s.sessions.userId, actor.id), sql`${s.sessions.revokedAt} is null and ${s.sessions.expiresAt} > now()`)).orderBy(desc(s.sessions.createdAt));
  return { user: u, roles: actor.roles, sessions };
}
