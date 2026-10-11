import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { forumThreads } from "@propertyx/database";
import { BadgeCheck, CheckCircle2, ChevronRight, Lock, ThumbsUp } from "lucide-react";
import { getThread } from "@propertyx/core";
import { FORUM_CATEGORIES, areaPath } from "@propertyx/shared";
import { db, getUser } from "@/lib/server";
import { ReplyForm } from "@/components/forum/forms";

type Props = { params: Promise<{ slug: string }> };
const label = (key: string) => FORUM_CATEGORIES.find((c) => c.key === key)?.label ?? key;
const when = (v: unknown) => new Date(v as string).toLocaleDateString("en-PK", { dateStyle: "medium" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // metadata must not count as a view, so read the thread title directly
  const [t] = await db.select({ title: forumThreads.title, body: forumThreads.body }).from(forumThreads).where(eq(forumThreads.slug, slug));
  if (!t) return { title: "Question not found" };
  return { title: t.title, description: t.body.slice(0, 160), alternates: { canonical: `/forum/${slug}` } };
}

export default async function ThreadPage({ params }: Props) {
  const { slug } = await params;
  const user = await getUser();
  const d = await getThread(db, slug, user);
  if (!d) notFound();
  const { thread: t, authorName, posts, location } = d;

  return (
    <div className="container-px py-10">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/forum" className="hover:text-brand-700">Forum</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/forum?category=${t.category}`} className="hover:text-brand-700">{label(t.category)}</Link>
        </nav>
        <div className="card mt-4 p-6">
          <h1 className="text-2xl font-extrabold">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Asked by {authorName} · {when(t.createdAt)}
            {location && (
              <>
                {" · "}
                <Link href={areaPath(location.slug)} className="text-brand-700">{location.name}</Link>
              </>
            )}
          </p>
          <p className="mt-4 whitespace-pre-line text-slate-700">{t.body}</p>
        </div>

        <h2 className="mt-8 text-lg font-bold">{posts.length} {posts.length === 1 ? "answer" : "answers"}</h2>
        <ul className="mt-3 space-y-3">
          {posts.map((p) => (
            <li key={p.id as string} className={`card p-5 ${p.is_accepted ? "ring-2 ring-emerald-500" : ""}`}>
              {Boolean(p.is_accepted) && <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Accepted answer</p>}
              <p className="whitespace-pre-line text-slate-700">{p.body as string}</p>
              <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  {p.author_name as string} {Boolean(p.is_agent) && <span className="flex items-center gap-0.5 font-normal text-brand-700"><BadgeCheck className="h-3.5 w-3.5" /> Agent</span>}
                </span>
                <span>{when(p.created_at)}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {Number(p.upvotes)}</span>
              </p>
            </li>
          ))}
        </ul>

        <div className="card mt-6 p-6">
          {t.isLocked ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><Lock className="h-4 w-4" /> This question is closed for new answers.</p>
          ) : user ? (
            <ReplyForm threadId={t.id} slug={t.slug} />
          ) : (
            <Link href={`/login?next=/forum/${t.slug}`} className="btn-primary">Log in to answer</Link>
          )}
        </div>
      </div>
    </div>
  );
}
