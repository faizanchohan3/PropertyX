import { NextResponse } from "next/server";
import { changePassword } from "@propertyx/core";
import { route, body, clearSessionCookie } from "@/lib/api";
import { db } from "@/lib/server";

/** Changing the password signs out every session (including this one). */
export const POST = route(async ({ req, user }) => {
  const b = await body<{ current: string; next: string }>(req);
  await changePassword(db, user, b.current ?? "", b.next ?? "");
  return clearSessionCookie(NextResponse.json({ ok: true, signedOut: true }));
}, { auth: true, rate: 5 });
