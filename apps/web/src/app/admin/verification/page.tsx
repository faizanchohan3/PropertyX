import { verificationQueue } from "@propertyx/core";
import { verificationInfo } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkCard, DarkPill, okBtn, badBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";
import { FileText, Lock } from "lucide-react";

export const metadata = { title: "Verification" };

type Doc = { id: string; kind: string; name: string; mime: string; extracted: Record<string, unknown> | null };

export default async function AdminVerification({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermission("verification.review", "/admin/verification");
  const status = (await searchParams).status ?? "pending";
  const rows = await verificationQueue(db, user, status);
  return (
    <div>
      <AdminHeader title="Verification requests" subtitle="Review identity and ownership documents. Documents are private and every view is audit-logged." />
      <AdminTabs active={status} tabs={["pending", "approved", "rejected", "all"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))} />
      <div className="space-y-4">
        {rows.length === 0 && <DarkCard><p className="text-sm text-slate-400">Nothing here.</p></DarkCard>}
        {rows.map((r) => {
          const docs = (r.documents as Doc[] | null) ?? [];
          return (
            <DarkCard key={r.id as string}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <DarkPill s={r.status as string} />
                    <span className="badge bg-white/10 capitalize text-slate-300">{r.subject_type as string}</span>
                    <span className="text-xs text-slate-400">requests level {r.requested_level as number} — {verificationInfo(Number(r.requested_level)).label}</span>
                  </div>
                  <p className="mt-2 font-bold text-white">{r.subject_label as string}</p>
                  <p className="text-sm text-slate-400">Submitted by {r.submitter_name as string} ({r.submitter_email as string}) · {new Date(r.created_at as string).toLocaleString("en-PK")}</p>
                  {r.notes ? <p className="mt-2 text-sm text-slate-300">“{r.notes as string}”</p> : null}
                  {r.reviewer_notes ? <p className="mt-1 text-sm text-slate-400">Reviewer: {r.reviewer_notes as string}</p> : null}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <AdminAction action="verification.review" payload={{ id: r.id, decision: "approved" }} label={`Approve level ${r.requested_level}`} className={okBtn} promptFor={{ key: "notes", label: "Internal note (optional)" }} done="Approved — badge applied" />
                    <AdminAction action="verification.review" payload={{ id: r.id, decision: "rejected" }} label="Reject" className={badBtn} promptFor={{ key: "notes", label: "What's missing or wrong? (sent to the applicant)" }} promptRequired done="Rejected" />
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {docs.length === 0 && <p className="text-sm text-slate-500">No documents attached.</p>}
                {docs.map((d) => (
                  <div key={d.id} className="rounded-xl border border-white/10 bg-night-3 p-3">
                    <a href={`/api/v1/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold text-gold-300 hover:underline">
                      <FileText className="h-4 w-4" /> {d.kind.replace(/_/g, " ")} — {d.name}
                    </a>
                    {d.extracted ? (
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
                        {Object.entries(d.extracted).map(([k, v]) => (
                          <div key={k} className="contents"><dt>{k}</dt><dd className="text-slate-200">{String(v ?? "—")}</dd></div>
                        ))}
                        <p className="col-span-2 mt-1 text-[11px] text-slate-500">AI-extracted fields are advisory — always compare against the document.</p>
                      </dl>
                    ) : (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Lock className="h-3 w-3" /> Private file · manual review</p>
                    )}
                  </div>
                ))}
              </div>
            </DarkCard>
          );
        })}
      </div>
    </div>
  );
}
