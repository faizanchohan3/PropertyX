import { createSavedSearch, listSavedSearches } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => ({ items: await listSavedSearches(db, user!) }), { auth: true });
export const POST = route(async ({ user, req }) => createSavedSearch(db, user, await body(req)), { auth: true, rate: 20 });
