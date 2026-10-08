import { createReport } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route(async ({ user, req, ip }) => createReport(db, user, await body(req), { ip }), { rate: 10 });
