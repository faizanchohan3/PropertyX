import { createCampaign, myCampaigns } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => ({ items: await myCampaigns(db, user!) }), { auth: true });
export const POST = route(async ({ req, user }) => createCampaign(db, user, await body(req)), { auth: true, rate: 10 });
