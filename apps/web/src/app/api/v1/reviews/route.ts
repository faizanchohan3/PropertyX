import { createReview, listReviews } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  return { items: await listReviews(db, sp.get("targetType") ?? "", sp.get("targetId") ?? "") };
});
export const POST = route(async ({ req, user }) => createReview(db, user, await body(req)), { auth: true, rate: 10 });
