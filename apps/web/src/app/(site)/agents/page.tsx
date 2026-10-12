import { COUNTRY } from "@propertyx/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { listAgents } from "@propertyx/core";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";
import { AgentCard } from "@/components/directory/cards";

export const metadata: Metadata = {
  title: `Property agents in ${COUNTRY.inName}`,
  description: "Find verified real estate agents by city, with their listings, experience, areas and client reviews.",
  alternates: { canonical: "/agents" },
};

type Props = { searchParams: Promise<{ city?: string; q?: string; verified?: string; page?: string }> };

export default async function AgentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const city = CITY_LINKS.find((c) => c.slug === sp.city)?.slug;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const verified = sp.verified === "1";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await listAgents(db, { city, q, verified, page });
  const pages = Math.ceil(total / 24);
  const link = (p: number) => `/agents?${new URLSearchParams({ ...(city ? { city } : {}), ...(q ? { q } : {}), ...(verified ? { verified: "1" } : {}), page: String(p) })}`;

  return (
    <div className="container-px py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Property agents</h1>
          <p className="mt-3 text-slate-500">Verified agents with their live listings, experience and client reviews.</p>
        </div>
        <Link href="/agencies" className="text-sm font-semibold text-brand-700">Browse agencies →</Link>
      </div>
      <form action="/agents" className="card mt-6 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_200px_auto_auto]">
        <input name="q" defaultValue={q ?? ""} className="input" placeholder="Agent or agency name" aria-label="Agent or agency name" />
        <select name="city" defaultValue={city ?? ""} className="input" aria-label="City">
          <option value="">All cities</option>
          {CITY_LINKS.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-1 text-sm text-slate-700">
          <input type="checkbox" name="verified" value="1" defaultChecked={verified} className="h-4 w-4 accent-brand-700" /> Verified only
        </label>
        <button className="btn-primary"><Search className="h-4 w-4" /> Search</button>
      </form>
      <p className="mt-6 text-sm text-slate-500">{total} {total === 1 ? "agent" : "agents"}</p>
      {items.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-slate-500">No agents match your search.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((a) => (
            <AgentCard key={a.id} a={a} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Pages">
          {page > 1 && <Link href={link(page - 1)} className="btn-outline">← Previous</Link>}
          <span className="px-3 py-2.5 text-sm text-slate-500">Page {page} of {pages}</span>
          {page < pages && <Link href={link(page + 1)} className="btn-outline">Next →</Link>}
        </nav>
      )}
    </div>
  );
}
