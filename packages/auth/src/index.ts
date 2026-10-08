import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import { sessions, users, userRoles, roles, otpCodes, auditLogs, rateLimits } from "@propertyx/database";
import { permissionsFor, isStaff, type Permission } from "@propertyx/shared";

export * from "@propertyx/shared/permissions";

export const SESSION_COOKIE = "px_session";
export const SESSION_TTL_DAYS = 30;

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set to at least 32 characters in production");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please-0123456789");
  }
  return new TextEncoder().encode(s);
}

/* ---------------- passwords ---------------- */

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 11);
}

let dummyHash: Promise<string> | null = null;

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) {
    // spend comparable time so response timing doesn't reveal whether the account exists
    dummyHash ??= bcrypt.hash("dummy-password-for-timing", 11);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}

/* ---------------- sessions ---------------- */

export interface AuthUser {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  primaryRole: string;
  roles: string[];
  permissions: Permission[];
  isStaff: boolean;
  verificationLevel: number;
  phoneVerified: boolean;
}

export async function createSession(db: Database, userId: string, meta: { userAgent?: string | null; ip?: string | null; client?: string } = {}) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  const [s] = await db
    .insert(sessions)
    .values({ userId, userAgent: meta.userAgent?.slice(0, 300) ?? null, ip: meta.ip ?? null, client: meta.client ?? "web", expiresAt })
    .returning({ id: sessions.id });
  const token = await new SignJWT({ sid: s.id })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setIssuer("propertyx")
    .sign(secretKey());
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  return { token, expiresAt, sessionId: s.id };
}

export async function verifyToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: "propertyx", algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return { userId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}

export async function getUserRoles(db: Database, userId: string): Promise<string[]> {
  const rows = await db.select({ key: roles.key }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, userId));
  return rows.map((r) => r.key);
}

export async function resolveSession(db: Database, token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null;
  const claims = await verifyToken(token);
  if (!claims) return null;
  const [row] = await db
    .select({
      sessionId: sessions.id,
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      primaryRole: users.primaryRole,
      status: users.status,
      verificationLevel: users.verificationLevel,
      phoneVerifiedAt: users.phoneVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, claims.sessionId), eq(sessions.userId, claims.userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.status !== "active") return null;
  const roleKeys = await getUserRoles(db, row.id);
  return {
    id: row.id,
    sessionId: row.sessionId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    primaryRole: row.primaryRole,
    roles: roleKeys,
    permissions: [...permissionsFor(roleKeys)],
    isStaff: isStaff(roleKeys),
    verificationLevel: row.verificationLevel,
    phoneVerified: !!row.phoneVerifiedAt,
  };
}

export async function revokeSession(db: Database, sessionId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function revokeAllSessions(db: Database, userId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export function hasPermission(user: Pick<AuthUser, "permissions"> | null | undefined, p: Permission) {
  return !!user && user.permissions.includes(p);
}

export async function assignRole(db: Database, userId: string, roleKey: string, grantedBy?: string) {
  const [r] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, roleKey)).limit(1);
  if (!r) throw new Error(`Unknown role ${roleKey}`);
  await db.insert(userRoles).values({ userId, roleId: r.id, grantedBy }).onConflictDoNothing();
}

export async function removeRole(db: Database, userId: string, roleKey: string) {
  const [r] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, roleKey)).limit(1);
  if (r) await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, r.id)));
}

/* ---------------- OTP (phone / email verification) ---------------- */

function hashCode(code: string) {
  return createHash("sha256").update(code + ":" + new TextDecoder().decode(secretKey())).digest("hex");
}

export async function createOtp(db: Database, opts: { userId?: string; target: string; purpose: string }) {
  const code = String(randomInt(100000, 999999));
  await db.insert(otpCodes).values({
    userId: opts.userId,
    target: opts.target,
    purpose: opts.purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });
  return code;
}

export async function verifyOtp(db: Database, opts: { target: string; purpose: string; code: string }) {
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.target, opts.target), eq(otpCodes.purpose, opts.purpose), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(sql`${otpCodes.createdAt} desc`)
    .limit(1);
  if (!otp || otp.attempts >= 5) return false;
  const a = Buffer.from(hashCode(opts.code.trim()));
  const b = Buffer.from(otp.codeHash);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  await db
    .update(otpCodes)
    .set(ok ? { consumedAt: new Date() } : { attempts: otp.attempts + 1 })
    .where(eq(otpCodes.id, otp.id));
  return ok;
}

/* ---------------- audit + rate limiting ---------------- */

export async function audit(db: Database, entry: { actorId?: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Record<string, unknown>; ip?: string | null }) {
  await db.insert(auditLogs).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? {},
    ip: entry.ip ?? null,
  });
}

/**
 * Fixed-window rate limiter stored in Postgres so it works across instances.
 * Returns { ok, remaining, resetAt }.
 */
export async function rateLimit(db: Database, key: string, limit: number, windowSeconds: number) {
  const rows = await db.execute<{ count: number; window_start: Date }>(sql`
    insert into ${rateLimits} (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then 1 else ${rateLimits.count} + 1 end,
      window_start = case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then now() else ${rateLimits.windowStart} end
    returning count, window_start`);
  const r = rows[0];
  const count = Number(r.count);
  const resetAt = new Date(new Date(r.window_start).getTime() + windowSeconds * 1000);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}
