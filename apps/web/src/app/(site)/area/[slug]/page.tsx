import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowRight, Check, ChevronRight, MapPinned, X } from "lucide-react";
import { getLocationPage } from "@propertyx/core";
import { areaPath, agentPath, projectPath, searchPath, formatPKR, PROPERTY_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@propertyx/shared";
import { db } from "@/lib/server";
import { renderMarkdown } from "@/lib/markdown";
import { VerificationBadge } from "@/components/badges";
import { IndexChart } from "@/components/market/index-chart";
import { MarketDataNote, Stat, ChangePill } from "@/components/market/data-note";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

const load = cache((slug: string) => getLocationPage(db, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return { title: "Area not found" };
  const l = page.location;
  return {
    title: l.seoTitle ?? `${l.fullName} — area guide, prices & property`,
    description: l.seoDescription ?? page.guide?.summary ?? `Property prices, rents, listings and agents in ${l.fullName}.`,
    alternates: { canonical: areaPath(l.slug) },
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) notFound();
  const { location: loc, city, parent, guide, index, priceTable, apartments } = page;
  const isCity = loc.kind === "city";
  const citySlug = city?.slug ?? (isCity ? loc.slug : undefined);
  const where = { city: citySlug, location: isCity ? undefined : loc.slug };
  const forSale = page.typeCounts.filter((t) => t.purpose === "sale").reduce((s, t) => s + t.count, 0);
  const forRent = page.typeCounts.filter((t) => t.purpose === "rent").reduce((s, t) => s + t.count, 0);
  const types = Object.values(
    page.typeCounts.reduce<Record<string, { type: string; sale: number; rent: number }>>((acc, t) => {
      acc[t.type] ??= { type: t.type, sale: 0, rent: 0 };
      acc[t.type][t.purpose === "rent" ? "rent" : "sale"] += t.count;
      return acc;
    }, {}),
  ).sort((a, b) => b.sale + b.rent - (a.sale + a.rent));
  const highlights = loc.highlights ?? [];
  const hasPrices = priceTable.some((r) => r.house || r.plot || r.rent);

  return (
    <div className="container-px py-10">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/areas" className="hover:text-brand-700">Area guides</Link>
        {city && !isCity && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={areaPath(city.slug)} className="hover:text-brand-700">{city.name}</Link>
          </>
        )}
        {parent && parent.kind !== "city" && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={areaPath(parent.slug)} className="hover:text-brand-700">{parent.name}</Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-700">{loc.name}</span>
      </nav>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{guide?.title ?? `${loc.name} area guide`}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-slate-500">
            <MapPinned className="h-4 w-4" /> {loc.fullName}
          </p>
          {(guide?.summary ?? loc.overview) && <p className="mt-4 text-lg text-slate-600">{guide?.summary ?? loc.overview}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={searchPath({ purpose: "sale", ...where })} className="btn-primary">Buy in {loc.name}</Link>
          <Link href={searchPath({ purpose: "rent", ...where })} className="btn-outline">Rent in {loc.name}</Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="For sale" value={forSale.toLocaleString()} hint="active listings" />
        <Stat label="For rent" value={forRent.toLocaleString()} hint="active listings" />
        <Stat label="Avg. price per marla" value={index.summary.pricePerMarla ? formatPKR(index.summary.pricePerMarla) : "—"} hint={index.summary.pricePerSqft ? `PKR ${index.summary.pricePerSqft.toLocaleString()} / sq ft` : undefined} />
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Price change</p>
          <p className="mt-1 text-xl font-extrabold">
            <ChangePill pct={index.summary.growthPct} />
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{index.summary.growthFrom ? `since ${new Date(index.summary.growthFrom).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}` : "not enough data yet"}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {index.points.some((p) => p.salePricePerSqft) && (
            <section className="card p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-lg font-bold">Price trend</h2>
                <Link href={`/price-index?${new URLSearchParams(isCity ? { city: loc.slug } : { city: citySlug ?? "", location: loc.slug })}`} className="text-sm font-semibold text-brand-700">
                  Full price index
                </Link>
              </div>
              <p className="mb-4 text-sm text-slate-500">Median asking price per sq ft, by quarter</p>
              <IndexChart data={index.points} series={[{ key: "salePricePerSqft", label: "Price / sq ft" }]} />
            </section>
          )}

          {hasPrices && (
            <section className="card overflow-hidden">
              <h2 className="px-6 pt-6 text-lg font-bold">Typical prices</h2>
              <div className="overflow-x-auto">
                <table className="mt-4 w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-2.5">Size</th>
                      <th className="px-6 py-2.5">House (sale)</th>
                      <th className="px-6 py-2.5">Plot (sale)</th>
                      <th className="px-6 py-2.5">House rent / month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceTable.map((r) => (
                      <tr key={r.size}>
                        <td className="px-6 py-3 font-semibold">{r.size}</td>
                        <td className="px-6 py-3">{r.house ? formatPKR(r.house) : "—"}</td>
                        <td className="px-6 py-3">{r.plot ? formatPKR(r.plot) : "—"}</td>
                        <td className="px-6 py-3">{r.rent ? formatPKR(r.rent) : "—"}</td>
                      </tr>
                    ))}
                    {(apartments.salePricePerSqft || apartments.medianRent) && (
                      <tr>
                        <td className="px-6 py-3 font-semibold">Apartments</td>
                        <td className="px-6 py-3" colSpan={2}>{apartments.salePricePerSqft ? `PKR ${apartments.salePricePerSqft.toLocaleString()} / sq ft` : "—"}</td>
                        <td className="px-6 py-3">{apartments.medianRent ? formatPKR(apartments.medianRent) : "—"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4">
                <MarketDataNote demo={page.isDemoData} />
              </div>
            </section>
          )}

          {guide?.body && (
            <section className="card p-6">
              <h2 className="text-lg font-bold">About {loc.name}</h2>
              <div className="prose-px text-slate-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(guide.body) }} />
            </section>
          )}

          {(guide?.pros?.length || guide?.cons?.length) && (
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="card p-6">
                <h2 className="font-bold text-emerald-700">Pros</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {(guide.pros ?? []).map((p) => (
                    <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {p}</li>
                  ))}
                </ul>
              </div>
              <div className="card p-6">
                <h2 className="font-bold text-red-700">Cons</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {(guide.cons ?? []).map((p) => (
                    <li key={p} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> {p}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {loc.investmentOutlook && (
            <section className="card p-6">
              <h2 className="text-lg font-bold">Investment outlook</h2>
              <p className="mt-2 text-slate-700">{loc.investmentOutlook}</p>
            </section>
          )}

          {page.children.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">{isCity ? `Areas & societies in ${loc.name}` : `Inside ${loc.name}`}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {page.children.map((c) => (
                  <Link key={c.slug} href={areaPath(c.slug)} className="card group flex items-center justify-between p-4 hover:border-brand-300">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 group-hover:text-brand-700">{c.name}</span>
                      <span className="text-xs capitalize text-slate-500">{c.kind}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-600" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {highlights.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold">Highlights</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {highlights.map((h) => (
                  <li key={h} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {h}</li>
                ))}
              </ul>
            </section>
          )}

          {types.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold">Listings by type</h2>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {types.slice(0, 10).map((t) => (
                  <li key={t.type} className="flex justify-between py-2">
                    <span className="text-slate-700">{PROPERTY_TYPE_LABELS[t.type as keyof typeof PROPERTY_TYPE_LABELS] ?? t.type}</span>
                    <span className="text-slate-500">{t.sale > 0 && `${t.sale} sale`}{t.sale > 0 && t.rent > 0 && " · "}{t.rent > 0 && `${t.rent} rent`}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {page.agents.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold">Agents in {loc.name}</h2>
              <ul className="mt-3 space-y-3">
                {page.agents.map((a) => (
                  <li key={a.id}>
                    <Link href={agentPath(a.slug)} className="group flex items-center gap-3">
                      {a.photo ? <img src={a.photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">{a.name[0]}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold group-hover:text-brand-700">{a.name}</span>
                        <span className="block truncate text-xs text-slate-500">{a.agencyName ?? "Independent"} · {a.listings} listings</span>
                      </span>
                      <VerificationBadge level={a.verificationLevel} kind="agent" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {page.projects.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold">New projects</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {page.projects.map((p) => (
                  <li key={p.id}>
                    <Link href={projectPath(p.slug)} className="group block">
                      <span className="block font-semibold group-hover:text-brand-700">{p.name}</span>
                      <span className="text-xs text-slate-500">
                        {p.developerName} · {PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS] ?? p.status}
                        {p.minPrice ? ` · from ${formatPKR(p.minPrice)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
