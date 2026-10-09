import { reviewsForOwner } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { PageHeader, Empty, fmtDate } from "@/components/dashboard/ui";
import { ReviewReply } from "@/components/dashboard/review-reply";
import { Star } from "lucide-react";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const user = await requirePermission("review.respond", "/dashboard/reviews");
  const rows = await reviewsForOwner(db, user);
  const avg = rows.length ? rows.reduce((t, r) => t + Number(r.rating), 0) / rows.length : 0;
  return (
    <div>
      <PageHeader title="Reviews" subtitle={rows.length ? `${avg.toFixed(1)} average from ${rows.length} published reviews` : "Reviews from clients appear here after moderation."} />
      {rows.length === 0 ? (
        <Empty title="No published reviews yet" body="Clients who enquired through Bismillah can review you. Reviews are moderated before publishing and marked when the reviewer had a verified interaction." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id as string} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{r.title as string}</p>
                <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < Number(r.rating) ? "fill-gold-400 text-gold-400" : "text-slate-200"}`} />)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.author_name as string} · {fmtDate(r.created_at as string)} · {r.target_type as string}{r.is_verified_interaction ? " · verified interaction" : ""}</p>
              <p className="mt-2 text-sm text-slate-700">{r.body as string}</p>
              <ReviewReply id={r.id as string} existing={(r.response_body as string) ?? null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
