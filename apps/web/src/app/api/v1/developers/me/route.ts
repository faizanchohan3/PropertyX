import { createDeveloperProfile, updateDeveloperProfile, myDeveloper } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => ({ developer: await myDeveloper(db, user!) }), { auth: true });
export const POST = route(async ({ req, user }) => createDeveloperProfile(db, user, await body(req)), { auth: true });
export const PATCH = route(async ({ req, user }) => {
  await updateDeveloperProfile(db, user, await body(req));
  return { ok: true };
}, { auth: true });
