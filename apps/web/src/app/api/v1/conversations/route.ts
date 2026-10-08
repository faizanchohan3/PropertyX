import { listConversations, startConversation } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => ({ items: await listConversations(db, user!) }), { auth: true });

export const POST = route(async ({ req, user }) => {
  const b = await body<{ listingId?: string; projectId?: string; userId?: string; message?: string }>(req);
  const c = await startConversation(db, user, b);
  return { id: c.id };
}, { auth: true, rate: 30 });
