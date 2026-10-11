import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { listPosts } from "@propertyx/core";
import { BLOG_CATEGORIES, blogPath } from "@propertyx/shared";
import { db } from "@/lib/server";

export const metadata: Metadata = {
  title: "Property guides & news",
  description: "Buying, selling, renting, investment and construction guides for Pakistani property, plus market news.",
  alternates: { canonical: "/blog" },
};

type Props = { searchParams: Promise<{ category?: string; q?: string; page?: string }> };
const label = (key: string) => BLOG_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export default async function BlogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = BLOG_CATEGORIES.some((c) => c.key === sp.category) ? sp.category : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await listPosts(db, { category, q, page });
  const pages = Math.ceil(total / 12);
  const link = (p: Record<string, string | undefined>) => `/blog?${new URLSearchParams(Object.entries({ category, q, ...p }).filter((e): e is [string, string] => !!e[1]))}`;

  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Guides &amp; news</h1>
        <p className="mt-3 text-slate-500">Practical guides for buying, selling, renting and investing in Pakistani property.</p>
      </div>
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href={link({ category: undefined, page: undefined })} className={`chip ${!category ? "chip-active" : ""}`}>All</Link>
          {BLOG_CATEGORIES.map((c) => (
            <Link key={c.key} href={link({ category: c.key, page: undefined })} className={`chip ${category === c.key ? "chip-active" : ""}`}>{c.label}</Link>
          ))}
        </div>
        <form action="/blog" className="flex gap-2">
          {category && <input type="hidden" name="category" value={category} />}
          <input name="q" defaultValue={q ?? ""} className="input lg:w-64" placeholder="Search guides" aria-label="Search guides" />
          <button className="btn-outline px-3" aria-label="Search"><Search className="h-4 w-4" /></button>
        </form>
      </div>
      {items.length === 0 ? (
        <p className="card mt-8 p-10 text-center text-slate-500">No articles found.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Link key={p.id} href={blogPath(p.slug)} className="card group overflow-hidden">
              <div className="relative aspect-[16/9] bg-slate-100">
                {p.coverImage && <Image src={p.coverImage} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />}
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">{label(p.category)}</p>
                <p className="mt-1 font-bold text-slate-900 group-hover:text-brand-700">{p.title}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{p.excerpt}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-PK", { dateStyle: "medium" }) : ""} · {p.readingMinutes} min read
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Pages">
          {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn-outline">← Previous</Link>}
          <span className="px-3 py-2.5 text-sm text-slate-500">Page {page} of {pages}</span>
          {page < pages && <Link href={link({ page: String(page + 1) })} className="btn-outline">Next →</Link>}
        </nav>
      )}
    </div>
  );
}
