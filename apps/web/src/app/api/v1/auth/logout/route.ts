import { NextResponse } from "next/server";
import { revokeSession } from "@propertyx/auth";
import { route, clearSessionCookie } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route(async ({ user }) => {
  if (user) await revokeSession(db, user.sessionId);
  return clearSessionCookie(NextResponse.json({ ok: true }));
});
