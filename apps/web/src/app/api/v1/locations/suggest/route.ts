import { createSearchEngine } from "@propertyx/search";
import { route, json } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ req }) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const city = req.nextUrl.searchParams.get("city");
  let items = await createSearchEngine(db).suggestLocations(q, city ? 20 : 8);
  if (city) items = [...items.filter((i) => i.citySlug === city), ...items.filter((i) => i.citySlug !== city)].slice(0, 8);
  return json({ items }, { headers: { "cache-control": "public, max-age=60" } });
}, { rate: 120 });
