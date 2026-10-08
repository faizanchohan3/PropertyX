import type { Database } from "@propertyx/database";
import { PostgresListingSearch } from "./postgres-engine";
import type { ListingSearchEngine } from "./types";

export * from "./types";
export { PostgresListingSearch, mapCard, CARD_COLUMNS, CARD_FROM, toPrefixTsQuery, haversineSql } from "./postgres-engine";
export * from "./opensearch-mapping";

/**
 * SEARCH_ENGINE=postgres (default). An OpenSearch implementation of
 * ListingSearchEngine can be registered here without touching callers.
 */
export function createSearchEngine(db: Database): ListingSearchEngine & PostgresListingSearch {
  const engine = process.env.SEARCH_ENGINE ?? "postgres";
  if (engine !== "postgres") console.warn(`[search] SEARCH_ENGINE=${engine} is not available in this build; falling back to postgres`);
  return new PostgresListingSearch(db);
}
