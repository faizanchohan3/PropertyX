import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@propertyx/core";
import { rateLimit, SESSION_COOKIE, SESSION_TTL_DAYS, type AuthUser } from "@propertyx/auth";
import { db, getUser } from "./server";

export function clientIp(req: NextRequest | Request) {
  const h = req.headers;
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "127.0.0.1";
}

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

/**
 * CSRF: cookie-authenticated state-changing requests must come from our own origin.
 * Bearer-token requests (mobile apps) are not vulnerable to CSRF.
 */
function checkOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return true;
  const origin = req.headers.get("origin");
  if (!origin) return !req.cookies.get(SESSION_COOKIE); // no cookie, nothing to forge
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Ctx<P> = { req: NextRequest; params: P; user: AuthUser | null; ip: string };

interface Options {
  auth?: boolean;
  /** requests per minute per user/IP */
  rate?: number;
}

/** Wraps a route handler with auth, CSRF, rate limiting and uniform error responses. */
export function route<P = Record<string, string>>(handler: (ctx: Ctx<P>) => Promise<Response | unknown>, opts: Options = {}) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      if (!checkOrigin(req)) return json({ error: { code: "csrf", message: "Cross-site request blocked" } }, 403);
      const user = await getUser();
      if (opts.auth && !user) return json({ error: { code: "unauthorized", message: "Please sign in to continue" } }, 401);
      const ip = clientIp(req);
      if (opts.rate) {
        const rl = await rateLimit(db, `api:${req.nextUrl.pathname}:${user?.id ?? ip}`, opts.rate, 60);
        if (!rl.ok) return json({ error: { code: "rate_limited", message: "Too many requests. Please slow down." } }, { status: 429, headers: { "retry-after": String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)) } });
      }
      const params = (await context.params) ?? ({} as P);
      const result = await handler({ req, params, user, ip });
      if (result instanceof Response) return result;
      return json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof AppError) return json({ error: { code: e.code, message: e.message, details: e.details } }, e.status);
      if (e instanceof ZodError) return json({ error: { code: "bad_request", message: e.issues[0]?.message ?? "Invalid input", details: e.flatten() } }, 400);
      if (e instanceof SyntaxError) return json({ error: { code: "bad_request", message: "Invalid JSON body" } }, 400);
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return json({ error: { code: "server_error", message: "Something went wrong. Please try again." } }, 500);
    }
  };
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  const text = await req.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export function sp(req: NextRequest) {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}
