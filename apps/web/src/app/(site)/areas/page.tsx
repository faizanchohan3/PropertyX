import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPinned, Search } from "lucide-react";
import { listAreaDirectory } from "@propertyx/core";
import { areaPath } from "@propertyx/shared";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";

export const metadata: Metadata = {
  title: "Area guides — housing societies and neighbourhoods in Pakistan",
  description: "Explore housing societies and neighbourhoods across Pakistan: prices, rents, listings, local agents and what it is like to live there.",
  alternates: { canonical: "/areas" },
};

export const revalidate = 3600;

type Props = { searchParams: Promise<{ city?: string; q?: string }> };

export default async function AreasPage({ searchParams }: Props) {
  const { city, q } = await searchParams;
  const query = q?.trim().slice(0, 80) || undefined;
  const cities = await listAreaDirectory(db, { city: city || undefined, q: query, perCity: city || query ? 60 : 12 });
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Area guides</h1>
        <p className="mt-3 text-slate-500">Prices, rents, listings and local agents for housing societies and neighbourhoods across Pakistan.</p>
      </div>
      <form className="mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row" action="/areas">
        <select name="city" defaultValue={city ?? ""} className="input sm:w-48" aria-label="City">
          <option value="">All cities</option>
          {CITY_LINKS.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <input name="q" defaultValue={query ?? ""} className="input" placeholder="Search an area or society, e.g. DHA, Bahria, F-11" aria-label="Area or society" />
        <button className="btn-primary">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      {cities.length === 0 && <p className="mt-12 text-slate-500">No areas match your search.</p>}
      <div className="mt-10 space-y-10">
        {cities.map((c) => (
          <section key={c.slug}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold">{c.name}</h2>
              <Link href={areaPath(c.slug)} className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                {c.name} city guide <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {c.areas.map((a) => (
                <Link key={a.slug} href={areaPath(a.slug)} className="card group flex items-center gap-3 p-4 hover:border-brand-300">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <MapPinned className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900 group-hover:text-brand-700">{a.name}</span>
                    <span className="text-sm text-slate-500">
                      {a.kind === "society" ? "Housing society" : "Area"} · {a.activeListings.toLocaleString()} listings
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
