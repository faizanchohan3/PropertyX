import { cancelSubscription } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

export const DELETE = route(async ({ user }) => {
  await cancelSubscription(db, user);
  return { ok: true };
}, { auth: true });
