import { listVisits, requestVisit } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user, req }) => ({ items: await listVisits(db, user!, (req.nextUrl.searchParams.get("role") as "host" | "guest") ?? "all") }), { auth: true });
export const POST = route(async ({ user, req }) => requestVisit(db, user, await body(req)), { auth: true, rate: 20 });
