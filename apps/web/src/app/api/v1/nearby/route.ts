import { route, json } from "@/lib/api";

/**
 * Nearby places from OpenStreetMap (Overpass API). Results are cached for a day.
 * Categories: schools, hospitals, mosques, markets, restaurants, parks, main roads, transport.
 */
const CATEGORIES: Record<string, string> = {
  schools: 'nwr["amenity"~"school|college|university"]',
  hospitals: 'nwr["amenity"~"hospital|clinic"]',
  mosques: 'nwr["amenity"="place_of_worship"]["religion"="muslim"]',
  markets: 'nwr["shop"~"supermarket|mall|marketplace|convenience"]',
  restaurants: 'nwr["amenity"~"restaurant|cafe|fast_food"]',
  parks: 'nwr["leisure"="park"]',
  transport: 'nwr["highway"="bus_stop"];nwr["public_transport"="station"];nwr["railway"="station"]',
  roads: 'way["highway"~"motorway|trunk|primary"]["name"]',
};

type OverpassResult = { elements: { tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }[] };

const CACHE = new Map<string, { at: number; body: unknown }>();

/** Public Overpass instances are rate-limited and sometimes unreachable; try each in turn. */
const ENDPOINTS = [
  ...(process.env.OVERPASS_URL ? process.env.OVERPASS_URL.split(",") : []),
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function overpass(query: string): Promise<OverpassResult> {
  let last: unknown;
  for (const url of [...new Set(ENDPOINTS.map((u) => u.trim()).filter(Boolean))]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "user-agent": "PropertyX-Pakistan/1.0 (nearby places)", accept: "application/json" },
        signal: AbortSignal.timeout(28_000),
        cache: "no-store",
      });
      if (!res.ok || !res.headers.get("content-type")?.includes("json")) throw new Error(`${url} → ${res.status}`);
      return (await res.json()) as OverpassResult;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

function km(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const GET = route(async ({ req }) => {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const radius = Math.min(3000, Math.max(300, Number(req.nextUrl.searchParams.get("radius") ?? 1500)));
  if (!(lat > 23 && lat < 38 && lng > 60 && lng < 78)) return json({ error: { code: "bad_request", message: "Coordinates outside Pakistan" } }, 400);
  const a = `(around:${radius},${lat.toFixed(5)},${lng.toFixed(5)})`;
  const r = `(around:${Math.round(radius * 1.5)},${lat.toFixed(5)},${lng.toFixed(5)})`;
  // few, broad statements keep public Overpass instances fast
  const parts = [
    `nwr["amenity"~"^(school|college|university|hospital|clinic|place_of_worship|restaurant|cafe|fast_food|bus_station)$"]${a};`,
    `nwr["shop"~"^(supermarket|mall|marketplace)$"]${a};`,
    `nwr["leisure"="park"]${a};`,
    `nwr["public_transport"="station"]${a};`,
    `way["highway"~"^(motorway|trunk|primary)$"]["name"]${r};`,
  ].join("");
  const query = `[out:json][timeout:25];(${parts});out center tags 400;`;
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < 86_400_000) return json(hit.body, { headers: { "cache-control": "public, max-age=86400" } });
  try {
    const data = await overpass(query);
    const out: Record<string, { name: string; distanceKm: number; lat: number; lng: number }[]> = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, []]));
    for (const el of data.elements) {
      const t = el.tags ?? {};
      const p = el.center ?? (el.lat != null ? { lat: el.lat, lon: el.lon! } : null);
      if (!p || !t.name) continue;
      const cat = t.amenity?.match(/school|college|university/)
        ? "schools"
        : t.amenity?.match(/hospital|clinic/)
          ? "hospitals"
          : t.amenity === "place_of_worship" && (!t.religion || t.religion === "muslim")
            ? "mosques"
            : t.shop
              ? "markets"
              : t.amenity?.match(/restaurant|cafe|fast_food/)
                ? "restaurants"
                : t.leisure === "park"
                  ? "parks"
                  : t.amenity === "bus_station" || t.public_transport || t.railway
                    ? "transport"
                    : t.highway
                      ? "roads"
                      : null;
      if (!cat) continue;
      const name = t["name:en"] ?? t.name;
      if (out[cat].some((x) => x.name === name)) continue;
      out[cat].push({ name, distanceKm: Math.round(km(lat, lng, p.lat, p.lon) * 100) / 100, lat: p.lat, lng: p.lon });
    }
    for (const k of Object.keys(out)) out[k] = out[k].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 6);
    const body = { source: "OpenStreetMap contributors", radius, places: out };
    if (CACHE.size > 5000) CACHE.clear();
    CACHE.set(cacheKey, { at: Date.now(), body });
    return json(body, { headers: { "cache-control": "public, max-age=86400" } });
  } catch (e) {
    return json({ source: "OpenStreetMap contributors", radius, places: null, error: "Nearby places are temporarily unavailable." }, 200);
  }
}, { rate: 30 });
