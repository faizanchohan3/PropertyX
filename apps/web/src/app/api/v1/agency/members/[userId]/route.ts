import { updateAgencyMember } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const PATCH = route<{ userId: string }>(async ({ req, user, params }) => {
  await updateAgencyMember(db, user, params.userId, await body(req));
  return { ok: true };
}, { auth: true });
