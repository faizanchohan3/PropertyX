/**
 * Area / society outlines for maps.
 * - "drawn": traced by staff in Admin → Areas and stored in the `location_boundaries` site setting
 *   (slug → [lat, lng][]), so no schema migration is needed.
 * - "approximate": when nothing is drawn, the convex hull of where that area's listings are,
 *   padded slightly. Always labelled approximate in the UI — it is not an official boundary.
 */
import { eq, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { audit } from "@propertyx/auth";
import { badRequest, notFound, requirePerm, type Actor } from "./errors";
import { clearSettingCache, getSetting } from "./settings";

export type LatLng = [number, number];
export interface Boundary {
  slug: string;
  name: string;
  kind: string;
  polygon: LatLng[];
  source: "drawn" | "approximate";
  activeListings: number;
}

const KEY = "location_boundaries";

async function drawnBoundaries(db: Database) {
  return (await getSetting<Record<string, LatLng[]>>(db, KEY)) ?? {};
}

/** Andrew's monotone chain on [lat, lng] points (treated as planar — fine at city scale). */
export function convexHull(points: LatLng[]): LatLng[] {
  const pts = [...new Map(points.map((p) => [`${p[0].toFixed(6)},${p[1].toFixed(6)}`, p])).values()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  if (pts.length < 3) return pts;
  const cross = (o: LatLng, a: LatLng, b: LatLng) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
  const lower: LatLng[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: LatLng[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Push each vertex away from the centroid so listings on the edge sit inside the outline. */
function pad(poly: LatLng[], factor = 0.15, minDeg = 0.0015): LatLng[] {
  const c: LatLng = [poly.reduce((t, p) => t + p[0], 0) / poly.length, poly.reduce((t, p) => t + p[1], 0) / poly.length];
  return poly.map(([a, b]) => {
    const da = a - c[0];
    const db = b - c[1];
    const len = Math.hypot(da, db) || 1;
    const grow = Math.max(len * factor, minDeg);
    return [+(a + (da / len) * grow).toFixed(6), +(b + (db / len) * grow).toFixed(6)] as LatLng;
  });
}

/** Outlines of areas and societies whose centre falls inside bbox [west, south, east, north]. */
export async function getBoundaries(db: Database, bbox: [number, number, number, number], opts: { slugs?: string[] } = {}): Promise<Boundary[]> {
  const [w, so, e, n] = bbox;
  const padLat = (n - so) * 0.25;
  const padLng = (e - w) * 0.25;
  const drawn = await drawnBoundaries(db);
  const locs = await db.execute<{ id: string; slug: string; name: string; kind: string; ref_id: string; active: number }>(sql`
    select l.id, l.slug, l.name, l.kind, l.ref_id,
      (select count(*)::int from properties p join property_listings pl on pl.property_id = p.id and pl.status = 'active'
        where (l.kind = 'society' and p.society_id = l.ref_id) or (l.kind = 'area' and p.area_id = l.ref_id)) as active
    from locations l
    where l.kind in ('area', 'society')
      ${opts.slugs?.length ? sql`and l.slug in (${sql.join(opts.slugs.map((x) => sql`${x}`), sql`, `)})` : sql`and l.lat between ${so - padLat} and ${n + padLat} and l.lng between ${w - padLng} and ${e + padLng}`}
    limit 300`);
  if (!locs.length) return [];
  const need = locs.filter((l) => !drawn[l.slug]);
  const pts = need.length
    ? await db.execute<{ ref_id: string; lat: number; lng: number }>(sql`
        select coalesce(p.society_id, p.area_id) as ref_id, p.lat, p.lng
        from properties p join property_listings pl on pl.property_id = p.id and pl.status in ('active', 'sold', 'rented')
        where p.lat is not null and p.lng is not null
          and (p.society_id in (${sql.join(need.map((l) => sql`${l.ref_id}`), sql`, `)}) or (p.society_id is null and p.area_id in (${sql.join(need.map((l) => sql`${l.ref_id}`), sql`, `)})))`)
    : [];
  const byRef = new Map<string, LatLng[]>();
  for (const p of pts) {
    const list = byRef.get(p.ref_id) ?? [];
    list.push([Number(p.lat), Number(p.lng)]);
    byRef.set(p.ref_id, list);
  }
  const out: Boundary[] = [];
  for (const l of locs) {
    if (drawn[l.slug]) {
      out.push({ slug: l.slug, name: l.name, kind: l.kind, polygon: drawn[l.slug], source: "drawn", activeListings: Number(l.active) });
      continue;
    }
    const hull = convexHull(byRef.get(l.ref_id) ?? []);
    if (hull.length >= 3) out.push({ slug: l.slug, name: l.name, kind: l.kind, polygon: pad(hull), source: "approximate", activeListings: Number(l.active) });
  }
  return out;
}

/** Save (or clear, with polygon = null) a staff-drawn boundary for an area or society. */
export async function saveBoundary(db: Database, actor: Actor | null, slug: string, polygon: unknown) {
  requirePerm(actor, "content.manage");
  const [loc] = await db.select({ id: s.locations.id, kind: s.locations.kind }).from(s.locations).where(eq(s.locations.slug, slug));
  if (!loc) throw notFound("Area");
  if (!["area", "society"].includes(loc.kind)) throw badRequest("Boundaries can only be drawn for areas and societies");
  const all = { ...(await drawnBoundaries(db)) };
  if (polygon == null) delete all[slug];
  else {
    if (!Array.isArray(polygon) || polygon.length < 3 || polygon.length > 300) throw badRequest("Draw at least 3 points (and at most 300)");
    const clean = polygon.map((p) => {
      const [a, b] = Array.isArray(p) ? p.map(Number) : [NaN, NaN];
      if (!(a > 23 && a < 38 && b > 60 && b < 78)) throw badRequest("Every point must be inside Pakistan");
      return [+a.toFixed(6), +b.toFixed(6)] as LatLng;
    });
    all[slug] = clean;
  }
  await db.insert(s.siteSettings).values({ key: KEY, value: all, updatedById: actor.id }).onConflictDoUpdate({ target: s.siteSettings.key, set: { value: all, updatedById: actor.id, updatedAt: new Date() } });
  clearSettingCache(KEY);
  await audit(db, { actorId: actor.id, action: polygon == null ? "location.boundary_clear" : "location.boundary_save", entityType: "location", entityId: loc.id });
  return { slug, points: polygon == null ? 0 : all[slug].length };
}
