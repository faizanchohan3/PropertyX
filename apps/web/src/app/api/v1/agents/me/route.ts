import { upsertAgentProfile, getMyAgentProfile } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => ({ agent: await getMyAgentProfile(db, user!) }), { auth: true });
export const PUT = route(async ({ req, user }) => ({ id: await upsertAgentProfile(db, user, await body(req)) }), { auth: true });
