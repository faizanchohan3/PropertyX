import { saveProject } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const PUT = route<{ id: string }>(async ({ req, user, params }) => ({ id: await saveProject(db, user, await body(req), params.id) }), { auth: true, rate: 20 });
