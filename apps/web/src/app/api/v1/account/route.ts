import { getAccount, updateProfile } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => getAccount(db, user!), { auth: true });
export const PATCH = route(async ({ req, user }) => {
  const b = await body<{ name?: string; bio?: string; cityId?: string | null }>(req);
  await updateProfile(db, user, { name: b.name, bio: b.bio, cityId: b.cityId });
  return { ok: true };
}, { auth: true });
