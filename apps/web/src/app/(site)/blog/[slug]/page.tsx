import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronRight } from "lucide-react";
import { getPost } from "@propertyx/core";
import { BLOG_CATEGORIES, blogPath } from "@propertyx/shared";
import { db, getUser } from "@/lib/server";
import { renderMarkdown } from "@/lib/markdown";

type Props = { params: Promise<{ slug: string }> };
const load = cache(async (slug: string) => getPost(db, slug, await getUser()));
const label = (key: string) => BLOG_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Article not found" };
  const p = d.post;
  return { title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.excerpt, alternates: { canonical: blogPath(p.slug) }, openGraph: { type: "article", images: p.coverImage ? [p.coverImage] : undefined } };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { post: p, authorName, related } = d;
  return (
    <article className="container-px py-10">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/blog" className="hover:text-brand-700">Guides &amp; news</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/blog?category=${p.category}`} className="hover:text-brand-700">{label(p.category)}</Link>
        </nav>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{p.title}</h1>
        <p className="mt-3 text-lg text-slate-600">{p.excerpt}</p>
        <p className="mt-3 text-sm text-slate-400">
          {authorName ? `By ${authorName} · ` : ""}
          {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-PK", { dateStyle: "long" }) : ""} · {p.readingMinutes} min read
        </p>
        {p.coverImage && (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
            <Image src={p.coverImage} alt="" fill priority sizes="(min-width:768px) 768px, 100vw" className="object-cover" />
          </div>
        )}
        <div className="prose-px mt-8 text-[17px] leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        {(p.tags ?? []).length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5">
            {(p.tags ?? []).map((t) => (
              <span key={t} className="badge bg-slate-100 text-slate-600">#{t}</span>
            ))}
          </div>
        )}
      </div>
      {related.length > 0 && (
        <section className="mx-auto mt-14 max-w-5xl">
          <h2 className="section-title">Related articles</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} href={blogPath(r.slug)} className="card group p-5">
                <p className="font-bold text-slate-900 group-hover:text-brand-700">{r.title}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{r.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
