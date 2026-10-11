import { createSearchEngine } from "@propertyx/search";
import { parseBbox, parseSearchQuery } from "@propertyx/shared";
import { getBoundaries } from "@propertyx/core";
import { route, json } from "@/lib/api";
import { db } from "@/lib/server";

/** Map features (pins or grid clusters) for the visible area + filters. */
export const GET = route(async ({ req }) => {
  const q = parseSearchQuery(req.nextUrl.searchParams);
  const zoom = Math.max(1, Math.min(19, Number(req.nextUrl.searchParams.get("zoom") ?? 12)));
  const engine = createSearchEngine(db);
  // area / society outlines once zoomed in far enough to read them
  const bbox = q.bbox ? parseBbox(q.bbox) : null;
  const [map, list, boundaries] = await Promise.all([engine.map(q, zoom), engine.search({ ...q, pageSize: 20 }), zoom >= 12 && bbox && [bbox.west, bbox.south, bbox.east, bbox.north].every(Number.isFinite) ? getBoundaries(db, [bbox.west, bbox.south, bbox.east, bbox.north]) : Promise.resolve([])]);
  return json({ ...map, list: list.items, listTotal: list.total, boundaries });
}, { rate: 120 });
