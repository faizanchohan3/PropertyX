import { recordListingEvent, recordContactLead, type ListingEventType } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route<{ id: string }>(async ({ req, params, user }) => {
  const b = await body<{ type: ListingEventType; anonId?: string }>(req);
  const anonId = typeof b.anonId === "string" ? b.anonId.slice(0, 64) : null;
  await recordListingEvent(db, { listingId: params.id, type: b.type, userId: user?.id, anonId });
  // WhatsApp / Call taps also become leads for the advertiser
  if (b.type === "whatsapp_click" || b.type === "call_click") await recordContactLead(db, user ?? null, params.id, b.type === "whatsapp_click" ? "whatsapp" : "call", anonId).catch(() => null);
  return { ok: true };
}, { rate: 120 });
