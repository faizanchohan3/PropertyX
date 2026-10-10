import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { constructionRates, cities } from "@propertyx/database";
import { DEFAULT_CONSTRUCTION_RATES } from "@propertyx/database/reference";
import type { ConstructionRates } from "@propertyx/shared";
import { db } from "@/lib/server";
import { ConstructionCalculator, type CityRates } from "@/components/tools/construction-calculator";

export const metadata: Metadata = {
  title: "House construction cost calculator",
  description: "Estimate the cost of building a house in Pakistan — grey structure, finishing, electrical, plumbing, woodwork, kitchens, bathrooms and labour — with current per-city rates.",
  alternates: { canonical: "/tools/construction-cost" },
};

export const revalidate = 3600;

async function loadRates(): Promise<CityRates[]> {
  const rows = await db
    .select({ slug: cities.slug, name: cities.name, sortOrder: cities.sortOrder, rates: constructionRates.rates })
    .from(constructionRates)
    .leftJoin(cities, eq(cities.id, constructionRates.cityId));
  const fallback = (rows.find((r) => !r.slug)?.rates as ConstructionRates | undefined) ?? DEFAULT_CONSTRUCTION_RATES;
  const perCity = rows
    .filter((r): r is typeof r & { slug: string; name: string } => !!r.slug && !!r.name)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .map((r) => ({ slug: r.slug, name: r.name, rates: r.rates as ConstructionRates }));
  return [{ slug: "", name: "Other city (national average)", rates: fallback }, ...perCity];
}

export default async function ConstructionCostPage() {
  const rates = await loadRates().catch(() => [{ slug: "", name: "Other city (national average)", rates: DEFAULT_CONSTRUCTION_RATES }]);
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Construction cost calculator</h1>
        <p className="mt-3 text-slate-500">Estimate what it costs to build a house on your plot, broken down by grey structure, finishing and fittings. Rates are reviewed regularly for each city.</p>
      </div>
      <ConstructionCalculator cities={rates} />
    </div>
  );
}
