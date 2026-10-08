import type { SearchQuery, AreaUnit, PropertyType, Purpose } from "@propertyx/shared";

export interface ListingCard {
  id: string;
  slug: string;
  referenceCode: string;
  title: string;
  purpose: Purpose;
  type: PropertyType;
  price: number;
  previousPrice: number | null;
  priceReducedAt: string | null;
  rentPeriod: string | null;
  pricePerSqft: number | null;
  areaValue: number;
  areaUnit: AreaUnit;
  areaSqft: number;
  beds: number | null;
  baths: number | null;
  cityName: string;
  citySlug: string;
  locationName: string | null;
  locationFullName: string | null;
  locationSlug: string | null;
  lat: number | null;
  lng: number | null;
  coverUrl: string | null;
  imageCount: number;
  verificationLevel: number;
  isFeatured: boolean;
  isPremium: boolean;
  installmentAvailable: boolean;
  hasVideo: boolean;
  publishedAt: string | null;
  updatedAt: string;
  viewsCount: number;
  savesCount: number;
  agentName: string | null;
  agentSlug: string | null;
  agentPhoto: string | null;
  agencyName: string | null;
  agencyLogo: string | null;
  isSeed: boolean;
  status: string;
  /** relevance / recommendation score when applicable */
  score?: number;
}

export interface SearchResult {
  items: ListingCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** resolved location context for headings / breadcrumbs */
  context: { city?: { id: string; name: string; slug: string }; location?: { id: string; name: string; fullName: string; slug: string; kind: string } };
}

export interface MapPin {
  kind: "pin";
  id: string;
  slug: string;
  lat: number;
  lng: number;
  price: number;
  purpose: Purpose;
  type: PropertyType;
  title: string;
  coverUrl: string | null;
  beds: number | null;
  areaValue: number;
  areaUnit: AreaUnit;
}
export interface MapCluster {
  kind: "cluster";
  lat: number;
  lng: number;
  count: number;
  minPrice: number;
  bbox: [number, number, number, number];
}
export interface MapResult {
  total: number;
  clustered: boolean;
  features: (MapPin | MapCluster)[];
}

export interface Facets {
  types: { key: string; count: number }[];
  beds: { key: number; count: number }[];
  locations: { slug: string; name: string; count: number }[];
  priceRange: { min: number; max: number } | null;
}

export interface LocationSuggestion {
  id: string;
  kind: string;
  name: string;
  fullName: string;
  slug: string;
  citySlug: string | null;
  activeListings: number;
}

/**
 * Engine contract. The default implementation uses PostgreSQL full-text search
 * and geometric operators; an OpenSearch/Elasticsearch implementation can be
 * swapped in by implementing the same interface (see docs/search.md).
 */
export interface ListingSearchEngine {
  search(q: SearchQuery, opts?: { userId?: string }): Promise<SearchResult>;
  map(q: SearchQuery, zoom: number): Promise<MapResult>;
  facets(q: SearchQuery): Promise<Facets>;
  suggestLocations(term: string, limit?: number): Promise<LocationSuggestion[]>;
}
