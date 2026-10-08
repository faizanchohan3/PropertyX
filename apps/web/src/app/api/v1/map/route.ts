import { createSearchEngine } from "@propertyx/search";
import { parseSearchQuery } from "@propertyx/shared";
import { route, json } from "@/lib/api";
import { db } from "@/lib/server";

/** Map features (pins or grid clusters) for the visible area + filters. */
export const GET = route(async ({ req }) => {
  const q = parseSearchQuery(req.nextUrl.searchParams);
  const zoom = Math.max(1, Math.min(19, Number(req.nextUrl.searchParams.get("zoom") ?? 12)));
  const engine = createSearchEngine(db);
  const [map, list] = await Promise.all([engine.map(q, zoom), engine.search({ ...q, pageSize: 20 })]);
  return json({ ...map, list: list.items, listTotal: list.total });
}, { rate: 120 });
