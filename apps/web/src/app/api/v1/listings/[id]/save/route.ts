import { toggleSaved } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route<{ id: string }>(async ({ user, params }) => toggleSaved(db, user, params.id, true), { auth: true, rate: 60 });
export const DELETE = route<{ id: string }>(async ({ user, params }) => toggleSaved(db, user, params.id, false), { auth: true, rate: 60 });
