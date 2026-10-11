import { BadgeCheck, Star } from "lucide-react";
import { listReviews } from "@propertyx/core";
import { db } from "@/lib/server";

/** Published reviews for an agent, agency, developer or project. */
export async function ReviewsList({ type, id }: { type: "agent" | "agency" | "developer" | "project"; id: string }) {
  const rows = await listReviews(db, type, id);
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="text-xl font-bold">Reviews</h2>
      <ul className="mt-4 space-y-4">
        {rows.slice(0, 10).map(({ r, authorName }) => (
          <li key={r.id} className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex" aria-label={`${r.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-gold-400 text-gold-400" : "text-slate-200"}`} />
                ))}
              </span>
              <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-PK", { dateStyle: "medium" })}</span>
            </div>
            <p className="mt-2 font-semibold text-slate-900">{r.title}</p>
            <p className="mt-1 text-sm text-slate-700">{r.body}</p>
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              {authorName}
              {r.isVerifiedInteraction && (
                <span className="flex items-center gap-0.5 text-brand-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified client</span>
              )}
            </p>
            {r.responseBody && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><b>Response:</b> {r.responseBody}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
