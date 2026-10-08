import { listNotifications } from "@propertyx/core";
import { markRead, unreadCount } from "@propertyx/notifications";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => {
  const items = await listNotifications(db, user!);
  return { items, unread: await unreadCount(db, user!.id) };
}, { auth: true });

export const PATCH = route(async ({ user, req }) => {
  const b = await body<{ ids?: string[] }>(req);
  await markRead(db, user!.id, b.ids);
  return { ok: true };
}, { auth: true });
