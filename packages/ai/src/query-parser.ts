import { parsePrice, type SearchQuery, type AreaUnit, type PropertyType } from "@propertyx/shared";

/** Criteria accumulated across an assistant conversation. */
export interface AssistantCriteria extends Partial<SearchQuery> {
  /** human label of the location used ("DHA Lahore") */
  locationLabel?: string;
  /** "near X": search within radius of X instead of inside it */
  nearLabel?: string;
  /** monthly budget / income hints for affordability */
  monthlyIncome?: number;
}

export interface LocationIndexEntry {
  slug: string;
  name: string;
  fullName: string;
  kind: string;
  citySlug: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ParseResult {
  criteria: AssistantCriteria;
  changes: string[];
  intents: { affordability: boolean; reset: boolean; greeting: boolean; cheaper: boolean; bigger: boolean; help: boolean };
}

const TYPE_WORDS: [RegExp, PropertyType[]][] = [
  [/\bupper portions?\b/, ["upper_portion"]],
  [/\blower portions?\b/, ["lower_portion"]],
  [/\bportions?\b/, ["upper_portion", "lower_portion"]],
  [/\bpent ?house/, ["penthouse"]],
  [/\bfarm ?houses?\b/, ["farmhouse"]],
  [/\bvillas?\b/, ["villa", "house"]],
  [/\b(apartments?|flats?|condos?)\b/, ["apartment", "flat"]],
  [/\b(houses?|homes?|ghar|bungalows?|kothi)\b/, ["house"]],
  [/\brooms?\b(?! *(?:house|flat|apartment))/, ["room"]],
  [/\bcommercial plots?\b/, ["commercial_plot"]],
  [/\b(plot files?|files?)\b/, ["plot_file"]],
  [/\b(agricultural|agri|farm ?land|zameen|acres? of land)\b/, ["agricultural_land"]],
  [/\b(residential )?plots?\b/, ["residential_plot"]],
  [/\boffices?\b/, ["office"]],
  [/\b(shops?|dukaan|dukan|outlets?)\b/, ["shop"]],
  [/\b(warehouses?|godowns?|godams?)\b/, ["warehouse"]],
  [/\bfactor(y|ies)\b/, ["factory"]],
  [/\b(buildings?|plaza)\b/, ["building"]],
];

const FEATURE_WORDS: [RegExp, string][] = [
  [/\bcorner\b/, "corner"],
  [/\bpark[- ]?facing\b|\bfacing (a )?park\b/, "park_facing"],
  [/\bmain boulevard\b|\bboulevard\b/, "main_boulevard"],
  [/\bpossession\b/, "possession"],
  [/\binstall?ments?\b|\bqist\b|\bon easy installments\b/, "installments"],
  [/\bready to move\b|\bready\b/, "ready_to_move"],
  [/\bbasement\b/, "basement"],
  [/\bservant quarters?\b/, "servant_quarter"],
  [/\bgarage\b/, "garage"],
  [/\bsolar\b/, "solar"],
  [/\b(sui )?gas\b/, "gas"],
  [/\bgated\b/, "gated_community"],
  [/\b(swimming )?pool\b/, "swimming_pool"],
  [/\bgym\b/, "gym"],
  [/\b(lift|elevator)\b/, "elevator"],
  [/\b(generator|backup power)\b/, "backup_generator"],
  [/\bcctv\b/, "cctv"],
  [/\bparking\b/, "parking"],
];

const CITY_ALIASES: Record<string, string> = {
  lahore: "lahore",
  lhr: "lahore",
  islamabad: "islamabad",
  isb: "islamabad",
  isloo: "islamabad",
  karachi: "karachi",
  khi: "karachi",
  rawalpindi: "rawalpindi",
  pindi: "rawalpindi",
  rwp: "rawalpindi",
  multan: "multan",
  faisalabad: "faisalabad",
  fsd: "faisalabad",
  lyallpur: "faisalabad",
  gujranwala: "gujranwala",
  peshawar: "peshawar",
  pesh: "peshawar",
};

const AMOUNT = String.raw`(\d+(?:[.,]\d+)?)\s*(arab|crores?|cr|caror|karor|lakhs?|lacs?|lac|lak|l|million|mn|m|thousand|k|hazar)?\b`;

function amount(n: string, unit?: string) {
  return parsePrice(`${n.replace(/,/g, "")} ${unit ?? ""}`.trim());
}

/** Normalise loose user text. */
function norm(text: string) {
  return ` ${text.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ")} `;
}

export function findLocation(text: string, index: LocationIndexEntry[], citySlug?: string): { entry: LocationIndexEntry; near: boolean } | null {
  const t = norm(text);
  let best: LocationIndexEntry | null = null;
  let bestLen = 0;
  for (const e of index) {
    if (e.kind === "province" || e.kind === "city") continue;
    const names = [e.name.toLowerCase()];
    // "dha" / "bahria" shorthand resolved against the chosen city
    const short = e.name.toLowerCase().replace(/ (lahore|karachi|islamabad|rawalpindi|multan|peshawar|faisalabad|gujranwala)$/, "");
    if (short !== names[0] && (!citySlug || e.citySlug === citySlug)) names.push(short);
    for (const n of names) {
      if (n.length < 3) continue;
      const re = new RegExp(`[^a-z0-9]${n.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&").replace(/\s+/g, "[\\s-]*")}[^a-z0-9]`);
      if (re.test(t)) {
        // prefer longer match; among equals prefer requested city, then society/area over block
        const score = n.length * 10 + (citySlug && e.citySlug === citySlug ? 5 : 0) + (e.kind === "block" ? 0 : 2);
        if (score > bestLen) {
          best = e;
          bestLen = score;
        }
      }
    }
  }
  if (!best) return null;
  const firstWord = best.name.toLowerCase().split(" ")[0];
  const near = new RegExp(`\\b(near|close to|nearby|around|next to|qareeb)\\b[^.]{0,12}${firstWord}`).test(t);
  return { entry: best, near };
}

export function parseQuery(message: string, previous: AssistantCriteria, index: LocationIndexEntry[]): ParseResult {
  const t = norm(message);
  const changes: string[] = [];
  const intents = {
    affordability: /\b(afford|loan|mortgage|financ|emi|monthly payment|salary|income)\b/.test(t),
    reset: /\b(start over|reset|new search|clear (all|filters))\b/.test(t),
    greeting: /^\s*(hi|hello|salam|assalam|aoa|hey)\b/.test(t.trim()) && t.trim().split(" ").length <= 4,
    cheaper: /\b(cheaper|less expensive|lower (price|budget)|more affordable|budget friendly)\b/.test(t),
    bigger: /\b(bigger|larger|more space|spacious)\b/.test(t),
    help: /\b(what can you do|how does this work|help)\b/.test(t),
  };
  const c: AssistantCriteria = intents.reset ? {} : { ...previous };

  // purpose
  if (/\b(for rent|on rent|to rent|rent(al)?|kiraye?|kiraya|lease|tenant)\b/.test(t)) {
    if (c.purpose !== "rent") changes.push("purpose:rent");
    c.purpose = "rent";
  } else if (/\b(buy|purchase|for sale|khareed|invest|own)\b/.test(t)) {
    if (c.purpose !== "sale") changes.push("purpose:sale");
    c.purpose = "sale";
  }

  // types (only replace when the message mentions a type)
  const types = new Set<PropertyType>();
  for (const [re, ts] of TYPE_WORDS) if (re.test(t)) ts.forEach((x) => types.add(x));
  if (types.has("residential_plot") && types.has("commercial_plot") && !/\bresidential\b/.test(t)) types.delete("residential_plot");
  if (types.size) {
    c.types = [...types];
    changes.push("types");
  }
  if (c.types?.some((x) => ["residential_plot", "commercial_plot", "plot_file", "agricultural_land"].includes(x)) && !c.purpose) c.purpose = "sale";

  // city
  for (const [alias, slug] of Object.entries(CITY_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(t)) {
      if (c.city !== slug) {
        changes.push("city");
        // switching city invalidates a location from another city
        if (c.location) {
          const prevLoc = index.find((e) => e.slug === c.location);
          if (prevLoc && prevLoc.citySlug !== slug) {
            delete c.location;
            delete c.locationLabel;
          }
        }
      }
      c.city = slug;
      break;
    }
  }

  // location
  const loc = findLocation(message, index, c.city);
  if (loc) {
    if (loc.near && loc.entry.lat != null && loc.entry.lng != null) {
      c.lat = loc.entry.lat;
      c.lng = loc.entry.lng;
      c.radiusKm = loc.entry.kind === "block" ? 3 : 6;
      c.nearLabel = loc.entry.name;
      delete c.location;
      delete c.locationLabel;
    } else {
      c.location = loc.entry.slug;
      c.locationLabel = loc.entry.name;
      delete c.lat;
      delete c.lng;
      delete c.radiusKm;
      delete c.nearLabel;
    }
    if (loc.entry.citySlug) c.city = loc.entry.citySlug;
    changes.push("location");
  }

  // price
  const between = t.match(new RegExp(String.raw`(?:between|from)\s+${AMOUNT}\s*(?:and|to|-)\s*${AMOUNT}`));
  const range = between ?? t.match(new RegExp(String.raw`\b${AMOUNT}\s*(?:to|-)\s*${AMOUNT}`));
  const maxM = t.match(new RegExp(String.raw`\b(?:under|below|upto|up to|within|max(?:imum)?|less than|not more than|budget(?: is| of)?|tak)\s*(?:rs\.?|pkr)?\s*${AMOUNT}`));
  const minM = t.match(new RegExp(String.raw`\b(?:above|over|more than|min(?:imum)?|at least|starting)\s*(?:rs\.?|pkr)?\s*${AMOUNT}`));
  const aroundM = t.match(new RegExp(String.raw`\b(?:around|about|approx(?:imately)?|roughly|~)\s*(?:rs\.?|pkr)?\s*${AMOUNT}`));
  const budgetM = t.match(new RegExp(String.raw`${AMOUNT}\s*(?:budget|ka budget)`));
  const isMoney = (unit?: string, n?: string) => !!unit && !/^(m)$/.test(unit) ? true : Number((n ?? "0").replace(/,/g, "")) >= 10_000;
  if (range && isMoney(range[2], range[1]) && isMoney(range[4], range[3])) {
    const lo = amount(range[1], range[2] ?? range[4]);
    const hi = amount(range[3], range[4]);
    if (lo && hi) {
      c.priceMin = Math.min(lo, hi);
      c.priceMax = Math.max(lo, hi);
      changes.push("price");
    }
  } else {
    const m = maxM ?? budgetM;
    if (m && isMoney(m[2], m[1])) {
      const v = amount(m[1], m[2]);
      if (v) {
        c.priceMax = v;
        changes.push("price");
      }
    }
    if (minM && isMoney(minM[2], minM[1])) {
      const v = amount(minM[1], minM[2]);
      if (v) {
        c.priceMin = v;
        changes.push("price");
      }
    }
    if (aroundM && isMoney(aroundM[2], aroundM[1])) {
      const v = amount(aroundM[1], aroundM[2]);
      if (v) {
        c.priceMin = Math.round(v * 0.85);
        c.priceMax = Math.round(v * 1.15);
        changes.push("price");
      }
    }
  }

  // size
  const sizeM = t.match(/(\d+(?:\.\d+)?)\s*(marlas?|kanals?|sq\.? ?ft|square feet|sqft|sq\.? ?yards?|sq\.? ?yds?|square yards?|yards?|gaz|acres?)\b/);
  if (sizeM) {
    const v = Number(sizeM[1]);
    const u = sizeM[2];
    const unit: AreaUnit = /marla/.test(u) ? "marla" : /kanal/.test(u) ? "kanal" : /acre/.test(u) ? "acre" : /(yard|yd|gaz)/.test(u) ? "sqyd" : "sqft";
    const tol = unit === "sqft" ? 0.15 : 0;
    const atLeast = new RegExp(`(at least|minimum|min|more than|above)\\s*${sizeM[1]}`).test(t);
    c.areaUnit = unit;
    c.areaMin = atLeast ? v : +(v * (1 - tol)).toFixed(2);
    c.areaMax = atLeast ? undefined : +(v * (1 + tol)).toFixed(2);
    changes.push("size");
  }

  // beds / baths
  if (/\bstudio\b/.test(t)) {
    c.beds = [0];
    changes.push("beds");
  } else {
    const b = t.match(/(\d+)\s*(?:\+\s*)?(?:beds?|bedrooms?|bhk|br\b|rooms?\b(?! (?:flat|apartment|house)))/);
    if (b) {
      const n = Math.min(6, Number(b[1]));
      const plus = new RegExp(`(\\d+)\\s*\\+|at least ${b[1]}|minimum ${b[1]}|${b[1]} or more`).test(t);
      c.beds = plus ? Array.from({ length: 7 - n }, (_, i) => n + i) : [n];
      changes.push("beds");
    }
  }
  const baths = t.match(/(\d+)\s*(?:baths?|bathrooms?|washrooms?)/);
  if (baths) {
    c.bathsMin = Number(baths[1]);
    changes.push("baths");
  }

  // furnishing / condition
  if (/\bsemi[- ]?furnished\b/.test(t)) c.furnishing = "semi_furnished";
  else if (/\bunfurnished\b/.test(t)) c.furnishing = "unfurnished";
  else if (/\bfurnished\b/.test(t)) c.furnishing = "furnished";
  if (/\b(brand new|new construction|newly built)\b/.test(t)) c.condition = "brand_new";
  if (/\b(include unverified|unverified too|all listings)\b/.test(t)) delete c.verified;
  else if (/\bverified\b/.test(t)) c.verified = true;

  // features (add / remove)
  const feats = new Set(c.features ?? []);
  for (const [re, key] of FEATURE_WORDS) {
    const negated = new RegExp(`\\b(without|no|remove|don'?t need|dont need|exclude)\\s+(?:the\\s+)?${re.source.replace(/^\\b/, "")}`).test(t);
    if (negated) {
      if (feats.delete(key)) changes.push(`-${key}`);
    } else if (re.test(t)) {
      if (key === "installments") {
        c.installments = true;
      } else if (key === "gas" && !/\bgas\b/.test(t.replace(/sui gas/, "gas"))) continue;
      else feats.add(key);
      changes.push(`+${key}`);
    }
  }
  if (/\b(only|just)\b.*\bcorner\b/.test(t)) feats.add("corner");
  c.features = [...feats];
  if (!c.features.length) delete c.features;

  // infer purpose from the budget when the user didn't say buy or rent
  if (!c.purpose && c.priceMax != null) {
    if (c.priceMax >= 2_000_000) c.purpose = "sale";
    else if (c.priceMax <= 600_000 && !c.types?.some((x) => /plot|land|file/.test(x))) c.purpose = "rent";
  }

  // refinements relative to previous results
  if (intents.cheaper) {
    c.sort = "price_asc";
    changes.push("cheaper");
  }
  if (/\b(newest|latest|recent)\b/.test(t)) c.sort = "newest";
  if (/\b(most expensive|luxury|premium)\b/.test(t)) c.sort = "price_desc";

  // income for affordability
  const income = t.match(new RegExp(String.raw`(?:salary|income|earn(?:ing)?)\s*(?:is|of)?\s*(?:rs\.?|pkr)?\s*${AMOUNT}`));
  if (income) {
    const v = amount(income[1], income[2]);
    if (v) c.monthlyIncome = v;
  }

  return { criteria: c, changes, intents };
}

/** One-line human description of the criteria: "10 Marla houses for sale in DHA Lahore under PKR 2 Crore" */
export function describeCriteria(c: AssistantCriteria, fmt: (n: number) => string): string {
  const typeNames: Record<string, string> = {
    house: "houses",
    apartment: "apartments",
    flat: "flats",
    residential_plot: "plots",
    commercial_plot: "commercial plots",
    plot_file: "plot files",
    agricultural_land: "agricultural land",
    farmhouse: "farmhouses",
    upper_portion: "upper portions",
    lower_portion: "lower portions",
    penthouse: "penthouses",
    villa: "villas",
    room: "rooms",
    office: "offices",
    shop: "shops",
    warehouse: "warehouses",
    factory: "factories",
    building: "buildings",
  };
  const parts: string[] = [];
  if (c.areaMin != null && c.areaUnit) parts.push(`${c.areaMax && c.areaMax !== c.areaMin && c.areaUnit === "sqft" ? "~" : ""}${Math.round(((c.areaMin + (c.areaMax ?? c.areaMin)) / 2) * 100) / 100} ${c.areaUnit === "sqft" ? "sq ft" : c.areaUnit === "sqyd" ? "sq yd" : c.areaUnit[0].toUpperCase() + c.areaUnit.slice(1)}${c.areaMax == null ? "+" : ""}`);
  if (c.beds?.length) parts.push(c.beds[0] === 0 ? "studio" : `${c.beds[0]}${c.beds.length > 1 ? "+" : ""} bed`);
  if (c.features?.includes("corner")) parts.push("corner");
  const typeLabel = c.types?.length ? [...new Set(c.types.map((x) => typeNames[x] ?? x))].join(" / ") : "properties";
  parts.push(typeLabel);
  parts.push(c.purpose === "rent" ? "for rent" : c.purpose === "sale" ? "for sale" : "");
  if (c.nearLabel) parts.push(`near ${c.nearLabel}`);
  else if (c.locationLabel) parts.push(`in ${c.locationLabel}`);
  else if (c.city) parts.push(`in ${c.city[0].toUpperCase()}${c.city.slice(1)}`);
  if (c.priceMin != null && c.priceMax != null) parts.push(`between ${fmt(c.priceMin)} and ${fmt(c.priceMax)}`);
  else if (c.priceMax != null) parts.push(`under ${fmt(c.priceMax)}`);
  else if (c.priceMin != null) parts.push(`above ${fmt(c.priceMin)}`);
  const extras = (c.features ?? []).filter((f) => f !== "corner").map((f) => f.replace(/_/g, " "));
  if (c.installments) extras.push("installments");
  if (extras.length) parts.push(`with ${extras.join(", ")}`);
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ");
}
