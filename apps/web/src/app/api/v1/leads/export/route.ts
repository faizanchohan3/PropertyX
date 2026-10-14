import { exportLeadsCsv } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

/** Download leads as CSV (opens in Excel / Google Sheets, imports into any CRM). */
export const GET = route(async ({ user, req }) => {
  const sc = req.nextUrl.searchParams.get("scope");
  const scope = sc === "team" || sc === "platform" ? sc : "mine";
  const csv = await exportLeadsCsv(db, user!, scope);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${scope}-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}, { auth: true, rate: 20 });
