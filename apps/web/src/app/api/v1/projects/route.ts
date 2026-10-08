import { listProjects, saveProject } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  return { items: await listProjects(db, { city: sp.get("city") ?? undefined, status: sp.get("status") ?? undefined, q: sp.get("q") ?? undefined, unitType: sp.get("unitType") ?? undefined }) };
});
export const POST = route(async ({ req, user }) => ({ id: await saveProject(db, user, await body(req)) }), { auth: true, rate: 20 });
