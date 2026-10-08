import { pgTable, text, timestamp, uuid, integer, jsonb, primaryKey, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { id, createdAt, updatedAt, isSeed } from "./_helpers";
import { userStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    /** primary role used for dashboard routing; full set lives in user_roles */
    primaryRole: text("primary_role").notNull().default("buyer"),
    status: userStatusEnum("status").notNull().default("active"),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    identityVerifiedAt: timestamp("identity_verified_at", { withTimezone: true }),
    verificationLevel: integer("verification_level").notNull().default(0),
    cityId: uuid("city_id"),
    bio: text("bio"),
    /** user-provided budget/preferences used by recommendations */
    preferences: jsonb("preferences").$type<{ budgetMax?: number; cities?: string[]; types?: string[] }>().default({}),
    suspendedReason: text("suspended_reason"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_phone_idx").on(t.phone), index("users_status_idx").on(t.status)],
);

export const roles = pgTable("roles", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isStaff: boolean("is_staff").notNull().default(false),
});

export const permissions = pgTable("permissions", {
  id: id(),
  key: text("key").notNull().unique(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    ip: text("ip"),
    client: text("client").notNull().default("web"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    target: text("target").notNull(),
    purpose: text("purpose").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("otp_target_idx").on(t.target, t.purpose)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_actor_idx").on(t.actorId), index("audit_created_idx").on(t.createdAt)],
);

/** Fixed-window rate limit counters (works across multiple app instances). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

/** Generic user activity stream (searches, views) for recommendations. */
export const userEvents = pgTable(
  "user_events",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    anonId: text("anon_id"),
    type: text("type").notNull(),
    listingId: uuid("listing_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("user_events_user_idx").on(t.userId, t.createdAt), index("user_events_type_idx").on(t.type)],
);

export const follows = pgTable(
  "follows",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // location | agent | agency | developer | project
    targetId: uuid("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId] }), index("follows_target_idx").on(t.targetType, t.targetId)],
);

