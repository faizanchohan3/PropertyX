import { updateLead } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const PATCH = route<{ id: string }>(async ({ user, params, req }) => updateLead(db, user, params.id, await body(req)), { auth: true });
