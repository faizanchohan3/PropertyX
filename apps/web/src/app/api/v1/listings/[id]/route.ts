import { getListingDetail, updateListing, deleteListing, submitListing } from "@propertyx/core";
import { route, body, json } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route<{ id: string }>(async ({ params, user }) => {
  const d = await getListingDetail(db, params.id, user);
  if (!d) return json({ error: { code: "not_found", message: "Listing not found" } }, 404);
  const { poster, ...rest } = d;
  return { ...rest, listing: { ...d.listing, contactPhone: d.listing.isSeed ? null : d.listing.contactPhone }, poster: poster ? { name: poster.name, verificationLevel: poster.verificationLevel } : null };
});

export const PUT = route<{ id: string }>(async ({ req, user, params }) => {
  const l = await updateListing(db, user, params.id, await body(req));
  if (req.nextUrl.searchParams.get("submit") === "1") return submitListing(db, user!, l.id);
  return l;
}, { auth: true, rate: 30 });

export const DELETE = route<{ id: string }>(async ({ user, params }) => {
  await deleteListing(db, user, params.id);
  return { ok: true };
}, { auth: true });
