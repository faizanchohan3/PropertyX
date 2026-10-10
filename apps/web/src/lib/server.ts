import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db as lazyDb } from "@propertyx/database";
import { resolveSession, SESSION_COOKIE, type AuthUser } from "@propertyx/auth";
import { getSetting } from "@propertyx/core";
import { publicAppUrl, type Permission } from "@propertyx/shared";

// lazy: connects on first query, so `next build` works without DATABASE_URL
export const db = lazyDb;

/** Current user for server components / route handlers (cookie or Bearer token). */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const h = await headers();
  const auth = h.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolveSession(db, bearer ?? cookie);
});

export async function requireUser(next?: string): Promise<AuthUser> {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next ?? "/dashboard")}`);
  return u;
}

export async function requirePermission(p: Permission, next?: string): Promise<AuthUser> {
  const u = await requireUser(next);
  if (!u.permissions.includes(p)) redirect("/dashboard?denied=1");
  return u;
}

export const isDemoMode = cache(async () => !!(await getSetting<boolean>(db, "demo_mode")));

export function appUrl() {
  return publicAppUrl();
}
