import { featureWithCredit } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route<{ id: string }>(async ({ user, params }) => {
  await featureWithCredit(db, user, params.id);
  return { ok: true };
}, { auth: true });
