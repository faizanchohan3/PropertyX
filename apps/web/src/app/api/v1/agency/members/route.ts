import { addAgencyMember, agencyTeam } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => agencyTeam(db, user!), { auth: true });
export const POST = route(async ({ req, user }) => ({ userId: await addAgencyMember(db, user, await body(req)) }), { auth: true, rate: 20 });
