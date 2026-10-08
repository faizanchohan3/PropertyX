import { listCampaigns } from "@propertyx/core";
import { AD_FORMATS, formatPKR } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkPill, th, td, okBtn, badBtn, darkBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";

export const metadata = { title: "Advertising" };

export default async function AdminAds({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermission("ads.manage", "/admin/ads");
  const status = (await searchParams).status ?? "all";
  const rows = await listCampaigns(db, user, status);
  const totals = rows.reduce((t, r) => ({ imp: t.imp + r.ad.impressions, clicks: t.clicks + r.ad.clicks, spent: t.spent + r.ad.spent }), { imp: 0, clicks: 0, spent: 0 });
  return (
    <div>
      <AdminHeader title="Advertising" subtitle={`${totals.imp.toLocaleString()} impressions · ${totals.clicks.toLocaleString()} clicks · ${totals.imp ? ((totals.clicks / totals.imp) * 100).toFixed(2) : "0.00"}% CTR · ${formatPKR(totals.spent)} spent`} />
      <AdminTabs active={status} tabs={["all", "pending", "active", "paused", "ended", "rejected", "draft"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))} />
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="border-b border-white/10"><tr>{["Campaign", "Placement", "Advertiser", "Dates", "Budget / spent", "Impr.", "Clicks", "CTR", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(({ ad, advertiser }) => (
              <tr key={ad.id}>
                <td className={td}><p className="font-semibold text-white">{ad.campaignName}</p><p className="max-w-[220px] truncate text-xs text-slate-500">{ad.title}</p></td>
                <td className={td}>{AD_FORMATS.find((f) => f.key === ad.format)?.label}</td>
                <td className={td}>{advertiser}</td>
                <td className={td}>{ad.startAt.toLocaleDateString("en-PK")} – {ad.endAt.toLocaleDateString("en-PK")}</td>
                <td className={td}>{formatPKR(ad.budget)}<p className="text-xs text-slate-500">{formatPKR(ad.spent)} spent{ad.paymentId ? " · paid" : ad.isSeed ? "" : " · unpaid"}</p></td>
                <td className={td}>{ad.impressions.toLocaleString()}</td>
                <td className={td}>{ad.clicks.toLocaleString()}</td>
                <td className={td}>{ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00"}%</td>
                <td className={td}><DarkPill s={ad.status} /></td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {ad.status === "pending" && <AdminAction action="ad.moderate" payload={{ id: ad.id, action: "approve" }} label="Approve" className={okBtn} />}
                    {ad.status === "pending" && <AdminAction action="ad.moderate" payload={{ id: ad.id, action: "reject" }} label="Reject" className={badBtn} promptFor={{ key: "reason", label: "Reason for the advertiser" }} promptRequired />}
                    {ad.status === "active" && <AdminAction action="ad.moderate" payload={{ id: ad.id, action: "pause" }} label="Pause" className={darkBtn} />}
                    {ad.status === "paused" && <AdminAction action="ad.moderate" payload={{ id: ad.id, action: "resume" }} label="Resume" className={okBtn} />}
                    {["active", "paused"].includes(ad.status) && <AdminAction action="ad.moderate" payload={{ id: ad.id, action: ad.status === "active" ? "resume" : "pause" }} label="Edit budget" className={darkBtn} promptFor={{ key: "budget", label: "New total budget (PKR)" }} />}
                    {["active", "paused"].includes(ad.status) && <AdminAction action="ad.moderate" payload={{ id: ad.id, action: "end" }} label="End" className={badBtn} confirmText="End this campaign now?" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-slate-400">No campaigns.</p>}
      </div>
    </div>
  );
}
