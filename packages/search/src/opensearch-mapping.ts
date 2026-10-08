/**
 * Index mapping + document builder for a future OpenSearch / Elasticsearch
 * engine. Kept in code so the migration path is concrete and testable:
 *   1. create index with OPENSEARCH_LISTING_MAPPING
 *   2. backfill with toSearchDocument() for every active listing
 *   3. keep in sync from the listing service (create / update / status change hooks)
 *   4. implement ListingSearchEngine with the same SearchQuery semantics
 */
import type { ListingCard } from "./types";

export const OPENSEARCH_LISTING_MAPPING = {
  settings: {
    analysis: {
      analyzer: { listing_text: { type: "custom", tokenizer: "standard", filter: ["lowercase", "asciifolding"] } },
    },
  },
  mappings: {
    properties: {
      id: { type: "keyword" },
      slug: { type: "keyword" },
      title: { type: "text", analyzer: "listing_text" },
      description: { type: "text", analyzer: "listing_text" },
      purpose: { type: "keyword" },
      type: { type: "keyword" },
      status: { type: "keyword" },
      price: { type: "long" },
      areaSqft: { type: "float" },
      beds: { type: "integer" },
      baths: { type: "integer" },
      citySlug: { type: "keyword" },
      locationSlugs: { type: "keyword" },
      features: { type: "keyword" },
      location: { type: "geo_point" },
      verificationLevel: { type: "integer" },
      featuredUntil: { type: "date" },
      publishedAt: { type: "date" },
      viewsCount: { type: "integer" },
      savesCount: { type: "integer" },
      qualityScore: { type: "integer" },
    },
  },
} as const;

export function toSearchDocument(card: ListingCard, extra: { description: string; features: string[]; locationSlugs: string[]; featuredUntil: string | null; qualityScore: number }) {
  return {
    id: card.id,
    slug: card.slug,
    title: card.title,
    description: extra.description,
    purpose: card.purpose,
    type: card.type,
    status: card.status,
    price: card.price,
    areaSqft: card.areaSqft,
    beds: card.beds,
    baths: card.baths,
    citySlug: card.citySlug,
    locationSlugs: extra.locationSlugs,
    features: extra.features,
    location: card.lat != null && card.lng != null ? { lat: card.lat, lon: card.lng } : null,
    verificationLevel: card.verificationLevel,
    featuredUntil: extra.featuredUntil,
    publishedAt: card.publishedAt,
    viewsCount: card.viewsCount,
    savesCount: card.savesCount,
    qualityScore: extra.qualityScore,
  };
}
