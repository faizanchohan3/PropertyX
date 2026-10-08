import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { blogPosts } from "@propertyx/database";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader } from "@/components/admin/ui";
import { PostEditor, type PostForm } from "@/components/admin/post-editor";

export const metadata = { title: "Edit article" };

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content.manage");
  const { id } = await params;
  let initial: PostForm = { title: "", slug: "", excerpt: "", body: "## Introduction\n\nWrite your article here.", category: "buying", tags: [], coverImage: "", status: "draft", seoTitle: "", seoDescription: "" };
  if (id !== "new") {
    const [p] = /^[0-9a-f-]{36}$/.test(id) ? await db.select().from(blogPosts).where(eq(blogPosts.id, id)) : [];
    if (!p) notFound();
    initial = { id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body, category: p.category, tags: p.tags ?? [], coverImage: p.coverImage ?? "", status: p.status, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "" };
  }
  return (
    <div>
      <Link href="/admin/content" className="text-sm text-slate-400 hover:text-white">← All content</Link>
      <AdminHeader title={id === "new" ? "New article" : "Edit article"} />
      <PostEditor initial={initial} />
    </div>
  );
}
