import { visitsIcs } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => new Response(await visitsIcs(db, user!), { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="propertyx-visits.ics"' } }), { auth: true });
