import { NextResponse } from "next/server";
import { recordAdClick } from "@propertyx/core";
import { route } from "@/lib/api";
import { db, appUrl } from "@/lib/server";

export const GET = route<{ id: string }>(async ({ params }) => {
  const link = await recordAdClick(db, params.id);
  const target = link.startsWith("/") ? new URL(link, appUrl()) : new URL(link);
  return NextResponse.redirect(target, 302);
});
