import { eq } from "drizzle-orm";
import { areas, societies, blocks, cities } from "@propertyx/database";
import { route, json } from "@/lib/api";
import { db } from "@/lib/server";

/** Areas, societies and blocks of a city — used by the listing wizard. */
export const GET = route(async ({ req }) => {
  const cityId = req.nextUrl.searchParams.get("cityId");
  if (!cityId) {
    const list = await db.select({ id: cities.id, name: cities.name, slug: cities.slug, lat: cities.lat, lng: cities.lng }).from(cities).orderBy(cities.sortOrder);
    return json({ cities: list });
  }
  const [a, s, b] = await Promise.all([
    db.select({ id: areas.id, name: areas.name, lat: areas.lat, lng: areas.lng }).from(areas).where(eq(areas.cityId, cityId)).orderBy(areas.name),
    db.select({ id: societies.id, name: societies.name, lat: societies.lat, lng: societies.lng }).from(societies).where(eq(societies.cityId, cityId)).orderBy(societies.name),
    db.select({ id: blocks.id, name: blocks.name, societyId: blocks.societyId, areaId: blocks.areaId, lat: blocks.lat, lng: blocks.lng }).from(blocks).where(eq(blocks.cityId, cityId)).orderBy(blocks.name),
  ]);
  return json({ areas: a, societies: s, blocks: b }, { headers: { "cache-control": "public, max-age=300" } });
});
