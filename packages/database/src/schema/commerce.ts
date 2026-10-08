import { pgTable, text, uuid, integer, boolean, timestamp, index, bigint, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { id, createdAt, updatedAt, isSeed } from "./_helpers";
import { users } from "./identity";
import { agencies } from "./organizations";
import { locations } from "./locations";
import { paymentPurposeEnum, paymentStatusEnum, subscriptionStatusEnum, adStatusEnum, adFormatEnum } from "./enums";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  audience: text("audience").notNull(), // everyone | agent | agency | developer | enterprise
  description: text("description"),
  priceMonthly: bigint("price_monthly", { mode: "number" }).notNull().default(0),
  priceYearly: bigint("price_yearly", { mode: "number" }).notNull().default(0),
  listingQuota: integer("listing_quota").notNull(),
  featuredQuota: integer("featured_quota").notNull().default(0),
  agentSeats: integer("agent_seats").notNull().default(1),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  /** capability flags checked in code: crm, analytics_advanced, api, team, projects, priority_support */
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  isContactSales: boolean("is_contact_sales").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: updatedAt(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
    planId: uuid("plan_id").notNull().references(() => subscriptionPlans.id),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    billingCycle: text("billing_cycle").notNull().default("monthly"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull().defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    featuredCreditsUsed: integer("featured_credits_used").notNull().default(0),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId, t.status)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    purpose: paymentPurposeEnum("purpose").notNull(),
    /** id of the subscription plan / listing / ad / project being paid for */
    referenceId: text("reference_id"),
    description: text("description").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("PKR"),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    failureReason: text("failure_reason"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("payments_invoice_uq").on(t.invoiceNumber), index("payments_user_idx").on(t.userId, t.createdAt), index("payments_status_idx").on(t.status)],
);

export const advertisements = pgTable(
  "advertisements",
  {
    id: id(),
    advertiserId: uuid("advertiser_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    campaignName: text("campaign_name").notNull(),
    format: adFormatEnum("format").notNull(),
    targetType: text("target_type").notNull(), // listing | project | agency | agent | brand
    targetId: uuid("target_id"),
    title: text("title").notNull(),
    body: text("body"),
    imageUrl: text("image_url"),
    linkUrl: text("link_url"),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    budget: bigint("budget", { mode: "number" }).notNull().default(0),
    spent: bigint("spent", { mode: "number" }).notNull().default(0),
    costPerMille: integer("cost_per_mille").notNull().default(250),
    costPerClick: integer("cost_per_click").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    status: adStatusEnum("status").notNull().default("pending"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    paymentId: uuid("payment_id"),
    reviewedById: uuid("reviewed_by_id"),
    rejectionReason: text("rejection_reason"),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ads_status_format_idx").on(t.status, t.format, t.startAt, t.endAt), index("ads_advertiser_idx").on(t.advertiserId)],
);

/** Key/value platform configuration editable by admins (homepage, scoring weights, financing products…). */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedById: uuid("updated_by_id"),
  updatedAt: updatedAt(),
});
