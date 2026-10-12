import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Pin, Search } from "lucide-react";
import { listThreads } from "@propertyx/core";
import { FORUM_CATEGORIES, COUNTRY } from "@propertyx/shared";
import { db, getUser } from "@/lib/server";
import { AskForm } from "@/components/forum/forms";

export const metadata: Metadata = {
  title: "Property community forum",
  description: `Ask questions about buying, renting, investing, legal documents and construction in ${COUNTRY.inName}, and get answers from owners and agents.`,
  alternates: { canonical: "/forum" },
};

type Props = { searchParams: Promise<{ category?: string; q?: string; page?: string }> };
const label = (key: string) => FORUM_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export default async function ForumPage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = FORUM_CATEGORIES.some((c) => c.key === sp.category) ? sp.category : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ items, total }, user] = await Promise.all([listThreads(db, { category, q, page }), getUser()]);
  const pages = Math.ceil(total / 20);
  const link = (p: Record<string, string | undefined>) => `/forum?${new URLSearchParams(Object.entries({ category, q, ...p }).filter((e): e is [string, string] => !!e[1]))}`;

  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Community forum</h1>
        <p className="mt-3 text-slate-500">Ask anything about property in {COUNTRY.inName} and get answers from owners, tenants and agents.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Link href={link({ category: undefined, page: undefined })} className={`chip ${!category ? "chip-active" : ""}`}>All</Link>
              {FORUM_CATEGORIES.map((c) => (
                <Link key={c.key} href={link({ category: c.key, page: undefined })} className={`chip ${category === c.key ? "chip-active" : ""}`}>{c.label}</Link>
              ))}
            </div>
            <form action="/forum" className="flex gap-2">
              {category && <input type="hidden" name="category" value={category} />}
              <input name="q" defaultValue={q ?? ""} className="input md:w-56" placeholder="Search questions" aria-label="Search questions" />
              <button className="btn-outline px-3" aria-label="Search"><Search className="h-4 w-4" /></button>
            </form>
          </div>
          {items.length === 0 ? (
            <p className="card mt-5 p-10 text-center text-slate-500">No questions yet. Be the first to ask.</p>
          ) : (
            <ul className="card mt-5 divide-y divide-slate-100">
              {items.map((t) => (
                <li key={t.id as string}>
                  <Link href={`/forum/${t.slug}`} className="flex gap-4 p-4 hover:bg-slate-50">
                    <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 py-2 text-center">
                      <b className="text-lg text-slate-900">{Number(t.replies_count)}</b>
                      <span className="text-[11px] text-slate-500">answers</span>
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                        {Boolean(t.is_pinned) && <Pin className="h-3.5 w-3.5 shrink-0 text-gold-500" aria-label="Pinned" />}
                        <span className="line-clamp-1">{t.title as string}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-sm text-slate-500">{t.body as string}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                        <span>{label(t.category as string)}</span>
                        {Boolean(t.location_name) && <span>{t.location_name as string}</span>}
                        <span>{t.author_name as string}</span>
                        <span>{new Date(t.last_activity_at as string).toLocaleDateString("en-PK", { dateStyle: "medium" })}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav className="mt-6 flex justify-center gap-2" aria-label="Pages">
              {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn-outline">← Previous</Link>}
              <span className="px-3 py-2.5 text-sm text-slate-500">Page {page} of {pages}</span>
              {page < pages && <Link href={link({ page: String(page + 1) })} className="btn-outline">Next →</Link>}
            </nav>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><MessageCircle className="h-5 w-5 text-brand-600" /> Ask the community</h2>
            <div className="mt-4">
              {user ? (
                <AskForm />
              ) : (
                <Link href="/login?next=/forum" className="btn-primary w-full">Log in to ask a question</Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
