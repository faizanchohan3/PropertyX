import { respondToReview } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route<{ id: string }>(async ({ req, user, params }) => {
  await respondToReview(db, user, params.id, (await body<{ body: string }>(req)).body ?? "");
  return { ok: true };
}, { auth: true });
