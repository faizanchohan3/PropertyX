import { submitVerification, myVerification } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => myVerification(db, user!), { auth: true });
export const POST = route(async ({ req, user }) => submitVerification(db, user, await body(req)), { auth: true, rate: 10 });
