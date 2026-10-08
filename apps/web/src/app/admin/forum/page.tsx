import Link from "next/link";
import { adminThreads } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, th, td, darkBtn, badBtn, okBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";

export const metadata = { title: "Forum" };

export default async function AdminForum() {
  const user = await requirePermission("forum.moderate", "/admin/forum");
  const rows = await adminThreads(db, user);
  return (
    <div>
      <AdminHeader title="Community forum" subtitle="Pin helpful threads, lock heated ones and hide spam." />
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-white/10"><tr>{["Thread", "Category", "Replies", "Views", "Flags", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((t) => (
              <tr key={t.id as string} className={t.is_hidden ? "opacity-50" : ""}>
                <td className={td}><Link href={`/forum/${t.slug}`} target="_blank" className="font-semibold text-white hover:text-gold-300">{t.title as string}</Link><p className="text-xs text-slate-500">by {t.author_name as string} · {new Date(t.created_at as string).toLocaleDateString("en-PK")}{t.is_pinned ? " · pinned" : ""}{t.is_locked ? " · locked" : ""}{t.is_hidden ? " · hidden" : ""}</p></td>
                <td className={td}>{t.category as string}</td>
                <td className={td}>{t.replies_count as number}</td>
                <td className={td}>{t.views_count as number}</td>
                <td className={td}>{Number(t.open_reports) > 0 ? <span className="badge bg-red-500/20 text-red-300">{t.open_reports as number} reports</span> : "—"}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    <AdminAction action="forum.moderate" payload={{ threadId: t.id, pinned: !t.is_pinned }} label={t.is_pinned ? "Unpin" : "Pin"} className={darkBtn} />
                    <AdminAction action="forum.moderate" payload={{ threadId: t.id, locked: !t.is_locked }} label={t.is_locked ? "Unlock" : "Lock"} className={darkBtn} />
                    <AdminAction action="forum.moderate" payload={{ threadId: t.id, hidden: !t.is_hidden }} label={t.is_hidden ? "Restore" : "Hide"} className={t.is_hidden ? okBtn : badBtn} />
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
