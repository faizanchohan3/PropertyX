/**
 * Reference (non-demo) data required for the platform to run: RBAC tables, feature
 * catalogue, subscription plans, default construction rates and settings.
 * Idempotent — safe to run on every deploy (`npm run db:seed -- --reference-only`).
 */
import { sql } from "drizzle-orm";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, STAFF_ROLES, FEATURES, DEFAULT_FINANCING_PRODUCTS, type ConstructionRates } from "@propertyx/shared";
import type { Database } from "./client";
import { syncGeography } from "./geography";
import { roles, permissions, rolePermissions, features, subscriptionPlans, siteSettings, constructionRates } from "./schema";

export const DEFAULT_CONSTRUCTION_RATES: ConstructionRates = {
  greyStructurePerSqft: 2_900,
  finishingPerSqft: { basic: 900, standard: 1_500, premium: 2_500, luxury: 4_000 },
  electricalPerSqft: { basic: 180, standard: 280, premium: 420, luxury: 650 },
  plumbingPerSqft: { basic: 150, standard: 250, premium: 380, luxury: 600 },
  woodworkPerSqft: { basic: 250, standard: 450, premium: 750, luxury: 1_200 },
  kitchenPerUnit: { basic: 450_000, standard: 900_000, premium: 1_800_000, luxury: 3_500_000 },
  bathroomPerUnit: { basic: 150_000, standard: 300_000, premium: 600_000, luxury: 1_200_000 },
  laborPerSqft: 450,
  cityMultiplier: 1,
  effectiveDate: "2026-09-01",
};

export const CITY_COST_MULTIPLIERS: Record<string, number> = {
  lahore: 1,
  islamabad: 1.08,
  karachi: 1.05,
  rawalpindi: 1.04,
  multan: 0.94,
  faisalabad: 0.95,
  gujranwala: 0.94,
  peshawar: 0.97,
  sahiwal: 0.92,
  vehari: 0.9,
  burewala: 0.9,
  "mian-channu": 0.9,
};

export const PLANS = [
  {
    key: "free",
    name: "Free",
    audience: "everyone",
    description: "For individual owners listing a property occasionally.",
    priceMonthly: 0,
    priceYearly: 0,
    listingQuota: 5,
    featuredQuota: 0,
    agentSeats: 1,
    features: ["Up to 5 active listings", "Basic dashboard", "Messages and visit requests", "Phone verification badge"],
    capabilities: [],
    sortOrder: 1,
  },
  {
    key: "agent_pro",
    name: "Agent Pro",
    audience: "agent",
    description: "For independent agents who need reach and lead tools.",
    priceMonthly: 4_999,
    priceYearly: 49_990,
    listingQuota: 50,
    featuredQuota: 5,
    agentSeats: 1,
    features: ["Up to 50 active listings", "5 featured listings / month", "Lead management", "Listing analytics", "Priority placement in agent directory"],
    capabilities: ["crm", "analytics"],
    sortOrder: 2,
  },
  {
    key: "agency",
    name: "Agency",
    audience: "agency",
    description: "For agencies running a team of agents.",
    priceMonthly: 19_999,
    priceYearly: 199_990,
    listingQuota: 300,
    featuredQuota: 25,
    agentSeats: 10,
    features: ["Up to 300 active listings", "25 featured listings / month", "10 agent seats", "Team management & permissions", "Agency CRM & deal pipeline", "Advanced analytics"],
    capabilities: ["crm", "analytics", "analytics_advanced", "team"],
    sortOrder: 3,
  },
  {
    key: "developer",
    name: "Developer",
    audience: "developer",
    description: "For developers marketing projects and managing inventory.",
    priceMonthly: 29_999,
    priceYearly: 299_990,
    listingQuota: 100,
    featuredQuota: 10,
    agentSeats: 5,
    features: ["Unlimited projects", "Unit inventory & availability", "Payment plan builder", "Project lead management", "Brochure downloads tracking"],
    capabilities: ["crm", "analytics", "projects"],
    sortOrder: 4,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    audience: "enterprise",
    description: "Custom solutions for large agencies, developers and portals.",
    priceMonthly: 0,
    priceYearly: 0,
    listingQuota: 5_000,
    featuredQuota: 200,
    agentSeats: 100,
    features: ["Custom listing limits", "API access", "Dedicated account manager", "Custom integrations", "SLA support"],
    capabilities: ["crm", "analytics", "analytics_advanced", "team", "projects", "api", "priority_support"],
    isContactSales: true,
    sortOrder: 5,
  },
] as const;

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  homepage: {
    heroTitle: "Find a Place You'll Love to Call Home.",
    heroSubtitle: "Search verified homes, plots and commercial property across Pakistan — with AI that explains every match.",
    featuredCities: ["lahore", "islamabad", "karachi", "rawalpindi", "multan", "faisalabad", "gujranwala", "peshawar"],
    sections: { featured: true, projects: true, recommended: true, cities: true, tools: true, guides: true, agents: true },
    announcement: "",
  },
  marla_sqft: 225,
  financing_products: DEFAULT_FINANCING_PRODUCTS,
  investment_weights: { yield: 0.35, appreciation: 0.3, demand: 0.2, affordability: 0.15 },
  featured_pricing: { 7: 1_500, 15: 2_500, 30: 4_500 },
  listing_expiry_days: 90,
  fraud_thresholds: { priceDeviationPct: 55, maxListingsPerPhonePerDay: 15, spamScoreBlock: 50 },
  demo_mode: true,
};

/** opts.geography=false lets the demo seed insert its own cities first (it then calls syncGeography itself). */
export async function syncReferenceData(db: Database, opts: { geography?: boolean } = {}) {
  // roles
  for (const r of ROLES) {
    await db
      .insert(roles)
      .values({ key: r.key, name: r.label, isStaff: STAFF_ROLES.includes(r.key) })
      .onConflictDoUpdate({ target: roles.key, set: { name: r.label, isStaff: STAFF_ROLES.includes(r.key) } });
  }
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.insert(permissions).values({ key, description }).onConflictDoUpdate({ target: permissions.key, set: { description } });
  }
  const roleRows = await db.select().from(roles);
  const permRows = await db.select().from(permissions);
  const roleId = new Map(roleRows.map((r) => [r.key, r.id]));
  const permId = new Map(permRows.map((p) => [p.key, p.id]));
  await db.delete(rolePermissions);
  const rp: { roleId: string; permissionId: string }[] = [];
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) for (const p of perms) rp.push({ roleId: roleId.get(role)!, permissionId: permId.get(p)! });
  if (rp.length) await db.insert(rolePermissions).values(rp);

  for (const f of FEATURES) {
    await db
      .insert(features)
      .values({ key: f.key, label: f.label, group: f.group, isFilter: f.filter })
      .onConflictDoUpdate({ target: features.key, set: { label: f.label, group: f.group, isFilter: f.filter } });
  }

  for (const p of PLANS) {
    const values = { ...p, features: [...p.features], capabilities: [...p.capabilities], isContactSales: "isContactSales" in p ? p.isContactSales : false };
    await db.insert(subscriptionPlans).values(values).onConflictDoNothing({ target: subscriptionPlans.key });
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(siteSettings).values({ key, value }).onConflictDoNothing();
  }

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(constructionRates);
  if (n === 0) await db.insert(constructionRates).values({ cityId: null, rates: DEFAULT_CONSTRUCTION_RATES });

  if (opts.geography !== false) await syncGeography(db);
}
