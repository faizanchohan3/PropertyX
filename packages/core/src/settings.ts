import { eq, isNull } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import { siteSettings, constructionRates, cities } from "@propertyx/database";
import { DEFAULT_SETTINGS, DEFAULT_CONSTRUCTION_RATES } from "@propertyx/database/reference";
import { audit } from "@propertyx/auth";
import type { ConstructionRates } from "@propertyx/shared";
import { requirePerm, type Actor } from "./errors";

const cache = new Map<string, { at: number; value: unknown }>();

export async function getSetting<T>(db: Database, key: string): Promise<T | undefined> {
  const c = cache.get(key);
  if (c && Date.now() - c.at < 30_000) return c.value as T;
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  const value = (row?.value ?? DEFAULT_SETTINGS[key]) as T | undefined;
  cache.set(key, { at: Date.now(), value });
  return value;
}

export async function setSetting(db: Database, actor: Actor | null, key: string, value: unknown) {
  requirePerm(actor, "settings.manage");
  await db.insert(siteSettings).values({ key, value, updatedById: actor.id }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedById: actor.id, updatedAt: new Date() } });
  cache.delete(key);
  await audit(db, { actorId: actor.id, action: "settings.update", entityType: "setting", entityId: key });
}

export async function getConstructionRates(db: Database, citySlug?: string): Promise<ConstructionRates> {
  if (citySlug) {
    const [row] = await db.select({ rates: constructionRates.rates }).from(constructionRates).innerJoin(cities, eq(cities.id, constructionRates.cityId)).where(eq(cities.slug, citySlug));
    if (row) return row.rates as ConstructionRates;
  }
  const [row] = await db.select({ rates: constructionRates.rates }).from(constructionRates).where(isNull(constructionRates.cityId));
  return (row?.rates as ConstructionRates) ?? DEFAULT_CONSTRUCTION_RATES;
}

export async function setConstructionRates(db: Database, actor: Actor | null, cityId: string | null, rates: ConstructionRates) {
  requirePerm(actor, "settings.manage");
  const existing = await db.select({ id: constructionRates.id }).from(constructionRates).where(cityId ? eq(constructionRates.cityId, cityId) : isNull(constructionRates.cityId));
  if (existing[0]) await db.update(constructionRates).set({ rates, updatedById: actor.id }).where(eq(constructionRates.id, existing[0].id));
  else await db.insert(constructionRates).values({ cityId, rates, updatedById: actor.id });
  await audit(db, { actorId: actor.id, action: "construction_rates.update", entityType: "construction_rates", entityId: cityId ?? "default" });
}
