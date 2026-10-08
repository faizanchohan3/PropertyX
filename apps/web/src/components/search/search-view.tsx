import Link from "next/link";
import { Map as MapIcon, Sparkles } from "lucide-react";
import { createSearchEngine } from "@propertyx/search";
import { trackSearch, serveAds } from "@propertyx/core";
import { PROPERTY_TYPE_LABELS, serializeSearchQuery, type SearchQuery } from "@propertyx/shared";
import { db, getUser, appUrl } from "@/lib/server";
import { savedIdsFor } from "@/lib/queries";
import { PropertyCard } from "../property-card";
import { Breadcrumbs, Pagination, EmptyState, JsonLd } from "../seo";
import { SearchFilters } from "./filters";
import { SortSelect, SaveSearchButton } from "./toolbar";

export function searchTitle(q: SearchQuery, ctx: { city?: { name: string }; location?: { name: string; fullName: string } }) {
  const typeLabel = q.types?.length === 1 ? `${PROPERTY_TYPE_LABELS[q.types[0]]}s` : q.types?.every((t) => t.includes("plot") || t === "agricultural_land") ? "Plots" : q.types?.length ? "Properties" : "Properties";
  const purpose = q.purpose === "rent" ? "for Rent" : q.purpose === "sale" ? "for Sale" : "";
  const where = ctx.location?.name ?? ctx.city?.name ?? "Pakistan";
  return `${typeLabel.replace("ys", "ies").replace(/ss$/, "s")} ${purpose} in ${where}`.replace(/\s+/g, " ");
}

export async function SearchView({ query, basePath, crumbs = [] }: { query: SearchQuery; basePath: string; crumbs?: { label: string; href?: string }[] }) {
  const user = await getUser();
  const engine = createSearchEngine(db);
  const [result, facets] = await Promise.all([engine.search(query), engine.facets(query)]);
  const saved = user ? await savedIdsFor(user.id) : [];
  const title = searchTitle(query, result.context);
  void trackSearch(db, user?.id ?? null, null, query).catch(() => {});
  const sponsor = result.context.location ? (await serveAds(db, "area_sponsorship", { locationId: result.context.location.id }))[0] : undefined;
  const hrefFor = (p: number) => {
    const qs = serializeSearchQuery({ ...query, page: p }).toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  const mapQs = serializeSearchQuery({ ...query, page: undefined }).toString();
  const baseUrl = appUrl();

  return (
    <div className="container-px py-6">
      <Breadcrumbs items={[...crumbs, { label: title }]} baseUrl={baseUrl} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{result.total.toLocaleString()} {result.total === 1 ? "property" : "properties"} found</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveSearchButton query={{ ...query, page: undefined }} defaultName={title} />
          <Link href={`/map?${mapQs}`} className="btn-outline">
            <MapIcon className="h-4 w-4" /> Map view
          </Link>
          <SortSelect value={query.sort} />
        </div>
      </div>

      {facets.locations.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {facets.locations.map((l) => (
            <Link key={l.slug} href={`/search?${serializeSearchQuery({ ...query, location: l.slug, page: undefined }).toString()}`} className="chip shrink-0 text-xs">
              {l.name} <span className="text-slate-400">{l.count}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <SearchFilters initial={query} locationLabel={result.context.location?.name} total={result.total} />
          {facets.types.length > 1 && (
            <div className="card mt-4 hidden p-5 lg:block">
              <p className="mb-2 text-sm font-semibold">Property types</p>
              <ul className="space-y-1 text-sm">
                {facets.types.map((t) => (
                  <li key={t.key}>
                    <Link href={`/search?${serializeSearchQuery({ ...query, types: [t.key as SearchQuery["types"] extends (infer U)[] | undefined ? U : never], page: undefined }).toString()}`} className="flex justify-between rounded-lg px-2 py-1 hover:bg-slate-50">
                      <span>{PROPERTY_TYPE_LABELS[t.key as keyof typeof PROPERTY_TYPE_LABELS]}</span>
                      <span className="text-slate-400">{t.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          {sponsor && (
            <a href={`/api/v1/ads/${sponsor.id}/click`} rel="sponsored" className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-gold-200 bg-gold-50 p-4">
              <span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold-700">Area sponsor</span>
                <span className="block font-semibold text-slate-900">{sponsor.title}</span>
                {sponsor.body && <span className="text-sm text-slate-600">{sponsor.body}</span>}
              </span>
              <span className="btn-gold btn-sm">View</span>
            </a>
          )}
          {result.items.length === 0 ? (
            <EmptyState
              title="No properties match these filters"
              body="Try widening your budget, removing some filters, or ask the AI assistant to suggest alternatives."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={`/search?purpose=${query.purpose ?? "sale"}${query.city ? `&city=${query.city}` : ""}`} className="btn-outline">
                    Clear filters
                  </Link>
                  <Link href="/ai" className="btn-primary">
                    <Sparkles className="h-4 w-4" /> Ask AI
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((l, i) => (
                <PropertyCard key={l.id} l={l} saved={saved.includes(l.id)} priority={i < 3} />
              ))}
            </div>
          )}
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          numberOfItems: result.total,
          itemListElement: result.items.map((l, i) => ({ "@type": "ListItem", position: (result.page - 1) * result.pageSize + i + 1, url: `${baseUrl}/property/${l.slug}`, name: l.title })),
        }}
      />
    </div>
  );
}
