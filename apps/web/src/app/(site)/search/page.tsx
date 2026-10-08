import type { Metadata } from "next";
import { parseSearchQuery } from "@propertyx/shared";
import { SearchView } from "@/components/search/search-view";
import { searchMetadata } from "@/lib/search-routes";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseSearchQuery(await searchParams);
  return { ...(await searchMetadata(q, "/search")), robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = parseSearchQuery(await searchParams);
  return <SearchView query={query} basePath="/search" />;
}
