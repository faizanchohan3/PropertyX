import { createAgency, updateAgency } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route(async ({ req, user }) => createAgency(db, user, await body(req)), { auth: true });
export const PATCH = route(async ({ req, user }) => {
  const b = await body<Record<string, unknown>>(req);
  const allowed = ["name", "description", "phone", "whatsapp", "email", "website", "address", "establishedYear"] as const;
  await updateAgency(db, user, Object.fromEntries(allowed.filter((k) => b[k] !== undefined).map((k) => [k, b[k]])) as never);
  return { ok: true };
}, { auth: true });
