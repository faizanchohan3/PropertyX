import Link from "next/link";
import { listProjects } from "@propertyx/core";
import { formatPKR, PROJECT_STATUS_LABELS } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, DarkPill, th, td, okBtn, badBtn, darkBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";

export const metadata = { title: "Projects" };

export default async function AdminProjects() {
  await requirePermission("project.manage.any", "/admin/projects");
  const rows = await listProjects(db, { includeUnpublished: true });
  rows.sort((a, b) => (a.publishStatus === "pending" ? -1 : 0) - (b.publishStatus === "pending" ? -1 : 0));
  return (
    <div>
      <AdminHeader title="Projects" subtitle="Approve developer projects, feature them on the homepage, or unpublish." />
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-white/10"><tr>{["Project", "Developer", "Stage", "From", "Units", "Publish", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={td}><Link href={`/project/${p.slug}`} target="_blank" className="font-semibold text-white hover:text-gold-300">{p.name}</Link><p className="text-xs text-slate-500">{[p.locationName, p.cityName].filter(Boolean).join(", ")}</p></td>
                <td className={td}>{p.developerName}{p.developerVerified ? <span className="ml-1 text-xs text-emerald-400">✓</span> : null}</td>
                <td className={td}>{PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS]} · {p.progress}%</td>
                <td className={td}>{p.minPrice ? formatPKR(p.minPrice) : "—"}</td>
                <td className={td}>{p.availableUnits}/{p.totalUnits}</td>
                <td className={td}><DarkPill s={p.publishStatus} />{p.featured && <span className="badge ml-1 bg-gold-500/20 text-gold-300">featured</span>}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {p.publishStatus !== "published" && <AdminAction action="project.moderate" payload={{ id: p.id, publishStatus: "published" }} label="Publish" className={okBtn} />}
                    {p.publishStatus === "pending" && <AdminAction action="project.moderate" payload={{ id: p.id, publishStatus: "rejected" }} label="Reject" className={badBtn} />}
                    {p.publishStatus === "published" && <AdminAction action="project.moderate" payload={{ id: p.id, publishStatus: "draft" }} label="Unpublish" className={darkBtn} confirmText="Hide this project from the public site?" />}
                    <AdminAction action="project.moderate" payload={{ id: p.id, publishStatus: p.publishStatus, featured: !p.featured }} label={p.featured ? "Unfeature" : "Feature"} className={darkBtn} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
