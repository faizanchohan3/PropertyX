import Link from "next/link";
import { listReports } from "@propertyx/core";
import { REPORT_REASONS } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkCard, DarkPill, darkBtn, okBtn, badBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";

export const metadata = { title: "Reports" };

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermission("report.manage", "/admin/reports");
  const status = (await searchParams).status ?? "open";
  const rows = await listReports(db, user, status);
  const canListing = user.permissions.includes("listing.moderate");
  const canSuspend = user.permissions.includes("user.suspend");
  return (
    <div>
      <AdminHeader title="User reports" subtitle="Reports of fraud, incorrect information, fake agents and abuse." />
      <AdminTabs active={status} tabs={["open", "investigating", "resolved", "dismissed", "all"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))} />
      <div className="space-y-3">
        {rows.length === 0 && <DarkCard><p className="text-sm text-slate-400">No reports.</p></DarkCard>}
        {rows.map((r) => (
          <DarkCard key={r.id as string}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DarkPill s={r.status as string} />
                  <span className="badge bg-red-500/15 text-red-300">{REPORT_REASONS.find((x) => x.key === r.reason)?.label ?? (r.reason as string)}</span>
                  <span className="text-xs capitalize text-slate-400">{r.target_type as string}</span>
                </div>
                <p className="mt-2 font-semibold text-white">{r.target_slug ? <Link href={`/property/${r.target_slug}`} target="_blank" className="hover:text-gold-300">{r.target_label as string}</Link> : ((r.target_label as string) ?? "Unknown target")}</p>
                {r.details ? <p className="mt-1 text-sm text-slate-300">“{r.details as string}”</p> : null}
                <p className="mt-1 text-xs text-slate-500">Reported by {(r.reporter_name as string) ?? "a guest"} · {new Date(r.created_at as string).toLocaleString("en-PK")}</p>
                {r.resolution_note ? <p className="mt-1 text-xs text-slate-400">Resolution: {r.resolution_note as string}</p> : null}
              </div>
              {["open", "investigating"].includes(r.status as string) && (
                <div className="flex flex-wrap gap-1.5">
                  {r.status === "open" && <AdminAction action="report.resolve" payload={{ id: r.id, status: "investigating" }} label="Investigate" className={darkBtn} />}
                  {r.target_type === "listing" && canListing && <AdminAction action="report.resolve" payload={{ id: r.id, status: "resolved", action: "remove_listing" }} label="Remove listing" className={badBtn} promptFor={{ key: "note", label: "Resolution note" }} promptRequired />}
                  {r.target_type === "review" && <AdminAction action="report.resolve" payload={{ id: r.id, status: "resolved", action: "hide_review" }} label="Hide review" className={badBtn} promptFor={{ key: "note", label: "Resolution note" }} />}
                  {["agent", "user"].includes(r.target_type as string) && canSuspend && <AdminAction action="report.resolve" payload={{ id: r.id, status: "resolved", action: "suspend_user" }} label="Suspend account" className={badBtn} promptFor={{ key: "note", label: "Reason for suspension" }} promptRequired confirmText="Suspend this account and pause their listings?" />}
                  <AdminAction action="report.resolve" payload={{ id: r.id, status: "resolved" }} label="Resolve" className={okBtn} promptFor={{ key: "note", label: "Resolution note" }} />
                  <AdminAction action="report.resolve" payload={{ id: r.id, status: "dismissed" }} label="Dismiss" className={darkBtn} promptFor={{ key: "note", label: "Why dismissed?" }} />
                </div>
              )}
            </div>
          </DarkCard>
        ))}
      </div>
    </div>
  );
}
