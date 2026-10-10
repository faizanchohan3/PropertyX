import type { Metadata } from "next";
import Link from "next/link";
import { getSetting, listAreaDirectory, priceIndex, propertyTrends } from "@propertyx/core";
import { TYPE_GROUPS, areaPath, formatPKR } from "@propertyx/shared";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";
import { IndexBars, IndexChart } from "@/components/market/index-chart";
import { ChangePill, MarketDataNote, Stat } from "@/components/market/data-note";

export const metadata: Metadata = {
  title: "Property price index — Pakistan real estate prices",
  description: "Track how property prices and rents are changing in Pakistan's cities, areas and housing societies, month by month.",
  alternates: { canonical: "/price-index" },
};

const GROUPS = [
  { key: "homes", label: "Homes" },
  { key: "plots", label: "Plots" },
  { key: "commercial", label: "Commercial" },
] as const;
const PERIODS = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
] as const;

type Props = { searchParams: Promise<{ city?: string; location?: string; group?: string; period?: string }> };

export default async function PriceIndexPage({ searchParams }: Props) {
  const sp = await searchParams;
  const city = CITY_LINKS.find((c) => c.slug === sp.city)?.slug ?? "lahore";
  const group = GROUPS.find((g) => g.key === sp.group)?.key ?? "homes";
  const period = PERIODS.find((p) => p.key === sp.period)?.key ?? "monthly";
  const [areas, demo] = await Promise.all([listAreaDirectory(db, { city, perCity: 200 }), getSetting<boolean>(db, "demo_mode")]);
  const areaList = areas[0]?.areas ?? [];
  const location = areaList.some((a) => a.slug === sp.location) ? sp.location : undefined;
  const [index, top] = await Promise.all([
    priceIndex(db, { city, location, types: TYPE_GROUPS[group], period }),
    location ? Promise.resolve([]) : propertyTrends(db, { city, limit: 10 }),
  ]);
  const placeName = location ? areaList.find((a) => a.slug === location)!.name : CITY_LINKS.find((c) => c.slug === city)!.name;
  const s = index.summary;
  const hasSeries = index.points.some((p) => p.salePricePerSqft);

  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Property price index</h1>
        <p className="mt-3 text-slate-500">How asking prices and rents are moving in {placeName}.</p>
      </div>

      <form action="/price-index" className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <select name="city" defaultValue={city} className="input" aria-label="City">
          {CITY_LINKS.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select name="location" defaultValue={location ?? ""} className="input" aria-label="Area or society">
          <option value="">Whole city</option>
          {areaList.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
        <select name="group" defaultValue={group} className="input" aria-label="Property type">
          {GROUPS.map((g) => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>
        <select name="period" defaultValue={period} className="input" aria-label="Period">
          {PERIODS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <button className="btn-primary">Update</button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Price per marla" value={s.pricePerMarla ? formatPKR(s.pricePerMarla) : "—"} hint={s.pricePerSqft ? `PKR ${s.pricePerSqft.toLocaleString()} / sq ft` : undefined} />
        <Stat label="Average asking price" value={s.avgPrice ? formatPKR(s.avgPrice) : "—"} />
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Price change</p>
          <p className="mt-1 text-xl font-extrabold"><ChangePill pct={s.growthPct} /></p>
          <p className="mt-0.5 text-xs text-slate-500">{s.growthFrom ? `since ${new Date(s.growthFrom).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}` : "not enough data yet"}</p>
        </div>
        <Stat label="Rental yield" value={s.rentalYield != null ? `${s.rentalYield}%` : "—"} hint="gross, per year" />
        <Stat label="Active listings" value={s.activeListings.toLocaleString()} />
      </div>

      {hasSeries ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-6 lg:col-span-2">
            <h2 className="text-lg font-bold">Price per marla</h2>
            <p className="mb-4 text-sm text-slate-500">Median asking price of {group} listed in each period</p>
            <IndexChart data={index.points} series={[{ key: "salePricePerMarla", label: "Price / marla" }]} height={300} />
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-bold">Rental yield</h2>
            <p className="mb-4 text-sm text-slate-500">Yearly rent as a share of price</p>
            <IndexChart data={index.points} series={[{ key: "rentalYield", label: "Yield %", color: "#e2ad3d" }]} yFormat="percent" />
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-bold">Supply</h2>
            <p className="mb-4 text-sm text-slate-500">New listings in each period</p>
            <IndexBars data={index.points} series={[{ key: "supply", label: "New listings" }]} />
          </section>
        </div>
      ) : (
        <p className="card mt-6 p-10 text-center text-slate-500">Not enough listings yet to chart prices here. Try the whole city or another property type.</p>
      )}

      {top.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <h2 className="px-6 pt-6 text-lg font-bold">Areas in {placeName}</h2>
          <div className="overflow-x-auto">
            <table className="mt-4 w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-2.5">Area</th>
                  <th className="px-6 py-2.5">Price / marla</th>
                  <th className="px-6 py-2.5">Change (6 mo vs year before)</th>
                  <th className="px-6 py-2.5">Listings for sale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {top.map((a) => (
                  <tr key={a.slug}>
                    <td className="px-6 py-3">
                      <Link href={`/price-index?${new URLSearchParams({ city, location: a.slug, group, period })}`} className="font-semibold text-brand-700 hover:text-brand-800">{a.name}</Link>
                    </td>
                    <td className="px-6 py-3">{a.pricePerMarla ? formatPKR(a.pricePerMarla) : "—"}</td>
                    <td className="px-6 py-3"><ChangePill pct={a.priceChangePct} /></td>
                    <td className="px-6 py-3">{a.activeListings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {location && (
        <p className="mt-6 text-sm">
          <Link href={areaPath(location)} className="font-semibold text-brand-700">Read the {placeName} area guide →</Link>
        </p>
      )}
      <div className="mt-6">
        <MarketDataNote demo={!!demo} />
      </div>
    </div>
  );
}
