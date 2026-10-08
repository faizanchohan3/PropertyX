import { pendingReviews } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkCard, DarkPill, okBtn, badBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";
import { Star } from "lucide-react";

export const metadata = { title: "Reviews" };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermission("review.moderate", "/admin/reviews");
  const status = (await searchParams).status ?? "pending";
  const rows = await pendingReviews(db, user, status);
  return (
    <div>
      <AdminHeader title="Review moderation" subtitle="Only publish genuine first-hand experiences. Reviews from verified interactions are marked." />
      <AdminTabs active={status} tabs={["pending", "published", "rejected", "all"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))} />
      <div className="space-y-3">
        {rows.length === 0 && <DarkCard><p className="text-sm text-slate-400">Nothing to moderate.</p></DarkCard>}
        {rows.map((r) => (
          <DarkCard key={r.id as string}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <DarkPill s={r.status as string} />
                  <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < Number(r.rating) ? "fill-gold-400 text-gold-400" : "text-slate-600"}`} />)}</span>
                  {r.is_verified_interaction ? <span className="badge bg-emerald-500/15 text-emerald-300">verified interaction</span> : <span className="badge bg-white/10 text-slate-400">no recorded interaction</span>}
                </div>
                <p className="mt-2 font-semibold text-white">{r.title as string}</p>
                <p className="mt-1 text-sm text-slate-300">{r.body as string}</p>
                <p className="mt-2 text-xs text-slate-500">About {r.target_type as string}: <span className="text-slate-300">{r.target_label as string}</span> · by {r.author_name as string} ({r.author_email as string})</p>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <AdminAction action="review.moderate" payload={{ id: r.id, status: "published" }} label="Publish" className={okBtn} done="Published — rating recalculated" />
                  <AdminAction action="review.moderate" payload={{ id: r.id, status: "rejected" }} label="Reject" className={badBtn} promptFor={{ key: "note", label: "Internal reason" }} />
                </div>
              )}
            </div>
          </DarkCard>
        ))}
      </div>
    </div>
  );
}
