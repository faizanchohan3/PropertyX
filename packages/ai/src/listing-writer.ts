import { PROPERTY_TYPE_LABELS, FEATURE_LABELS, formatArea, formatPKR, propertyTypeInfo, type AreaUnit, type FeatureKey } from "@propertyx/shared";
import { tryLLM, type JsonSchema } from "./providers";

export interface ListingDraft {
  purpose: "sale" | "rent";
  type: string;
  areaValue?: number | null;
  areaUnit?: AreaUnit | null;
  beds?: number | null;
  baths?: number | null;
  floors?: number | null;
  floorNumber?: number | null;
  yearBuilt?: number | null;
  furnishing?: string | null;
  condition?: string | null;
  features?: string[];
  price?: number | null;
  locationName?: string | null;
  blockName?: string | null;
  cityName?: string | null;
  installmentAvailable?: boolean;
  /** seller's own notes — used as source material, never contradicted */
  notes?: string | null;
  imageCount?: number;
  hasFloorPlan?: boolean;
  hasVideo?: boolean;
  hasCoordinates?: boolean;
  description?: string | null;
  title?: string | null;
}

export interface ListingCopy {
  title: string;
  description: string;
  highlights: string[];
  source: "rules" | string;
}

export interface MissingInfo {
  field: string;
  severity: "required" | "recommended";
  message: string;
}

/** Checks a draft for gaps that reduce buyer trust and search ranking. */
export function detectMissingInfo(d: ListingDraft): MissingInfo[] {
  const out: MissingInfo[] = [];
  const info = propertyTypeInfo(d.type);
  const rooms = info?.hasRooms && d.type !== "room";
  if (!d.price) out.push({ field: "price", severity: "required", message: "Add the asking price." });
  if (!d.areaValue) out.push({ field: "area", severity: "required", message: "Add the plot or covered area." });
  if (!d.locationName) out.push({ field: "location", severity: "required", message: "Choose the area or society." });
  if (rooms && d.beds == null) out.push({ field: "beds", severity: "required", message: "Add the number of bedrooms." });
  if (rooms && d.baths == null) out.push({ field: "baths", severity: "recommended", message: "Add the number of bathrooms." });
  if ((d.imageCount ?? 0) < 5) out.push({ field: "images", severity: "recommended", message: `Listings with 5+ photos get more enquiries — you have ${d.imageCount ?? 0}.` });
  if (!d.hasCoordinates) out.push({ field: "map", severity: "recommended", message: "Drop a pin on the map so buyers can see the exact area." });
  if (rooms && !d.yearBuilt && d.condition !== "under_construction") out.push({ field: "yearBuilt", severity: "recommended", message: "Add the year the property was built." });
  if (rooms && !d.furnishing) out.push({ field: "furnishing", severity: "recommended", message: "Specify whether it is furnished." });
  if (!d.features?.length) out.push({ field: "features", severity: "recommended", message: "Select amenities such as gas, electricity, parking." });
  if (rooms && !d.hasFloorPlan) out.push({ field: "floorPlan", severity: "recommended", message: "A floor plan helps buyers understand the layout." });
  if (info?.category === "plot" && !d.features?.includes("possession")) out.push({ field: "possession", severity: "recommended", message: "State whether possession is available." });
  if (d.description && d.description.length < 150) out.push({ field: "description", severity: "recommended", message: "Expand the description to at least 150 characters." });
  if (d.description && /\b(urgent|guaranteed profit|100% safe|send advance|token now)\b/i.test(d.description)) out.push({ field: "description", severity: "required", message: "Remove pressure or guarantee language — it is flagged by our safety filters." });
  return out;
}

function rulesCopy(d: ListingDraft): ListingCopy {
  const typeLabel = PROPERTY_TYPE_LABELS[d.type as keyof typeof PROPERTY_TYPE_LABELS] ?? "Property";
  const size = d.areaValue && d.areaUnit ? formatArea(d.areaValue, d.areaUnit) : "";
  const where = [d.blockName, d.locationName].filter(Boolean).join(", ") || d.cityName || "";
  const f = new Set(d.features ?? []);
  const adj = [d.condition === "brand_new" ? "Brand New" : "", f.has("corner") ? "Corner" : "", f.has("park_facing") && !f.has("corner") ? "Park Facing" : "", d.furnishing === "furnished" ? "Furnished" : ""].filter(Boolean).slice(0, 2);
  const bedsPart = (d.type === "apartment" || d.type === "flat" || d.type === "penthouse") && d.beds != null ? (d.beds === 0 ? "Studio " : `${d.beds} Bed `) : "";
  const title = `${d.type === "apartment" || d.type === "flat" ? "" : size + " "}${adj.join(" ")} ${bedsPart}${typeLabel} for ${d.purpose === "sale" ? "Sale" : "Rent"}${where ? ` in ${where}` : ""}`.replace(/\s+/g, " ").trim().slice(0, 120);

  const paras: string[] = [];
  const rooms = d.beds != null ? `${d.beds === 0 ? "a studio layout" : `${d.beds} bedroom${d.beds === 1 ? "" : "s"}`}${d.baths ? ` and ${d.baths} bathroom${d.baths === 1 ? "" : "s"}` : ""}` : "";
  paras.push(`${size ? `This ${size.toLowerCase()} ` : "This "}${typeLabel.toLowerCase()}${where ? ` in ${where}${d.cityName && !where.includes(d.cityName) ? `, ${d.cityName}` : ""}` : ""} is available ${d.purpose === "sale" ? "for sale" : "for rent"}${rooms ? ` with ${rooms}` : ""}.`);
  const detail: string[] = [];
  if (d.floors) detail.push(`${d.floors} floor${d.floors > 1 ? "s" : ""}`);
  if (d.floorNumber != null && (d.type === "apartment" || d.type === "flat" || d.type === "penthouse")) detail.push(`located on floor ${d.floorNumber}`);
  if (d.yearBuilt) detail.push(`built in ${d.yearBuilt}`);
  if (d.furnishing) detail.push(d.furnishing.replace("_", "-"));
  if (detail.length) paras.push(`The property is ${detail.join(", ")}.`);
  const amenities = [...f].filter((k) => !["corner", "park_facing", "main_boulevard"].includes(k)).map((k) => FEATURE_LABELS[k as FeatureKey]?.toLowerCase()).filter(Boolean);
  if (amenities.length) paras.push(`Features include ${amenities.slice(0, 10).join(", ")}.`);
  if (d.notes?.trim()) paras.push(d.notes.trim());
  if (d.installmentAvailable) paras.push("Installment options are available — contact for the payment schedule.");
  if (d.price) paras.push(`Asking ${d.purpose === "rent" ? "rent" : "price"}: ${formatPKR(d.price)}${d.purpose === "rent" ? " per month" : ""}.`);
  paras.push("Contact through Bismillah to arrange a visit.");

  const highlights = [f.has("corner") && "Corner property", f.has("park_facing") && "Park facing", d.condition === "brand_new" && "Brand new construction", f.has("possession") && "Possession available", d.installmentAvailable && "Installments available", d.furnishing === "furnished" && "Fully furnished", f.has("solar") && "Solar installed", f.has("main_boulevard") && "On main boulevard"].filter(Boolean) as string[];
  return { title, description: paras.join("\n\n"), highlights: highlights.slice(0, 5), source: "rules" };
}

const COPY_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
  },
  required: ["title", "description", "highlights"],
  additionalProperties: false,
};

/** AI listing copywriter. The LLM may only rephrase facts supplied in the draft. */
export async function generateListingCopy(d: ListingDraft): Promise<ListingCopy> {
  const base = rulesCopy(d);
  const llm = await tryLLM((p) =>
    p.generateJson<{ title: string; description: string; highlights: string[] }>({
      schemaName: "listing_copy",
      schema: COPY_SCHEMA,
      effort: "low",
      maxTokens: 3000,
      system:
        "You write clear, honest Pakistani real-estate listing copy in English. Use ONLY the facts provided. Never invent amenities, distances, prices, legal status, ownership, returns or availability. No exaggeration, no urgency or guarantee language. Title max 100 characters. Description 120-250 words in 2-4 short paragraphs. Up to 5 short highlights, each a fact from the input.",
      prompt: `Facts (JSON):\n${JSON.stringify({ ...d, title: undefined, description: undefined })}\n\nA plain draft for reference:\n${base.title}\n${base.description}`,
    }),
  );
  if (llm && llm.title && llm.description) {
    return { title: llm.title.slice(0, 120), description: llm.description.slice(0, 5000), highlights: llm.highlights.slice(0, 5).map((h) => h.slice(0, 100)), source: "llm" };
  }
  return base;
}
