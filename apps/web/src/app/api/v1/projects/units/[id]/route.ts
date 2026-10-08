import { updateUnitAvailability } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const PATCH = route<{ id: string }>(async ({ req, user, params }) => {
  await updateUnitAvailability(db, user, params.id, Number((await body<{ available: number }>(req)).available));
  return { ok: true };
}, { auth: true });
