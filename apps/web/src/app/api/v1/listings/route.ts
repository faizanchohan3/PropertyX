import { createListing, listMyListings } from "@propertyx/core";
import { createSearchEngine } from "@propertyx/search";
import { parseSearchQuery } from "@propertyx/shared";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

/** Public search (mobile apps) */
export const GET = route(async ({ req, user }) => {
  if (req.nextUrl.searchParams.get("mine") === "1" && user) return listMyListings(db, user, { status: req.nextUrl.searchParams.get("status") ?? undefined });
  return createSearchEngine(db).search(parseSearchQuery(req.nextUrl.searchParams));
}, { rate: 120 });

/** Create listing; ?submit=1 sends it for review, otherwise saved as draft */
export const POST = route(async ({ req, user }) => {
  const submit = req.nextUrl.searchParams.get("submit") === "1";
  const l = await createListing(db, user, await body(req), { submit });
  return { id: l.id, slug: l.slug, status: l.status };
}, { auth: true, rate: 20 });
