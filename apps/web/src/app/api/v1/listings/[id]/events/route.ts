import { recordListingEvent, type ListingEventType } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route<{ id: string }>(async ({ req, params, user }) => {
  const b = await body<{ type: ListingEventType; anonId?: string }>(req);
  await recordListingEvent(db, { listingId: params.id, type: b.type, userId: user?.id, anonId: typeof b.anonId === "string" ? b.anonId.slice(0, 64) : null });
  return { ok: true };
}, { rate: 120 });
