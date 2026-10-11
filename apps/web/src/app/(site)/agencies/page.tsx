import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { listAgencies } from "@propertyx/core";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";
import { AgencyCard } from "@/components/directory/cards";

export const metadata: Metadata = {
  title: "Real estate agencies in Pakistan",
  description: "Browse verified real estate agencies by city, with their agents, live listings and reviews.",
  alternates: { canonical: "/agencies" },
};

type Props = { searchParams: Promise<{ city?: string; q?: string }> };

export default async function AgenciesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const city = CITY_LINKS.find((c) => c.slug === sp.city)?.slug;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const agencies = await listAgencies(db, { city, q });
  return (
    <div className="container-px py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Real estate agencies</h1>
          <p className="mt-3 text-slate-500">Agencies with their teams, live listings and client reviews.</p>
        </div>
        <Link href="/agents" className="text-sm font-semibold text-brand-700">Browse agents →</Link>
      </div>
      <form action="/agencies" className="card mt-6 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
        <input name="q" defaultValue={q ?? ""} className="input" placeholder="Agency name" aria-label="Agency name" />
        <select name="city" defaultValue={city ?? ""} className="input" aria-label="City">
          <option value="">All cities</option>
          {CITY_LINKS.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button className="btn-primary"><Search className="h-4 w-4" /> Search</button>
      </form>
      {agencies.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-slate-500">No agencies match your search.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((a) => (
            <AgencyCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
