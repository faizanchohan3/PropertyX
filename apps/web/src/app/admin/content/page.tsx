import Link from "next/link";
import { listPosts } from "@propertyx/core";
import { BLOG_CATEGORIES } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, DarkPill, th, td, okBtn, badBtn, darkBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";
import { Plus } from "lucide-react";

export const metadata = { title: "Content" };

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  await requirePermission("content.manage", "/admin/content");
  const sp = await searchParams;
  const { items, total } = await listPosts(db, { includeDrafts: true, category: sp.category, page: Number(sp.page ?? 1) });
  return (
    <div>
      <AdminHeader
        title="Content"
        subtitle={`${total} articles — news, area, investment, buying, selling, rental and construction guides`}
        actions={
          <Link href="/admin/content/new" className={okBtn}>
            <Plus className="h-3.5 w-3.5" /> New article
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/content" className={`${darkBtn} ${!sp.category ? "border-gold-400 text-gold-300" : ""}`}>All</Link>
        {BLOG_CATEGORIES.map((c) => (
          <Link key={c.key} href={`?category=${c.key}`} className={`${darkBtn} ${sp.category === c.key ? "border-gold-400 text-gold-300" : ""}`}>{c.label}</Link>
        ))}
      </div>
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-white/10"><tr>{["Title", "Category", "Status", "Published", "Views", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {items.map((p) => (
              <tr key={p.id}>
                <td className={td}><Link href={`/admin/content/${p.id}`} className="font-semibold text-white hover:text-gold-300">{p.title}</Link><p className="text-xs text-slate-500">/blog/{p.slug}</p></td>
                <td className={td}>{BLOG_CATEGORIES.find((c) => c.key === p.category)?.label}</td>
                <td className={td}><DarkPill s={p.status} /></td>
                <td className={td}>{p.publishedAt?.toLocaleDateString("en-PK") ?? "—"}</td>
                <td className={td}>{p.viewsCount}</td>
                <td className={td}>
                  <div className="flex gap-1.5">
                    <Link href={`/admin/content/${p.id}`} className={darkBtn}>Edit</Link>
                    {p.status === "published" && <Link href={`/blog/${p.slug}`} target="_blank" className={darkBtn}>View</Link>}
                    <AdminAction action="post.delete" payload={{ id: p.id }} label="Delete" className={badBtn} confirmText={`Delete “${p.title}” permanently?`} />
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
