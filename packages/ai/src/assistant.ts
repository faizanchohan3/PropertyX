import { sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import type { ListingCard, ListingSearchEngine } from "@propertyx/search";
import { calculateFinancing, formatPKR, formatPriceWords, toSqft, fromSqft, PROPERTY_TYPE_LABELS, FEATURE_LABELS, type SearchQuery, type FeatureKey } from "@propertyx/shared";
import { parseQuery, describeCriteria, type AssistantCriteria, type LocationIndexEntry } from "./query-parser";
import { tryLLM, aiProviderName, type JsonSchema } from "./providers";

export interface RankedListing {
  listing: ListingCard;
  score: number;
  reasons: string[];
  caveats: string[];
}

export interface AssistantResponse {
  reply: string;
  criteria: AssistantCriteria;
  summary: string;
  total: number;
  results: RankedListing[];
  alternatives: { label: string; criteria: AssistantCriteria; results: RankedListing[]; total: number } | null;
  affordability: {
    budget: number;
    downPayment: number;
    monthlyPayment: number;
    tenureYears: number;
    rate: number;
    suggestedMonthlyIncome: number;
    note: string;
  } | null;
  recommendedLocations: { slug: string; name: string; medianPrice: number; listings: number }[];
  followUps: string[];
  suggestions: string[];
  provider: string;
  searchUrl: string;
}

let locationCache: { at: number; rows: LocationIndexEntry[] } | null = null;

export async function loadLocationIndex(db: Database): Promise<LocationIndexEntry[]> {
  if (locationCache && Date.now() - locationCache.at < 10 * 60_000) return locationCache.rows;
  const rows = await db.execute<{ slug: string; name: string; full_name: string; kind: string; city_slug: string | null; lat: number | null; lng: number | null }>(sql`
    select l.slug, l.name, l.full_name, l.kind, c.slug as city_slug, l.lat, l.lng
    from locations l left join cities c on c.id = l.city_id where l.kind <> 'province'`);
  locationCache = { at: Date.now(), rows: rows.map((r) => ({ slug: r.slug, name: r.name, fullName: r.full_name, kind: r.kind, citySlug: r.city_slug, lat: r.lat, lng: r.lng })) };
  return locationCache.rows;
}

function toSearch(c: AssistantCriteria, pageSize = 12): SearchQuery {
  const { locationLabel: _l, nearLabel: _n, monthlyIncome: _m, ...q } = c;
  return { ...q, pageSize, page: 1 } as SearchQuery;
}

async function featuresFor(db: Database, ids: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (!ids.length) return map;
  const rows = await db.execute<{ id: string; key: string }>(sql`
    select l.id, f.key from property_listings l join property_features pf on pf.property_id = l.property_id join features f on f.id = pf.feature_id
    where l.id in (${sql.join(
      ids.map((i) => sql`${i}`),
      sql`, `,
    )})`);
  for (const r of rows) {
    if (!map.has(r.id)) map.set(r.id, new Set());
    map.get(r.id)!.add(r.key);
  }
  return map;
}

/** Deterministic ranking + plain-language reasons. Facts come only from the listing record. */
export function rankListings(items: ListingCard[], c: AssistantCriteria, features: Map<string, Set<string>>): RankedListing[] {
  return items
    .map((l) => {
      const reasons: string[] = [];
      const caveats: string[] = [];
      let score = 50;
      if (c.priceMax != null) {
        if (l.price <= c.priceMax) {
          const headroom = (c.priceMax - l.price) / c.priceMax;
          score += 15 - Math.min(10, headroom * 20);
          reasons.push(`Within your ${formatPriceWords(c.priceMax)} budget at ${formatPKR(l.price)}${l.purpose === "rent" ? "/month" : ""}`);
        } else {
          score -= 15;
          caveats.push(`${formatPriceWords(l.price - c.priceMax)} above your budget`);
        }
      }
      if (c.areaMin != null && c.areaUnit) {
        const wanted = toSqft(c.areaMin, c.areaUnit);
        const diff = Math.abs(l.areaSqft - wanted) / wanted;
        if (diff <= 0.05) {
          score += 10;
          reasons.push(`${Math.round(fromSqft(l.areaSqft, c.areaUnit) * 10) / 10} ${c.areaUnit === "sqft" ? "sq ft" : c.areaUnit === "sqyd" ? "sq yd" : c.areaUnit} as requested`);
        } else if (l.areaSqft > wanted) reasons.push(`Larger than requested (${Math.round(fromSqft(l.areaSqft, c.areaUnit) * 10) / 10} ${c.areaUnit})`);
      }
      if (c.beds?.length && l.beds != null && c.beds.includes(Math.min(l.beds, 6))) {
        score += 6;
        reasons.push(l.beds === 0 ? "Studio layout" : `${l.beds} bedrooms`);
      }
      if (c.locationLabel && l.locationFullName) reasons.push(`Located in ${l.locationFullName}`);
      if (c.nearLabel && l.locationName) reasons.push(`Near ${c.nearLabel} (${l.locationName})`);
      const f = features.get(l.id) ?? new Set();
      for (const key of c.features ?? []) {
        if (f.has(key)) {
          score += 5;
          reasons.push(FEATURE_LABELS[key as FeatureKey] ?? key);
        }
      }
      if (!c.features?.includes("corner") && f.has("corner")) reasons.push("Corner property");
      if (!c.features?.includes("possession") && f.has("possession")) reasons.push("Possession available");
      if (l.verificationLevel >= 4) {
        score += 8;
        reasons.push("Verified property");
      } else if (l.verificationLevel === 0) caveats.push("Not yet verified — check documents carefully");
      if (l.priceReducedAt && l.previousPrice) {
        score += 4;
        reasons.push(`Price reduced by ${formatPriceWords(l.previousPrice - l.price)}`);
      }
      if (l.pricePerSqft && l.purpose === "sale") reasons.push(`PKR ${Math.round(l.pricePerSqft).toLocaleString("en-PK")} per sq ft`);
      const days = l.publishedAt ? (Date.now() - new Date(l.publishedAt).getTime()) / 86_400_000 : 99;
      if (days < 14) score += 4;
      return { listing: l, score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0, 6), caveats };
    })
    .sort((a, b) => b.score - a.score);
}

async function recommendLocations(db: Database, c: AssistantCriteria) {
  if (!c.city || c.priceMax == null) return [];
  const types = c.types?.length ? c.types : ["house"];
  const sqft = c.areaMin != null && c.areaUnit ? toSqft(c.areaMin, c.areaUnit) : null;
  const rows = await db.execute<{ slug: string; name: string; median: number; n: number }>(sql`
    select x.slug, x.name, percentile_cont(0.5) within group (order by l.price) as median, count(*)::int as n
    from property_listings l
    join properties p on p.id = l.property_id
    join cities ci on ci.id = p.city_id
    join locations x on x.kind in ('area','society') and x.ref_id = coalesce(p.society_id, p.area_id)
    where l.status = 'active' and ci.slug = ${c.city} and p.type::text in (${sql.join(
      types.map((t) => sql`${t}`),
      sql`, `,
    )})
      and l.purpose = ${c.purpose ?? "sale"}
      ${sqft ? sql`and p.area_sqft between ${sqft * 0.9} and ${sqft * 1.1}` : sql``}
    group by x.slug, x.name having count(*) >= 2
    order by median asc`);
  return rows
    .filter((r) => Number(r.median) <= c.priceMax! * 1.05 && r.slug !== c.location)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((r) => ({ slug: r.slug, name: r.name, medianPrice: Math.round(Number(r.median)), listings: Number(r.n) }));
}

const LLM_CRITERIA_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    purpose: { type: ["string", "null"], enum: ["sale", "rent", null] },
    types: { type: "array", items: { type: "string", enum: Object.keys(PROPERTY_TYPE_LABELS) } },
    city: { type: ["string", "null"], enum: ["lahore", "islamabad", "karachi", "rawalpindi", "multan", "faisalabad", "gujranwala", "peshawar", null] },
    locationName: { type: ["string", "null"] },
    near: { type: "boolean" },
    priceMin: { type: ["number", "null"] },
    priceMax: { type: ["number", "null"] },
    areaValue: { type: ["number", "null"] },
    areaUnit: { type: ["string", "null"], enum: ["marla", "kanal", "sqft", "sqyd", "acre", null] },
    bedsMin: { type: ["integer", "null"] },
    features: { type: "array", items: { type: "string", enum: Object.keys(FEATURE_LABELS) } },
    cheaper: { type: "boolean" },
  },
  required: ["purpose", "types", "city", "locationName", "near", "priceMin", "priceMax", "areaValue", "areaUnit", "bedsMin", "features", "cheaper"],
  additionalProperties: false,
};

type LLMCriteria = {
  purpose: "sale" | "rent" | null;
  types: string[];
  city: string | null;
  locationName: string | null;
  near: boolean;
  priceMin: number | null;
  priceMax: number | null;
  areaValue: number | null;
  areaUnit: "marla" | "kanal" | "sqft" | "sqyd" | "acre" | null;
  bedsMin: number | null;
  features: string[];
  cheaper: boolean;
};

/** Optional LLM pass for messages the rules parser can't fully understand. */
async function llmCriteria(message: string, previous: AssistantCriteria) {
  return tryLLM((llm) =>
    llm.generateJson<LLMCriteria>({
      schemaName: "property_search_criteria",
      schema: LLM_CRITERIA_SCHEMA,
      effort: "low",
      maxTokens: 2000,
      system:
        "You convert Pakistani property search requests into structured filters. Prices are in PKR: 1 lakh = 100,000; 1 crore = 10,000,000. Only extract what the user said; use null for anything not mentioned. Do not invent locations.",
      prompt: `Previous filters (JSON): ${JSON.stringify(previous)}\nUser message: ${message}\nReturn the complete updated filters.`,
    }),
  );
}

export async function runAssistant(db: Database, engine: ListingSearchEngine, input: { message: string; criteria?: AssistantCriteria; lastResultPrices?: number[] }): Promise<AssistantResponse> {
  const index = await loadLocationIndex(db);
  const previous = input.criteria ?? {};
  const parsed = parseQuery(input.message, previous, index);
  let c = parsed.criteria;

  // LLM enhancement: only fills gaps the rules parser left (never overrides resolved locations).
  const llm = parsed.changes.length < 2 && !parsed.intents.greeting && !parsed.intents.help ? await llmCriteria(input.message, previous) : null;
  if (llm) {
    if (llm.purpose && !c.purpose) c.purpose = llm.purpose;
    if (llm.types.length && !c.types?.length) c.types = llm.types as AssistantCriteria["types"];
    if (llm.city && !c.city) c.city = llm.city;
    if (llm.priceMax && c.priceMax == null) c.priceMax = llm.priceMax;
    if (llm.priceMin && c.priceMin == null) c.priceMin = llm.priceMin;
    if (llm.areaValue && llm.areaUnit && c.areaMin == null) {
      c.areaMin = llm.areaValue;
      c.areaMax = llm.areaValue;
      c.areaUnit = llm.areaUnit;
    }
    if (llm.bedsMin != null && !c.beds?.length) c.beds = Array.from({ length: 7 - Math.min(6, llm.bedsMin) }, (_, i) => Math.min(6, llm.bedsMin!) + i);
    if (llm.features.length) c.features = [...new Set([...(c.features ?? []), ...llm.features.filter((f) => f !== "installments")])];
    if (llm.cheaper) parsed.intents.cheaper = true;
    if (llm.locationName && !c.location && !c.nearLabel) {
      const match = await engine.suggestLocations(llm.locationName, 1);
      if (match[0] && (!c.city || match[0].citySlug === c.city)) {
        c.location = match[0].slug;
        c.locationLabel = match[0].name;
        c.city = match[0].citySlug ?? c.city;
      }
    }
  }

  // "show cheaper options": cap price below the median of what we showed last time
  if (parsed.intents.cheaper && input.lastResultPrices?.length) {
    const sorted = [...input.lastResultPrices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    c.priceMax = Math.min(c.priceMax ?? Infinity, Math.round(median * 0.9));
  }
  if (parsed.intents.bigger && c.areaMin != null) {
    c.areaMin = +(c.areaMin * 1.2).toFixed(1);
    c.areaMax = undefined;
  }

  const followUps: string[] = [];
  if (!c.city && !c.location && c.lat == null) followUps.push("Which city are you looking in? (e.g. Lahore, Islamabad, Karachi)");
  if (c.priceMax == null && c.priceMin == null) followUps.push(c.purpose === "rent" ? "What's your monthly rent budget?" : "What's your budget? (e.g. 1.5 crore)");
  if (!c.types?.length) followUps.push("What type of property — house, apartment, plot or commercial?");
  if (!c.purpose) followUps.push("Are you looking to buy or rent?");

  const fmt = (n: number) => formatPKR(n);
  const summary = describeCriteria(c, fmt);
  const provider = aiProviderName();

  if ((parsed.intents.greeting || parsed.intents.help) && !Object.keys(previous).length && parsed.changes.length === 0) {
    return {
      reply:
        "Assalam o Alaikum! Tell me what you're looking for in plain words — for example “5 marla house near DHA Lahore under 1.5 crore” or “2 bed apartment for rent in E-11 Islamabad”. I'll search live listings, explain why each one matches, and help you check affordability.",
      criteria: {},
      summary: "",
      total: 0,
      results: [],
      alternatives: null,
      affordability: null,
      recommendedLocations: [],
      followUps: [],
      suggestions: ["10 marla house in Lahore under 4 crore", "2 bed apartment for rent in Islamabad", "Plots on installments in Multan", "Shop for sale in Karachi"],
      provider,
      searchUrl: "/search",
    };
  }

  const result = await engine.search(toSearch(c));
  const feats = await featuresFor(db, result.items.map((i) => i.id));
  const ranked = rankListings(result.items, c, feats);

  // alternatives when results are thin
  let alternatives: AssistantResponse["alternatives"] = null;
  if (result.total < 4) {
    const attempts: { label: string; criteria: AssistantCriteria }[] = [];
    if (c.priceMax != null) attempts.push({ label: `Slightly above budget (up to ${formatPKR(Math.round(c.priceMax * 1.2))})`, criteria: { ...c, priceMax: Math.round(c.priceMax * 1.2) } });
    if (c.location || c.lat != null) attempts.push({ label: `Elsewhere in ${c.city ? c.city[0].toUpperCase() + c.city.slice(1) : "the city"}`, criteria: { ...c, location: undefined, locationLabel: undefined, lat: undefined, lng: undefined, radiusKm: undefined, nearLabel: undefined } });
    if (c.features?.length) attempts.push({ label: "Without the extra requirements", criteria: { ...c, features: undefined } });
    if (c.areaMin != null) attempts.push({ label: "Other sizes", criteria: { ...c, areaMin: undefined, areaMax: undefined } });
    for (const a of attempts) {
      const r = await engine.search(toSearch(a.criteria, 6));
      if (r.total > result.total) {
        const f2 = await featuresFor(db, r.items.map((i) => i.id));
        alternatives = { label: a.label, criteria: a.criteria, results: rankListings(r.items, a.criteria, f2), total: r.total };
        break;
      }
    }
  }

  let affordability: AssistantResponse["affordability"] = null;
  if ((c.purpose ?? "sale") === "sale" && c.priceMax != null && (parsed.intents.affordability || c.priceMax >= 3_000_000)) {
    const rate = 14;
    const tenureYears = 20;
    const down = Math.round(c.priceMax * 0.3);
    const fin = calculateFinancing({ propertyPrice: c.priceMax, downPayment: down, annualRate: rate, tenureYears, mode: "conventional" });
    affordability = {
      budget: c.priceMax,
      downPayment: down,
      monthlyPayment: fin.monthlyPayment,
      tenureYears,
      rate,
      suggestedMonthlyIncome: Math.round(fin.monthlyPayment / 0.4),
      note:
        c.monthlyIncome != null
          ? fin.monthlyPayment <= c.monthlyIncome * 0.4
            ? `With a monthly income of ${formatPKR(c.monthlyIncome)}, the estimated installment is within the commonly used 40% affordability guideline.`
            : `With a monthly income of ${formatPKR(c.monthlyIncome)}, the estimated installment is above the commonly used 40% affordability guideline — consider a larger down payment or a lower budget.`
          : "Estimate assumes 30% down payment, 14% annual rate and a 20-year tenure. Actual bank offers vary — this is not financial advice.",
    };
  }

  const recommendedLocations = await recommendLocations(db, c);

  let reply: string;
  if (result.total === 0) {
    reply = `I couldn't find active listings for ${summary}.${alternatives ? ` Here ${alternatives.total === 1 ? "is 1 option" : `are ${alternatives.total} options`} if we relax one requirement: ${alternatives.label[0].toLowerCase()}${alternatives.label.slice(1)}.` : " Try widening your budget or area."}`;
  } else {
    const prices = result.items.map((i) => i.price);
    reply = `Here ${result.total === 1 ? "is 1 matching property" : `are ${result.total} matching properties`} for ${summary}. ${prices.length > 1 ? `Prices in these results range from ${formatPKR(Math.min(...prices))} to ${formatPKR(Math.max(...prices))}.` : ""}`;
    if (ranked[0]) reply += ` The best match is “${ranked[0].listing.title}” — ${ranked[0].reasons.slice(0, 2).map((r, i) => (i === 0 ? r[0].toLowerCase() + r.slice(1) : r)).join("; ")}.`;
  }
  if (followUps.length && result.total > 20) reply += ` To narrow this down: ${followUps[0]}`;

  const suggestions = [
    "Show cheaper options",
    c.features?.includes("corner") ? "Remove corner" : "Only show corner properties",
    c.types?.some((x) => x.includes("plot")) ? "Only plots with possession" : "Show properties with possession",
    c.verified ? "Include unverified listings" : "Only verified listings",
  ];

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(toSearch(c, 24))) if (v != null && k !== "pageSize" && k !== "page") qs.set(k, Array.isArray(v) ? v.join(",") : String(v));

  return {
    reply,
    criteria: c,
    summary,
    total: result.total,
    results: ranked,
    alternatives,
    affordability,
    recommendedLocations,
    followUps,
    suggestions,
    provider,
    searchUrl: `/search?${qs.toString()}`,
  };
}
