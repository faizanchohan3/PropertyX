import { updateSavedSearch, deleteSavedSearch } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const PATCH = route<{ id: string }>(async ({ user, params, req }) => {
  await updateSavedSearch(db, user, params.id, await body(req));
  return { ok: true };
}, { auth: true });
export const DELETE = route<{ id: string }>(async ({ user, params }) => {
  await deleteSavedSearch(db, user, params.id);
  return { ok: true };
}, { auth: true });
