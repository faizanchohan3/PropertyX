import { createLead, listLeads } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route(async ({ user, req, ip }) => createLead(db, user, await body(req), { ip }), { rate: 20 });
export const GET = route(async ({ user, req }) => {
  const sp = req.nextUrl.searchParams;
  return { items: await listLeads(db, user!, { status: sp.get("status") ?? undefined, scope: (sp.get("scope") as "team") ?? "mine", saved: sp.get("saved") === "1", q: sp.get("q") ?? undefined }) };
}, { auth: true });
