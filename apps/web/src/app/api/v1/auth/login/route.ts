import { NextResponse } from "next/server";
import { login } from "@propertyx/core";
import { route, body, setSessionCookie } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route(async ({ req, ip }) => {
  const input = await body(req);
  const client = req.headers.get("x-client") ?? "web";
  const r = await login(db, input, { ip, userAgent: req.headers.get("user-agent"), client });
  const user = { id: r.user.id, name: r.user.name, email: r.user.email, primaryRole: r.user.primaryRole };
  // mobile clients receive the token in the body; browsers get an httpOnly cookie
  const res = NextResponse.json(client === "web" ? { user } : { user, token: r.token, expiresAt: r.expiresAt });
  if (client === "web") setSessionCookie(res, r.token);
  return res;
});
