import Link from "next/link";
import { listFraudFlags } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkCard, Sev, DarkPill, th, td, darkBtn, badBtn, okBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";
import { RefreshCw } from "lucide-react";

export const metadata = { title: "Fraud alerts" };

const RULES: Record<string, string> = {
  duplicate_images: "Duplicate photos",
  similar_images: "Near-duplicate photos",
  duplicate_listing: "Duplicate text",
  suspicious_price: "Suspicious price",
  price_outlier_high: "Price typo?",
  repeated_phone: "Phone reused",
  spam_velocity: "Posting velocity",
  misleading_description: "Scam language",
  new_unverified_account: "New account",
  fake_agent: "Fake agent",
  user_report_fraud: "User report",
  reused_document: "Reused document",
  spam_message: "Spam message",
};

export default async function AdminFraud({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermission("fraud.manage", "/admin/fraud");
  const status = (await searchParams).status ?? "open";
  const rows = await listFraudFlags(db, user, status);
  return (
    <div>
      <AdminHeader
        title="Fraud alerts"
        subtitle="Automated signals from photo hashing, price comparison, phone reuse, scam-language detection and user reports."
        actions={<AdminAction action="fraud.scan" payload={{}} label="Re-scan all listings" className={darkBtn} icon={<RefreshCw className="h-3.5 w-3.5" />} done="Scan complete" />}
      />
      <AdminTabs active={status} tabs={["open", "confirmed", "dismissed", "all"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))} />
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-white/10"><tr>{["Severity", "Signal", "Target", "Details", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((f) => (
              <tr key={f.id as string}>
                <td className={td}><Sev s={f.severity as string} /><p className="mt-1 text-xs text-slate-500">score {f.score as number}</p></td>
                <td className={td}>{RULES[f.rule as string] ?? (f.rule as string)}</td>
                <td className={td}>
                  <span className="text-xs capitalize text-slate-500">{f.target_type as string}</span>
                  <p className="max-w-xs truncate">{f.target_slug ? <Link href={`/property/${f.target_slug}`} target="_blank" className="text-white hover:text-gold-300">{f.target_label as string}</Link> : (f.target_label as string) ?? "—"}</p>
                  {f.target_status ? <DarkPill s={f.target_status as string} /> : null}
                </td>
                <td className={`${td} max-w-md text-slate-300`}>{f.summary as string}</td>
                <td className={td}><DarkPill s={f.status as string} />{f.review_note ? <p className="mt-1 text-xs text-slate-500">{f.review_note as string}</p> : null}</td>
                <td className={td}>
                  {f.status === "open" && (
                    <div className="flex gap-1.5">
                      <AdminAction action="fraud.review" payload={{ id: f.id, decision: "confirmed" }} label="Confirm" className={badBtn} promptFor={{ key: "note", label: "Note (listing will be removed)" }} confirmText={f.target_type === "listing" ? "Confirming removes the listing. Continue?" : undefined} />
                      <AdminAction action="fraud.review" payload={{ id: f.id, decision: "dismissed" }} label="Dismiss" className={okBtn} promptFor={{ key: "note", label: "Why is this a false positive?" }} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-slate-400">No flags.</p>}
      </div>
      <DarkCard className="mt-6">
        <p className="text-sm text-slate-400">High and critical signals automatically hold a listing in the review queue and alert moderators. Dismissed rules are not raised again for the same listing.</p>
      </DarkCard>
    </div>
  );
}
