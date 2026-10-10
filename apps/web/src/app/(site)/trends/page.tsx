import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import { getSetting, propertyTrends } from "@propertyx/core";
import { areaPath, formatPKR, searchPath } from "@propertyx/shared";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";
import { ChangePill, MarketDataNote } from "@/components/market/data-note";

export const metadata: Metadata = {
  title: "Property trends — popular areas to buy and rent in Pakistan",
  description: "See which areas and housing societies buyers and renters are looking at most, with prices per marla and how they are changing.",
  alternates: { canonical: "/trends" },
};

type Props = { searchParams: Promise<{ city?: string; purpose?: string }> };

export default async function TrendsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const city = CITY_LINKS.find((c) => c.slug === sp.city)?.slug;
  const purpose = sp.purpose === "rent" ? "rent" : "sale";
  const [rows, demo] = await Promise.all([propertyTrends(db, { city, purpose, limit: 25 }), getSetting<boolean>(db, "demo_mode")]);
  const hasInterest = rows.some((r) => r.views > 0);
  const tab = (p: "sale" | "rent") => `/trends?${new URLSearchParams({ ...(city ? { city } : {}), purpose: p })}`;
  const cityName = city ? CITY_LINKS.find((c) => c.slug === city)!.name : "Pakistan";

  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Property trends</h1>
        <p className="mt-3 text-slate-500">The most popular areas to {purpose === "rent" ? "rent" : "buy"} in {cityName}, ranked by {hasInterest ? "buyer interest over the last 30 days" : "the number of active listings"}.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["sale", "rent"] as const).map((p) => (
            <Link key={p} href={tab(p)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${purpose === p ? "bg-white text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              {p === "sale" ? "Buy" : "Rent"}
            </Link>
          ))}
        </div>
        <form action="/trends" className="flex gap-2">
          <input type="hidden" name="purpose" value={purpose} />
          <select name="city" defaultValue={city ?? ""} className="input w-48" aria-label="City">
            <option value="">All cities</option>
            {CITY_LINKS.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <button className="btn-outline">Show</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="card mt-8 p-10 text-center text-slate-500">No listings in this city yet.</p>
      ) : (
        <div className="card mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Area</th>
                  {hasInterest && <th className="px-5 py-3">Views (30 days)</th>}
                  {hasInterest && <th className="px-5 py-3">Interest change</th>}
                  <th className="px-5 py-3">{purpose === "rent" ? "Rent / marla" : "Price / marla"}</th>
                  <th className="px-5 py-3">Price change</th>
                  <th className="px-5 py-3">Listings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.slug} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-slate-400">{i < 3 ? <Flame className="h-4 w-4 text-gold-500" aria-label={`#${i + 1}`} /> : i + 1}</td>
                    <td className="px-5 py-3">
                      <Link href={areaPath(r.slug)} className="font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
                      <span className="block text-xs text-slate-500">{r.cityName}</span>
                    </td>
                    {hasInterest && <td className="px-5 py-3">{r.views.toLocaleString()}</td>}
                    {hasInterest && <td className="px-5 py-3"><ChangePill pct={r.interestChangePct} /></td>}
                    <td className="px-5 py-3">{r.pricePerMarla ? formatPKR(r.pricePerMarla) : "—"}</td>
                    <td className="px-5 py-3"><ChangePill pct={r.priceChangePct} /></td>
                    <td className="px-5 py-3">
                      <Link href={searchPath({ purpose, city: r.citySlug, location: r.slug })} className="font-semibold text-brand-700 hover:text-brand-800">{r.activeListings}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-1">
        <p className="text-xs text-slate-400">Price change compares the median asking price per sq ft of listings from the last 6 months with the 12 months before, where there are enough listings in both.</p>
        <MarketDataNote demo={!!demo} />
      </div>
    </div>
  );
}
