import "server-only";
import { eq } from "drizzle-orm";
import { savedProperties, cities } from "@propertyx/database";
import { cache } from "react";
import { db } from "./server";

export async function savedIdsFor(userId: string) {
  const rows = await db.select({ id: savedProperties.listingId }).from(savedProperties).where(eq(savedProperties.userId, userId));
  return rows.map((r) => r.id);
}

export const allCities = cache(async () => db.select({ id: cities.id, name: cities.name, slug: cities.slug, lat: cities.lat, lng: cities.lng }).from(cities).orderBy(cities.sortOrder, cities.name));
