import "server-only";
import type { Metadata } from "next";
import { createSearchEngine } from "@propertyx/search";
import { parseSearchQuery, parseSearchSegments, TYPE_SLUGS, TYPE_GROUPS, type SearchQuery, type PropertyType, type Purpose } from "@propertyx/shared";
import { db } from "./server";
import { searchTitle } from "@/components/search/search-view";

type SP = Record<string, string | string[] | undefined>;

/** Build a SearchQuery from an SEO path + query string. Query-string filters win. */
export function queryFromPath(kind: "buy" | "rent" | "plots" | "commercial", segments: string[] = [], sp: SP = {}): { query: SearchQuery; typeSlug?: string } {
  const purpose: Purpose = kind === "rent" ? "rent" : "sale";
  let typeSlug: string | undefined;
  let city: string | undefined;
  let location: string | undefined;
  let types: PropertyType[] | undefined;
  if (kind === "plots") {
    [city, location] = segments;
    types = TYPE_GROUPS.plots;
  } else if (kind === "commercial") {
    [city, location] = segments;
    types = TYPE_GROUPS.commercial;
  } else {
    const parsed = parseSearchSegments(segments);
    typeSlug = parsed.typeSlug;
    city = parsed.city === "property" ? undefined : parsed.city;
    location = parsed.location;
    const t = typeSlug ? TYPE_SLUGS[typeSlug] : undefined;
    types = t && t !== "all" ? [...t] : undefined;
    if (purpose === "rent" && types) types = types.filter((x) => !["residential_plot", "commercial_plot", "plot_file"].includes(x));
  }
  const fromQs = parseSearchQuery(sp);
  return { query: { purpose, types, city, location, ...stripUndefined(fromQs) }, typeSlug };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function searchMetadata(query: SearchQuery, canonicalPath: string): Promise<Metadata> {
  const ctx = await createSearchEngine(db).resolveContext(query);
  const title = searchTitle(query, ctx);
  const { total } = await createSearchEngine(db).search({ ...query, pageSize: 1 });
  const description = `Browse ${total.toLocaleString()} ${title.toLowerCase()} on Bismillah. Compare prices, view verified listings, photos, maps and contact agents directly.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { title: `${title} | Bismillah Pakistan`, description, url: canonicalPath },
    robots: query.page && query.page > 1 ? { index: false, follow: true } : undefined,
  };
}
