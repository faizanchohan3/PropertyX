import { z } from "zod";
import { FEATURES, PROPERTY_TYPE_KEYS, PURPOSES, SORT_OPTIONS, FURNISHING, CONDITIONS } from "./constants";
import { AREA_UNITS } from "./units";

const csv = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => {
    if (v == null || v === "") return undefined;
    const arr = Array.isArray(v) ? v.flatMap((x) => String(x).split(",")) : String(v).split(",");
    return arr.map((s) => s.trim()).filter(Boolean);
  }, z.array(item).optional());

const num = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().finite().optional());
const bool = z.preprocess((v) => (v === "1" || v === "true" || v === true ? true : v === "0" || v === "false" ? false : undefined), z.boolean().optional());

const featureKeys = FEATURES.map((f) => f.key) as unknown as [string, ...string[]];
const sortKeys = SORT_OPTIONS.map((s) => s.key) as unknown as [string, ...string[]];

export const searchQuerySchema = z.object({
  purpose: z.enum(PURPOSES).optional(),
  types: csv(z.enum(PROPERTY_TYPE_KEYS)),
  /** city slug */
  city: z.string().max(80).optional(),
  /** any location slug (area / society / block); narrower than city */
  location: z.string().max(120).optional(),
  province: z.string().max(80).optional(),
  q: z.string().max(200).optional(),
  priceMin: num,
  priceMax: num,
  areaMin: num,
  areaMax: num,
  areaUnit: z.enum(AREA_UNITS).optional(),
  /** 0 = studio, 6 = 6+ */
  beds: csv(z.coerce.number().int().min(0).max(6)),
  bathsMin: num,
  features: csv(z.enum(featureKeys)),
  furnishing: z.enum(FURNISHING).optional(),
  condition: z.enum(CONDITIONS).optional(),
  verified: bool,
  hasVideo: bool,
  hasTour: bool,
  installments: bool,
  sort: z.enum(sortKeys).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  /** bounding box "west,south,east,north" */
  bbox: z.string().regex(/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/).optional(),
  lat: num,
  lng: num,
  radiusKm: num,
  /** polygon "lat lng;lat lng;..." (drawn on map) */
  polygon: z.string().max(4000).optional(),
  agent: z.string().uuid().optional(),
  agency: z.string().uuid().optional(),
  owner: z.string().uuid().optional(),
  excludeId: z.string().uuid().optional(),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export function parseSearchQuery(input: Record<string, string | string[] | undefined> | URLSearchParams): SearchQuery {
  const obj: Record<string, unknown> = {};
  if (input instanceof URLSearchParams) {
    for (const key of new Set(input.keys())) {
      const all = input.getAll(key);
      obj[key] = all.length > 1 ? all : all[0];
    }
  } else Object.assign(obj, input);
  const parsed = searchQuerySchema.safeParse(obj);
  if (parsed.success) return parsed.data;
  // Drop invalid fields instead of failing the whole search (robust to hand-edited URLs)
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const shape = (searchQuerySchema.shape as Record<string, z.ZodTypeAny>)[k];
    if (!shape) continue;
    const r = shape.safeParse(v);
    if (r.success && r.data !== undefined) clean[k] = r.data;
  }
  return clean as SearchQuery;
}

export function serializeSearchQuery(q: Partial<SearchQuery>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    if (k === "page" && v === 1) continue;
    p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  return p;
}

export function parseBbox(b: string) {
  const [west, south, east, north] = b.split(",").map(Number);
  return { west, south, east, north };
}

export function parsePolygon(s: string): [number, number][] {
  return s
    .split(";")
    .map((pair) => pair.trim().split(/[ ,]+/).map(Number) as [number, number])
    .filter((p) => p.length === 2 && p.every(Number.isFinite));
}

/** Ray casting point-in-polygon; polygon is [lat, lng][] */
export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
