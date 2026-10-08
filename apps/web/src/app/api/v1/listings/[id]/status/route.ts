import { setListingStatus } from "@propertyx/core";
import type { ListingStatus } from "@propertyx/shared";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const PATCH = route<{ id: string }>(async ({ req, user, params }) => {
  const b = await body<{ status: ListingStatus }>(req);
  return setListingStatus(db, user, params.id, b.status);
}, { auth: true });
