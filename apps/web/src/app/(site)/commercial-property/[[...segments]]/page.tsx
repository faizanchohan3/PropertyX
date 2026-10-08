import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { queryFromPath, searchMetadata } from "@/lib/search-routes";

type Props = { params: Promise<{ segments?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { segments = [] } = await params;
  const { query } = queryFromPath("commercial", segments, await searchParams);
  return searchMetadata(query, ["/commercial-property", ...segments].join("/"));
}

export default async function Page({ params, searchParams }: Props) {
  const { segments = [] } = await params;
  const { query } = queryFromPath("commercial", segments, await searchParams);
  return <SearchView query={query} basePath={["/commercial-property", ...segments].join("/")} crumbs={[{ label: "Commercial", href: "/commercial-property" }]} />;
}
