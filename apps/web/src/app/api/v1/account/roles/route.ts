import { addSelfRole } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route(async ({ req, user }) => {
  const b = await body<{ role: string }>(req);
  await addSelfRole(db, user, b.role);
  return { ok: true };
}, { auth: true });
