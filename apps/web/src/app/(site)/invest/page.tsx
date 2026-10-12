import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Coins, Flame, Percent, Sprout, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { investmentOpportunities, type Opportunity } from "@propertyx/core";
import { areaPath, formatPKR, projectPath, searchPath, COUNTRY } from "@propertyx/shared";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";
import { ProjectCard } from "@/components/directory/cards";
import { MarketDataNote } from "@/components/market/data-note";

export const metadata: Metadata = {
  title: `Property investment opportunities in ${COUNTRY.inName}`,
  description: "Areas with the best rental yields, fastest price growth, affordable entry prices and installment plans, worked out from live listings.",
  alternates: { canonical: "/invest" },
};

type Props = { searchParams: Promise<{ city?: string }> };

const SECTIONS: { key: string; title: string; desc: string; icon: LucideIcon; metric: (o: Opportunity) => string }[] = [
  { key: "high_rental_yield", title: "Best rental yields", desc: "Yearly rent as a share of price", icon: Percent, metric: (o) => (o.rentalYield != null ? `${o.rentalYield}% yield` : "—") },
  { key: "high_appreciation", title: "Fastest price growth", desc: "Asking price change over about a year", icon: TrendingUp, metric: (o) => (o.appreciation12m != null ? `${o.appreciation12m > 0 ? "+" : ""}${o.appreciation12m}%` : "—") },
  { key: "emerging_areas", title: "Emerging societies", desc: "Below-average prices with rising demand", icon: Sprout, metric: (o) => `${formatPKR(o.medianPricePerSqft * 225)}/marla` },
  { key: "affordable_areas", title: "Affordable areas", desc: "Lowest price per marla with good supply", icon: Coins, metric: (o) => `${formatPKR(o.medianPricePerSqft * 225)}/marla` },
  { key: "commercial", title: "Commercial hotspots", desc: "Most shops, offices and commercial plots", icon: Building2, metric: (o) => `${o.commercialListings} commercial` },
  { key: "installments", title: "Installment options", desc: "Most listings available on installments", icon: Wallet, metric: (o) => `${o.installmentListings} on installments` },
];

export default async function InvestPage({ searchParams }: Props) {
  const sp = await searchParams;
  const city = CITY_LINKS.find((c) => c.slug === sp.city)?.slug;
  const data = await investmentOpportunities(db, { city });
  const cats = data.categories as Record<string, Opportunity[]>;
  const cityName = city ? CITY_LINKS.find((c) => c.slug === city)!.name : `${COUNTRY.inName}`;

  return (
    <div className="container-px py-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Investment opportunities</h1>
          <p className="mt-3 text-slate-500">Where to invest in {cityName}: rental yield, price growth, demand and entry price, worked out from live listings.</p>
        </div>
        <form action="/invest" className="flex gap-2">
          <select name="city" defaultValue={city ?? ""} className="input w-48" aria-label="City">
            <option value="">All cities</option>
            {CITY_LINKS.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <button className="btn-primary">Show</button>
        </form>
      </div>

      {data.all.length > 0 && (
        <section className="card mt-8 overflow-hidden">
          <h2 className="flex items-center gap-2 px-6 pt-6 text-lg font-bold"><Flame className="h-5 w-5 text-gold-500" /> Top-rated areas</h2>
          <p className="px-6 text-sm text-slate-500">Score combines rental yield, price growth, demand and affordability.</p>
          <div className="overflow-x-auto">
            <table className="mt-4 w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-2.5">Area</th>
                  <th className="px-6 py-2.5">Score</th>
                  <th className="px-6 py-2.5">Price / marla</th>
                  <th className="px-6 py-2.5">Yield</th>
                  <th className="px-6 py-2.5">Growth</th>
                  <th className="px-6 py-2.5">Listings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.all.slice(0, 10).map((o) => (
                  <tr key={o.slug}>
                    <td className="px-6 py-3">
                      <Link href={areaPath(o.slug)} className="font-semibold text-slate-900 hover:text-brand-700">{o.name}</Link>
                      <span className="block text-xs text-slate-500">{o.cityName}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex h-8 w-10 items-center justify-center rounded-lg bg-brand-700 font-bold text-white">{o.score}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">{formatPKR(o.medianPricePerSqft * 225)}</td>
                    <td className="px-6 py-3">{o.rentalYield != null ? `${o.rentalYield}%` : "—"}</td>
                    <td className="px-6 py-3">{o.appreciation12m != null ? `${o.appreciation12m > 0 ? "+" : ""}${o.appreciation12m}%` : "—"}</td>
                    <td className="px-6 py-3"><Link href={searchPath({ purpose: "sale", city: o.citySlug, location: o.slug })} className="font-semibold text-brand-700">{o.activeListings}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.filter((s) => cats[s.key]?.length).map((s) => (
          <section key={s.key} id={s.key === "installments" ? "installment-areas" : undefined} className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><s.icon className="h-5 w-5 text-brand-600" /> {s.title}</h2>
            <p className="text-xs text-slate-500">{s.desc}</p>
            <ol className="mt-3 divide-y divide-slate-100">
              {cats[s.key].slice(0, 5).map((o, i) => (
                <li key={o.slug}>
                  <Link href={areaPath(o.slug)} className="flex items-center gap-3 py-2.5 text-sm hover:text-brand-700">
                    <span className="w-4 text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{o.name}</span>
                      <span className="text-xs text-slate-500">{o.cityName}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-700">{s.metric(o)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      {data.installmentProjects.length > 0 && (
        <section id="installments" className="mt-12 scroll-mt-24">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="section-title">Projects on installments</h2>
              <p className="mt-1 text-slate-500">Lowest down payments first</p>
            </div>
            <Link href="/projects" className="flex items-center gap-1 text-sm font-semibold text-brand-700">All projects <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.installmentProjects.slice(0, 8).map((p) => (
              <ProjectCard key={p.slug} p={{ id: p.slug, slug: p.slug, name: p.name, status: p.status, cover: p.cover, developerName: `${p.minDown}% down · up to ${Math.round(p.maxMonths / 12)} yrs`, locationName: null, cityName: p.cityName, minPrice: p.minPrice || null }} />
            ))}
          </div>
        </section>
      )}

      {data.overseasPicks.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title">Ready or near completion</h2>
          <p className="mb-5 mt-1 text-slate-500">Lower delivery risk, good for buyers living abroad</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.overseasPicks.map((p) => (
              <Link key={p.slug} href={projectPath(p.slug)} className="card flex items-center justify-between p-4 hover:border-brand-300">
                <span>
                  <span className="block font-semibold text-slate-900">{p.name}</span>
                  <span className="text-sm text-slate-500">{p.cityName}</span>
                </span>
                <span className="text-sm font-bold">{p.minPrice ? formatPKR(p.minPrice) : ""}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <MarketDataNote demo={data.isDemoData} />
        <Link href="/tools/investment" className="btn-outline">Analyse a specific property →</Link>
      </div>
    </div>
  );
}
