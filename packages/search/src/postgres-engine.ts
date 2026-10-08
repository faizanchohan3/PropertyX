import { sql, type SQL } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import { parseBbox, parsePolygon, toSqft, TYPE_GROUPS, type SearchQuery } from "@propertyx/shared";
import type { Facets, ListingCard, ListingSearchEngine, LocationSuggestion, MapCluster, MapPin, MapResult, SearchResult } from "./types";

type Row = Record<string, unknown>;

const num = (v: unknown) => (v == null ? null : Number(v));
const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

export const CARD_COLUMNS = sql`
  l.id, l.slug, l.reference_code, l.title, l.purpose, l.status, l.price, l.previous_price, l.price_reduced_at, l.rent_period,
  l.price_per_sqft, l.verification_level, l.is_premium, l.installment_available, l.video_url is not null as has_video,
  (l.featured_until is not null and l.featured_until > now()) as is_featured,
  l.published_at, l.updated_at, l.views_count, l.saves_count, l.is_seed,
  p.type, p.area_value, p.area_unit, p.area_sqft, p.beds, p.baths, p.lat, p.lng,
  c.name as city_name, c.slug as city_slug,
  loc.name as location_name, loc.full_name as location_full_name, loc.slug as location_slug,
  ag.display_name as agent_name, ag.slug as agent_slug, ag.photo_url as agent_photo,
  agc.name as agency_name, agc.logo_url as agency_logo,
  (select m.url from property_media m where m.property_id = p.id and m.kind = 'image' order by m.sort_order limit 1) as cover_url,
  (select count(*)::int from property_media m where m.property_id = p.id and m.kind = 'image') as image_count`;

export const CARD_FROM = sql`
  from property_listings l
  join properties p on p.id = l.property_id
  join cities c on c.id = p.city_id
  left join locations loc on loc.id = p.location_id
  left join agents ag on ag.id = l.agent_id
  left join agencies agc on agc.id = l.agency_id`;

export function mapCard(r: Row): ListingCard {
  return {
    id: r.id as string,
    slug: r.slug as string,
    referenceCode: r.reference_code as string,
    title: r.title as string,
    purpose: r.purpose as ListingCard["purpose"],
    type: r.type as ListingCard["type"],
    price: Number(r.price),
    previousPrice: num(r.previous_price),
    priceReducedAt: iso(r.price_reduced_at),
    rentPeriod: (r.rent_period as string) ?? null,
    pricePerSqft: num(r.price_per_sqft),
    areaValue: Number(r.area_value),
    areaUnit: r.area_unit as ListingCard["areaUnit"],
    areaSqft: Number(r.area_sqft),
    beds: num(r.beds),
    baths: num(r.baths),
    cityName: r.city_name as string,
    citySlug: r.city_slug as string,
    locationName: (r.location_name as string) ?? null,
    locationFullName: (r.location_full_name as string) ?? null,
    locationSlug: (r.location_slug as string) ?? null,
    lat: num(r.lat),
    lng: num(r.lng),
    coverUrl: (r.cover_url as string) ?? null,
    imageCount: Number(r.image_count ?? 0),
    verificationLevel: Number(r.verification_level ?? 0),
    isFeatured: !!r.is_featured,
    isPremium: !!r.is_premium,
    installmentAvailable: !!r.installment_available,
    hasVideo: !!r.has_video,
    publishedAt: iso(r.published_at),
    updatedAt: iso(r.updated_at)!,
    viewsCount: Number(r.views_count ?? 0),
    savesCount: Number(r.saves_count ?? 0),
    agentName: (r.agent_name as string) ?? null,
    agentSlug: (r.agent_slug as string) ?? null,
    agentPhoto: (r.agent_photo as string) ?? null,
    agencyName: (r.agency_name as string) ?? null,
    agencyLogo: (r.agency_logo as string) ?? null,
    isSeed: !!r.is_seed,
    status: r.status as string,
    score: r.score != null ? Number(r.score) : undefined,
  };
}

/** Turn free text into a prefix tsquery: "dha phase 6" -> 'dha:* & phase:* & 6:*' */
export function toPrefixTsQuery(q: string): string | null {
  const terms = q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 0 && t.length < 40)
    .slice(0, 8);
  if (!terms.length) return null;
  return terms.map((t) => `${t}:*`).join(" & ");
}

export interface ResolvedContext {
  city?: { id: string; name: string; slug: string };
  location?: { id: string; name: string; fullName: string; slug: string; kind: string; refId: string; cityId: string | null };
}

export class PostgresListingSearch implements ListingSearchEngine {
  constructor(private db: Database) {}

  async resolveContext(q: SearchQuery): Promise<ResolvedContext> {
    const ctx: ResolvedContext = {};
    if (q.location) {
      const rows = await this.db.execute<Row>(sql`select id, name, full_name, slug, kind, ref_id, city_id from locations where slug = ${q.location} limit 1`);
      const r = rows[0];
      if (r) ctx.location = { id: r.id as string, name: r.name as string, fullName: r.full_name as string, slug: r.slug as string, kind: r.kind as string, refId: r.ref_id as string, cityId: (r.city_id as string) ?? null };
    }
    const citySlug = q.city ?? (ctx.location?.kind === "city" ? ctx.location.slug : undefined);
    if (citySlug) {
      const rows = await this.db.execute<Row>(sql`select id, name, slug from cities where slug = ${citySlug} limit 1`);
      if (rows[0]) ctx.city = { id: rows[0].id as string, name: rows[0].name as string, slug: rows[0].slug as string };
    } else if (ctx.location?.cityId) {
      const rows = await this.db.execute<Row>(sql`select id, name, slug from cities where id = ${ctx.location.cityId} limit 1`);
      if (rows[0]) ctx.city = { id: rows[0].id as string, name: rows[0].name as string, slug: rows[0].slug as string };
    }
    return ctx;
  }

  /** WHERE clause shared by list, map and facet queries. */
  buildWhere(q: SearchQuery, ctx: ResolvedContext, opts: { skip?: ("types" | "beds" | "location")[] } = {}): SQL {
    const w: SQL[] = [sql`l.status = 'active'`];
    if (q.purpose) w.push(sql`l.purpose = ${q.purpose}`);
    if (q.types?.length && !opts.skip?.includes("types")) w.push(sql`p.type::text in (${sql.join(q.types.map((t) => sql`${t}`), sql`, `)})`);
    if (ctx.city) w.push(sql`p.city_id = ${ctx.city.id}`);
    else if (q.city) w.push(sql`false`); // unknown city slug -> no results rather than everything
    if (q.province) w.push(sql`c.province_id = (select id from provinces where slug = ${q.province})`);
    if (ctx.location && !opts.skip?.includes("location")) {
      const { kind, refId } = ctx.location;
      if (kind === "area") w.push(sql`p.area_id = ${refId}`);
      else if (kind === "society") w.push(sql`p.society_id = ${refId}`);
      else if (kind === "block") w.push(sql`p.block_id = ${refId}`);
      else if (kind === "city") w.push(sql`p.city_id = ${refId}`);
      else if (kind === "province") w.push(sql`c.province_id = ${refId}`);
    } else if (q.location && !ctx.location) w.push(sql`false`);
    if (q.q) {
      const tsq = toPrefixTsQuery(q.q);
      if (tsq) w.push(sql`(l.search_vector @@ to_tsquery('simple', ${tsq}) or l.reference_code ilike ${q.q.trim()})`);
    }
    if (q.priceMin != null) w.push(sql`l.price >= ${q.priceMin}`);
    if (q.priceMax != null) w.push(sql`l.price <= ${q.priceMax}`);
    const unit = q.areaUnit ?? "sqft";
    if (q.areaMin != null) w.push(sql`p.area_sqft >= ${toSqft(q.areaMin, unit) * 0.98}`);
    if (q.areaMax != null) w.push(sql`p.area_sqft <= ${toSqft(q.areaMax, unit) * 1.02}`);
    if (q.beds?.length && !opts.skip?.includes("beds")) {
      const exact = q.beds.filter((b) => b < 6);
      const plus = q.beds.includes(6);
      const parts: SQL[] = [];
      if (exact.length) parts.push(sql`p.beds in ${sql.raw(`(${exact.map(Number).join(",")})`)}`);
      if (plus) parts.push(sql`p.beds >= 6`);
      w.push(sql`(${sql.join(parts, sql` or `)})`);
    }
    if (q.bathsMin != null) w.push(sql`p.baths >= ${q.bathsMin}`);
    if (q.furnishing) w.push(sql`p.furnishing = ${q.furnishing}`);
    if (q.condition) w.push(sql`p.condition = ${q.condition}`);
    if (q.verified) w.push(sql`l.verification_level >= 4`);
    if (q.hasVideo) w.push(sql`l.video_url is not null`);
    if (q.hasTour) w.push(sql`l.tour_url is not null`);
    if (q.installments) w.push(sql`l.installment_available = true`);
    if (q.agent) w.push(sql`l.agent_id = ${q.agent}`);
    if (q.agency) w.push(sql`l.agency_id = ${q.agency}`);
    if (q.owner) w.push(sql`l.posted_by_id = ${q.owner}`);
    if (q.excludeId) w.push(sql`l.id <> ${q.excludeId}`);
    if (q.features?.length) {
      const keys = sql.join(
        q.features.map((f) => sql`${f}`),
        sql`, `,
      );
      w.push(sql`p.id in (select pf.property_id from property_features pf join features f on f.id = pf.feature_id where f.key in (${keys}) group by pf.property_id having count(*) = ${q.features.length})`);
    }
    if (q.bbox) {
      const b = parseBbox(q.bbox);
      w.push(sql`p.lat between ${b.south} and ${b.north} and p.lng between ${b.west} and ${b.east}`);
    }
    if (q.lat != null && q.lng != null && q.radiusKm) {
      const dLat = q.radiusKm / 111;
      const dLng = q.radiusKm / (111 * Math.cos((q.lat * Math.PI) / 180));
      w.push(sql`p.lat between ${q.lat - dLat} and ${q.lat + dLat} and p.lng between ${q.lng - dLng} and ${q.lng + dLng}`);
      w.push(sql`${haversineSql(q.lat, q.lng)} <= ${q.radiusKm}`);
    }
    if (q.polygon) {
      const pts = parsePolygon(q.polygon);
      if (pts.length >= 3) {
        const lats = pts.map((p) => p[0]);
        const lngs = pts.map((p) => p[1]);
        w.push(sql`p.lat between ${Math.min(...lats)} and ${Math.max(...lats)} and p.lng between ${Math.min(...lngs)} and ${Math.max(...lngs)}`);
        const poly = `(${pts.map(([la, ln]) => `(${ln},${la})`).join(",")})`;
        w.push(sql`point(p.lng, p.lat) <@ ${poly}::polygon`);
      }
    }
    return sql.join(w, sql` and `);
  }

  orderBy(q: SearchQuery): SQL {
    switch (q.sort) {
      case "newest":
        return sql`l.published_at desc nulls last, l.id`;
      case "price_asc":
        return sql`l.price asc, l.id`;
      case "price_desc":
        return sql`l.price desc, l.id`;
      case "most_viewed":
        return sql`l.views_count desc, l.id`;
      case "most_saved":
        return sql`l.saves_count desc, l.id`;
      case "updated":
        return sql`l.updated_at desc, l.id`;
      default: {
        const tsq = q.q ? toPrefixTsQuery(q.q) : null;
        const rank = tsq ? sql`ts_rank(l.search_vector, to_tsquery('simple', ${tsq})) * 40` : sql`0`;
        return sql`(l.featured_until is not null and l.featured_until > now()) desc,
          (${rank} + l.quality_score * 0.3 + l.verification_level * 6
            + greatest(0, 30 - extract(epoch from (now() - coalesce(l.published_at, l.created_at))) / 86400 * 0.5)
            + least(l.views_count, 600) * 0.01) desc, l.id`;
      }
    }
  }

  async search(q: SearchQuery): Promise<SearchResult> {
    const ctx = await this.resolveContext(q);
    const where = this.buildWhere(q, ctx);
    const pageSize = q.pageSize ?? 24;
    const page = q.page ?? 1;
    const [rows, countRows] = await Promise.all([
      this.db.execute<Row>(sql`select ${CARD_COLUMNS} ${CARD_FROM} where ${where} order by ${this.orderBy(q)} limit ${pageSize} offset ${(page - 1) * pageSize}`),
      this.db.execute<Row>(sql`select count(*)::int as n ${CARD_FROM} where ${where}`),
    ]);
    const total = Number(countRows[0]?.n ?? 0);
    return {
      items: rows.map(mapCard),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      context: {
        city: ctx.city,
        location: ctx.location && { id: ctx.location.id, name: ctx.location.name, fullName: ctx.location.fullName, slug: ctx.location.slug, kind: ctx.location.kind },
      },
    };
  }

  /** Does a specific listing satisfy a saved search? (used for alerts) */
  async matchesListing(q: SearchQuery, listingId: string): Promise<boolean> {
    const ctx = await this.resolveContext(q);
    const rows = await this.db.execute<Row>(sql`select 1 ${CARD_FROM} where ${this.buildWhere(q, ctx)} and l.id = ${listingId} limit 1`);
    return rows.length > 0;
  }

  async cardsByIds(ids: string[], opts: { anyStatus?: boolean } = {}): Promise<ListingCard[]> {
    if (!ids.length) return [];
    const rows = await this.db.execute<Row>(
      sql`select ${CARD_COLUMNS} ${CARD_FROM} where l.id in (${sql.join(
        ids.map((i) => sql`${i}`),
        sql`, `,
      )}) ${opts.anyStatus ? sql`` : sql`and l.status = 'active'`}`,
    );
    const byId = new Map(rows.map((r) => [r.id as string, mapCard(r)]));
    return ids.map((i) => byId.get(i)).filter((x): x is ListingCard => !!x);
  }

  async map(q: SearchQuery, zoom: number): Promise<MapResult> {
    const ctx = await this.resolveContext(q);
    const where = sql`${this.buildWhere(q, ctx)} and p.lat is not null and p.lng is not null`;
    const countRows = await this.db.execute<Row>(sql`select count(*)::int as n ${CARD_FROM} where ${where}`);
    const total = Number(countRows[0]?.n ?? 0);
    const PIN_LIMIT = 400;
    if (total <= PIN_LIMIT || zoom >= 16) {
      const rows = await this.db.execute<Row>(sql`
        select l.id, l.slug, l.title, l.price, l.purpose, p.type, p.lat, p.lng, p.beds, p.area_value, p.area_unit,
          (select m.url from property_media m where m.property_id = p.id and m.kind = 'image' order by m.sort_order limit 1) as cover_url
        ${CARD_FROM} where ${where} order by ${this.orderBy(q)} limit 1000`);
      return {
        total,
        clustered: false,
        features: rows.map(
          (r): MapPin => ({
            kind: "pin",
            id: r.id as string,
            slug: r.slug as string,
            lat: Number(r.lat),
            lng: Number(r.lng),
            price: Number(r.price),
            purpose: r.purpose as MapPin["purpose"],
            type: r.type as MapPin["type"],
            title: r.title as string,
            coverUrl: (r.cover_url as string) ?? null,
            beds: num(r.beds),
            areaValue: Number(r.area_value),
            areaUnit: r.area_unit as MapPin["areaUnit"],
          }),
        ),
      };
    }
    // Grid clustering: cell size halves with every zoom level (~ 60px cells).
    const cell = 360 / Math.pow(2, Math.max(1, Math.min(zoom, 18))) / 4;
    const rows = await this.db.execute<Row>(sql`
      select count(*)::int as n, avg(p.lat) as lat, avg(p.lng) as lng, min(l.price) as min_price,
        min(p.lng) as w, min(p.lat) as s, max(p.lng) as e, max(p.lat) as nn
      ${CARD_FROM} where ${where}
      group by floor(p.lat / ${cell}), floor(p.lng / ${cell})`);
    return {
      total,
      clustered: true,
      features: rows.map(
        (r): MapCluster => ({
          kind: "cluster",
          lat: Number(r.lat),
          lng: Number(r.lng),
          count: Number(r.n),
          minPrice: Number(r.min_price),
          bbox: [Number(r.w), Number(r.s), Number(r.e), Number(r.nn)],
        }),
      ),
    };
  }

  async facets(q: SearchQuery): Promise<Facets> {
    const ctx = await this.resolveContext(q);
    const [types, beds, locs, price] = await Promise.all([
      this.db.execute<Row>(sql`select p.type as key, count(*)::int as n ${CARD_FROM} where ${this.buildWhere(q, ctx, { skip: ["types"] })} group by p.type order by n desc`),
      this.db.execute<Row>(sql`select least(p.beds, 6) as key, count(*)::int as n ${CARD_FROM} where ${this.buildWhere(q, ctx, { skip: ["beds"] })} and p.beds is not null group by 1 order by 1`),
      // children of the current location (areas/societies of a city, blocks of a society)
      ctx.location && ctx.location.kind !== "city"
        ? this.db.execute<Row>(sql`select b.slug, b.name, count(*)::int as n ${CARD_FROM} join locations b on b.kind = 'block' and b.ref_id = p.block_id where ${this.buildWhere(q, ctx)} group by b.slug, b.name order by n desc limit 12`)
        : ctx.city
          ? this.db.execute<Row>(sql`select x.slug, x.name, count(*)::int as n ${CARD_FROM} join locations x on x.kind in ('area','society') and x.ref_id = coalesce(p.society_id, p.area_id) where ${this.buildWhere(q, ctx, { skip: ["location"] })} group by x.slug, x.name order by n desc limit 12`)
          : this.db.execute<Row>(sql`select c.slug, c.name, count(*)::int as n ${CARD_FROM} where ${this.buildWhere(q, ctx)} group by c.slug, c.name order by n desc limit 12`),
      this.db.execute<Row>(sql`select min(l.price) as mn, max(l.price) as mx ${CARD_FROM} where ${this.buildWhere(q, ctx)}`),
    ]);
    return {
      types: types.map((r) => ({ key: r.key as string, count: Number(r.n) })),
      beds: beds.map((r) => ({ key: Number(r.key), count: Number(r.n) })),
      locations: locs.map((r) => ({ slug: r.slug as string, name: r.name as string, count: Number(r.n) })),
      priceRange: price[0]?.mn != null ? { min: Number(price[0].mn), max: Number(price[0].mx) } : null,
    };
  }

  async suggestLocations(term: string, limit = 8): Promise<LocationSuggestion[]> {
    const t = term.trim();
    if (!t) {
      const rows = await this.db.execute<Row>(sql`
        select l.id, l.kind, l.name, l.full_name, l.slug, c.slug as city_slug, l.active_listings
        from locations l left join cities c on c.id = l.city_id
        where l.kind in ('city','society','area') order by (l.kind = 'city') desc, l.active_listings desc limit ${limit}`);
      return rows.map(mapSuggestion);
    }
    const rows = await this.db.execute<Row>(sql`
      select l.id, l.kind, l.name, l.full_name, l.slug, c.slug as city_slug, l.active_listings,
        greatest(word_similarity(${t}, l.full_name), similarity(l.name, ${t})) as sim
      from locations l left join cities c on c.id = l.city_id
      where l.kind <> 'province' and (l.name ilike ${t + "%"} or l.full_name ilike ${"%" + t + "%"} or word_similarity(${t}, l.full_name) > 0.45)
      order by (l.name ilike ${t + "%"}) desc, sim desc,
        case l.kind when 'city' then 0 when 'society' then 1 when 'area' then 1 else 2 end, l.active_listings desc
      limit ${limit}`);
    return rows.map(mapSuggestion);
  }
}

function mapSuggestion(r: Row): LocationSuggestion {
  return {
    id: r.id as string,
    kind: r.kind as string,
    name: r.name as string,
    fullName: r.full_name as string,
    slug: r.slug as string,
    citySlug: (r.city_slug as string) ?? null,
    activeListings: Number(r.active_listings ?? 0),
  };
}

export function haversineSql(lat: number, lng: number): SQL {
  return sql`(6371 * 2 * asin(sqrt(power(sin(radians(p.lat - ${lat}) / 2), 2) + cos(radians(${lat})) * cos(radians(p.lat)) * power(sin(radians(p.lng - ${lng}) / 2), 2))))`;
}

export { TYPE_GROUPS };
