import { getNotificationPreferences, setNotificationPreferences } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => ({ items: await getNotificationPreferences(db, user!) }), { auth: true });
export const PUT = route(async ({ req, user }) => {
  await setNotificationPreferences(db, user, await body(req));
  return { ok: true };
}, { auth: true });
