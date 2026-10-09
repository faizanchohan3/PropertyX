import { PROPERTY_TYPE_LABELS, propertyTypeInfo, toSqft, formatArea, type AreaUnit, type PropertyType, type Purpose } from "@propertyx/shared";
import type { CitySeed, LocSeed } from "./data/locations";
import { IMG } from "./data/images";
import type { Rng } from "./rng";

export interface GeneratedListing {
  type: PropertyType;
  purpose: Purpose;
  areaValue: number;
  areaUnit: AreaUnit;
  areaSqft: number;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  floors: number | null;
  floorNumber: number | null;
  yearBuilt: number | null;
  furnishing: "furnished" | "semi_furnished" | "unfurnished" | null;
  condition: "brand_new" | "good" | "old" | "under_construction" | null;
  features: string[];
  price: number;
  rentPeriod: "monthly" | null;
  installment: { advance: number; monthly: number; remaining: number } | null;
  title: string;
  description: string;
  highlights: string[];
  images: { url: string; kind: "image" | "floor_plan" }[];
  lat: number;
  lng: number;
  address: string;
}

const SALE_SHARE: Record<PropertyType, number> = {
  house: 0.72,
  flat: 0.5,
  apartment: 0.55,
  upper_portion: 0.12,
  lower_portion: 0.12,
  room: 0,
  farmhouse: 0.8,
  villa: 0.75,
  penthouse: 0.7,
  residential_plot: 1,
  commercial_plot: 1,
  plot_file: 1,
  agricultural_land: 0.92,
  office: 0.45,
  shop: 0.6,
  warehouse: 0.45,
  factory: 0.7,
  building: 0.8,
  other: 0.8,
};

function roundPrice(p: number, purpose: Purpose) {
  if (purpose === "rent") return p >= 200_000 ? Math.round(p / 10_000) * 10_000 : Math.round(p / 1_000) * 1_000;
  if (p >= 10_000_000) return Math.round(p / 500_000) * 500_000;
  if (p >= 1_000_000) return Math.round(p / 50_000) * 50_000;
  return Math.round(p / 10_000) * 10_000;
}

/** Size options in local units, with weights favouring common sizes. */
function pickSize(rng: Rng, type: PropertyType, city: CitySeed, loc: LocSeed): { value: number; unit: AreaUnit } {
  const karachi = city.unit === "sqyd";
  const premium = loc.house >= 5_000_000;
  switch (type) {
    case "house":
    case "villa":
    case "upper_portion":
    case "lower_portion":
      if (karachi) return { value: rng.pick(premium ? [240, 300, 400, 500, 500, 1000] : [120, 125, 160, 200, 240, 400]), unit: "sqyd" };
      if (type === "house" && rng.chance(premium ? 0.3 : 0.08)) return { value: rng.pick([1, 1, 2]), unit: "kanal" };
      return { value: rng.pick(premium ? [5, 10, 10, 20] : [3, 5, 5, 5, 7, 8, 10, 10, 12]), unit: "marla" };
    case "residential_plot":
    case "plot_file":
      if (karachi) return { value: rng.pick([120, 125, 200, 240, 272, 500, 1000]), unit: "sqyd" };
      return { value: rng.pick([3, 5, 5, 7, 8, 10, 10, 20, 20, 40]), unit: "marla" };
    case "commercial_plot":
      return karachi ? { value: rng.pick([100, 133, 200, 400]), unit: "sqyd" } : { value: rng.pick([2, 4, 4, 8, 8]), unit: "marla" };
    case "agricultural_land":
      return { value: rng.pick([1, 2, 4, 5, 8, 12, 25]), unit: "acre" };
    case "farmhouse":
      return { value: rng.pick([2, 4, 4, 8]), unit: "kanal" };
    case "factory":
      return { value: rng.pick([4, 8, 10, 20]), unit: "kanal" };
    case "building":
      return { value: rng.pick([5, 8, 10]), unit: "marla" };
    case "warehouse":
      return { value: rng.pick([5_000, 8_000, 12_000, 20_000, 35_000]), unit: "sqft" };
    case "office":
      return { value: rng.pick([350, 500, 800, 1_200, 2_000, 3_500]), unit: "sqft" };
    case "shop":
      return { value: rng.pick([160, 220, 300, 450, 700, 1_100]), unit: "sqft" };
    case "room":
      return { value: rng.pick([150, 180, 220]), unit: "sqft" };
    case "penthouse":
      return { value: rng.pick([3_200, 3_800, 4_500, 5_200]), unit: "sqft" };
    case "flat":
    case "apartment":
    default:
      return { value: 0, unit: "sqft" }; // decided from beds
  }
}

const AMENITY_POOLS: Record<string, string[]> = {
  home: ["drawing_room", "dining_room", "store_room", "lawn", "terrace", "servant_quarter", "garage", "parking", "electricity", "gas", "water", "sewerage", "solar", "cctv", "double_glazed", "internet", "mosque_nearby", "school_nearby", "market_nearby", "hospital_nearby", "study_room", "basement", "central_ac"],
  apartment: ["elevator", "backup_generator", "parking", "security", "cctv", "gym", "swimming_pool", "electricity", "gas", "water", "internet", "maintenance_staff", "central_ac", "market_nearby", "mosque_nearby"],
  plot: ["electricity", "gas", "water", "sewerage", "possession", "mosque_nearby", "school_nearby", "market_nearby"],
  commercial: ["elevator", "backup_generator", "parking", "security", "cctv", "electricity", "water", "central_ac", "internet"],
  land: ["water", "electricity"],
};

function locationIntro(rng: Rng, loc: LocSeed, city: CitySeed, block?: string) {
  const where = block ? `${block}, ${loc.name}` : loc.name;
  return rng.pick([
    `Located in ${where}, ${city.name}`,
    `Situated in a well-connected part of ${where}, ${city.name}`,
    `Set in ${where}, one of ${city.name}'s ${loc.kind === "society" ? "planned communities" : "established neighbourhoods"}`,
  ]);
}

export function generateListing(rng: Rng, city: CitySeed, loc: LocSeed, type: PropertyType, block: string | undefined, now: Date, forcePurpose?: Purpose): GeneratedListing {
  const info = propertyTypeInfo(type)!;
  // always draw, so the default seed sequence is unchanged when forcePurpose is set
  const rolledSale = rng.chance(SALE_SHARE[type]);
  let purpose: Purpose = forcePurpose ?? (rolledSale ? "sale" : "rent");
  let { value: areaValue, unit: areaUnit } = pickSize(rng, type, city, loc);

  let beds: number | null = null;
  let baths: number | null = null;
  let floors: number | null = null;
  let floorNumber: number | null = null;
  let parking: number | null = null;
  let yearBuilt: number | null = null;
  let furnishing: GeneratedListing["furnishing"] = null;
  let condition: GeneratedListing["condition"] = null;

  const marla = areaUnit === "sqyd" ? (areaValue * 9) / 225 : areaUnit === "kanal" ? areaValue * 20 : areaUnit === "marla" ? areaValue : toSqft(areaValue, areaUnit) / 225;

  if (type === "flat" || type === "apartment") {
    beds = rng.pick([0, 1, 1, 2, 2, 2, 3, 3, 4]);
    const base = [480, 720, 1_150, 1_750, 2_600][beds];
    areaValue = Math.round((base * rng.noise(0.12)) / 10) * 10;
    areaUnit = "sqft";
    baths = Math.max(1, beds + (beds >= 2 && rng.chance(0.5) ? 1 : 0));
    floorNumber = rng.int(1, 18);
    parking = rng.chance(0.7) ? 1 : 0;
  } else if (type === "penthouse") {
    beds = rng.int(3, 5);
    baths = beds + 1;
    floorNumber = rng.int(12, 30);
    parking = 2;
  } else if (info.hasRooms && type !== "room") {
    const m = marla;
    beds = m <= 3 ? rng.int(2, 3) : m <= 5 ? rng.int(3, 4) : m <= 8 ? 4 : m <= 12 ? rng.int(4, 5) : m <= 20 ? rng.int(5, 6) : rng.int(6, 7);
    if (type === "upper_portion" || type === "lower_portion") beds = Math.max(2, Math.ceil(beds / 2));
    if (type === "farmhouse") beds = rng.int(3, 6);
    baths = beds + (rng.chance(0.6) ? 1 : 0);
    floors = type === "house" || type === "villa" ? (m <= 3 ? rng.pick([1, 2]) : rng.pick([2, 2, 2, 3])) : 1;
    parking = m >= 10 ? rng.int(2, 4) : m >= 5 ? rng.int(1, 2) : rng.int(0, 1);
  } else if (type === "room") {
    beds = 1;
    baths = 1;
  }

  if (beds != null || ["office", "shop", "warehouse", "factory", "building"].includes(type)) {
    condition = rng.weighted({ brand_new: 3, good: 5, old: 2, under_construction: purpose === "sale" ? 0.6 : 0 });
    const age = condition === "brand_new" ? rng.int(0, 1) : condition === "good" ? rng.int(2, 12) : condition === "old" ? rng.int(13, 35) : 0;
    yearBuilt = condition === "under_construction" ? null : now.getFullYear() - age;
  }
  if (beds != null) furnishing = purpose === "rent" ? rng.weighted({ furnished: 3, semi_furnished: 3, unfurnished: 4 }) : rng.weighted({ furnished: 1, semi_furnished: 2, unfurnished: 6 });

  const areaSqft = Math.round(toSqft(areaValue, areaUnit));

  // features
  const pool =
    info.category === "plot" ? AMENITY_POOLS.plot : info.category === "agricultural" ? AMENITY_POOLS.land : info.category === "commercial" ? AMENITY_POOLS.commercial : type === "flat" || type === "apartment" || type === "penthouse" ? AMENITY_POOLS.apartment : AMENITY_POOLS.home;
  const features = new Set(rng.pickN(pool, rng.int(Math.min(4, pool.length), Math.min(pool.length, 11))));
  ["electricity", "water"].forEach((f) => pool.includes(f) && features.add(f));
  if (pool.includes("gas") && rng.chance(0.75)) features.add("gas");
  const corner = (info.category === "plot" || type === "house" || type === "villa") && rng.chance(0.14);
  const parkFacing = (info.category === "plot" || type === "house" || type === "villa") && rng.chance(0.12);
  const boulevard = (info.category === "plot" || type === "shop" || type === "commercial_plot") && rng.chance(0.1);
  if (corner) features.add("corner");
  if (parkFacing) features.add("park_facing");
  if (boulevard) features.add("main_boulevard");
  if (loc.kind === "society") {
    features.add("security");
    if (rng.chance(0.7)) features.add("gated_community");
  }
  if (condition === "brand_new" || condition === "good") features.add("ready_to_move");
  if (info.category === "plot" && rng.chance(0.65)) features.add("possession");
  if ((parking ?? 0) > 0) features.add("parking");

  // price
  const conditionFactor = condition === "brand_new" ? 1.08 : condition === "old" ? 0.84 : condition === "under_construction" ? 0.8 : 1;
  const extras = (corner ? 1.06 : 1) * (parkFacing ? 1.04 : 1) * (boulevard ? 1.08 : 1);
  const noise = rng.noise(0.12);
  let price = 0;
  const aptRate = loc.apt ?? loc.house / 225 / 1.6;
  const comRate = loc.commercial ?? (loc.house / 225) * 1.4;
  switch (type) {
    case "house":
    case "villa":
      price = loc.house * marla * conditionFactor * extras * (marla > 20 ? 0.92 : 1);
      break;
    case "upper_portion":
    case "lower_portion":
      price = loc.house * marla * 0.48 * conditionFactor;
      break;
    case "farmhouse":
      price = (loc.agriAcre ? loc.agriAcre / 160 : loc.plot * 0.6) * marla * 1.6 * conditionFactor;
      break;
    case "residential_plot":
      price = loc.plot * marla * extras;
      break;
    case "plot_file":
      price = loc.plot * marla * 0.55;
      break;
    case "commercial_plot":
      price = loc.plot * marla * 2.6 * extras;
      break;
    case "agricultural_land":
      price = (loc.agriAcre ?? 8_000_000) * areaValue;
      break;
    case "flat":
    case "apartment":
      price = aptRate * areaSqft * conditionFactor;
      break;
    case "penthouse":
      price = aptRate * 1.35 * areaSqft;
      break;
    case "office":
      price = comRate * areaSqft * conditionFactor;
      break;
    case "shop":
      price = comRate * 1.25 * areaSqft * extras;
      break;
    case "warehouse":
      price = comRate * 0.35 * areaSqft;
      break;
    case "factory":
      price = loc.plot * marla * 1.25 + comRate * 0.3 * areaSqft * 0.6;
      break;
    case "building":
      price = loc.plot * marla * 2.6 + comRate * 0.6 * areaSqft * 3;
      break;
    case "room":
      price = 0;
      break;
    default:
      price = loc.plot * marla;
  }
  let rentPeriod: "monthly" | null = null;
  if (purpose === "rent") {
    rentPeriod = "monthly";
    if (type === "room") price = rng.pick([15_000, 18_000, 22_000, 25_000, 30_000]) * (loc.rent / 9_000);
    else if (type === "house" || type === "villa" || type === "farmhouse") price = loc.rent * marla * (furnishing === "furnished" ? 1.35 : 1) * conditionFactor;
    else if (type === "upper_portion" || type === "lower_portion") price = loc.rent * marla * 0.5;
    else if (type === "agricultural_land") price = (loc.agriAcre ?? 8_000_000) * areaValue * 0.004;
    else price = price * (info.category === "commercial" ? 0.0065 : 0.0045) * (furnishing === "furnished" ? 1.25 : 1);
  }
  price = roundPrice(Math.max(price * noise, purpose === "rent" ? 8_000 : 300_000), purpose);

  let installment: GeneratedListing["installment"] = null;
  if (purpose === "sale" && (info.category === "plot" || type === "apartment" || type === "flat") && rng.chance(0.18)) {
    const advance = roundPrice(price * rng.pick([0.2, 0.25, 0.3, 0.4]), "sale");
    const remaining = rng.pick([12, 18, 24, 30, 36]);
    installment = { advance, monthly: roundPrice((price - advance) / remaining, "rent"), remaining };
    features.add("installments");
  }

  // ---------------- text ----------------
  const sizeLabel = areaUnit === "sqft" ? `${areaValue.toLocaleString("en-PK")} Sq. Ft.` : formatArea(areaValue, areaUnit);
  const typeLabel = PROPERTY_TYPE_LABELS[type];
  const where = block ? `${block}, ${loc.name}` : loc.name;
  const adjectives: string[] = [];
  if (condition === "brand_new") adjectives.push(rng.pick(["Brand New", "Newly Built", "Modern"]));
  if (furnishing === "furnished" && rng.chance(0.6)) adjectives.push("Furnished");
  if (corner && rng.chance(0.7)) adjectives.push("Corner");
  if (parkFacing && !corner && rng.chance(0.7)) adjectives.push("Park Facing");
  if (condition === "good" && rng.chance(0.25)) adjectives.push(rng.pick(["Well-Maintained", "Spacious", "Elegant"]));
  const bedsPart = (type === "flat" || type === "apartment" || type === "penthouse") && beds != null ? (beds === 0 ? "Studio " : `${beds} Bed `) : "";
  const sizePart = type === "flat" || type === "apartment" || type === "room" ? "" : `${sizeLabel} `;
  const title = `${sizePart}${adjectives.slice(0, 2).join(" ")}${adjectives.length ? " " : ""}${bedsPart}${typeLabel} for ${purpose === "sale" ? "Sale" : "Rent"} in ${where}`.replace(/\s+/g, " ").trim();

  const intro = locationIntro(rng, loc, city, block);
  const paras: string[] = [];
  if (info.category === "plot") {
    paras.push(
      `${intro}, this ${sizeLabel.toLowerCase()} ${typeLabel.toLowerCase()} is available ${purpose === "sale" ? "for sale" : "for rent"}${corner ? " on a corner" : ""}${parkFacing ? " facing a park" : ""}${boulevard ? " on the main boulevard" : ""}.`,
    );
    paras.push(
      features.has("possession")
        ? "Possession is available and the plot is ready for construction. Utilities are available in the block."
        : "The plot is in a developing block; possession is expected as development progresses. Please confirm the current status with the society before purchase.",
    );
    if (type === "plot_file") paras.push("This is a plot file (allocation not yet balloted). The final plot number and location will be assigned by the society on balloting.");
    if (installment) paras.push(`Available on installments: advance of PKR ${installment.advance.toLocaleString("en-IN")} with ${installment.remaining} monthly installments of PKR ${installment.monthly.toLocaleString("en-IN")}.`);
    paras.push(rng.pick(["Suitable for building a family home or as a long-term investment.", "A good option for buyers planning to build in the next few years.", "Ideal for end-users and investors looking at this society."]));
  } else if (type === "agricultural_land") {
    paras.push(`${intro}, ${areaValue} acre${areaValue > 1 ? "s" : ""} of agricultural land ${purpose === "sale" ? "for sale" : "available on lease"}.`);
    paras.push(rng.pick(["The land has road access and a water source.", "The parcel is accessible by a metalled road and has a tube-well connection.", "Suitable for cultivation, orchards or a future farmhouse."]));
    paras.push("Buyers should verify the fard and mutation records with the land revenue office before purchase.");
  } else if (info.category === "commercial") {
    paras.push(`${intro}, this ${sizeLabel.toLowerCase()} ${typeLabel.toLowerCase()} is available ${purpose === "sale" ? "for sale" : "for rent"}.`);
    if (type === "office") paras.push(rng.pick(["The space has an open-plan layout with a reception area and meeting room.", "The office is partitioned with a manager's cabin, workstations area and a pantry.", "Suitable for corporate offices, software houses or consultancies."]));
    if (type === "shop") paras.push(rng.pick(["The shop has wide frontage with good footfall.", "Located in an active market with parking nearby.", "Suitable for retail, a pharmacy, a café or a showroom."]));
    if (type === "warehouse" || type === "factory") paras.push(rng.pick(["The site has truck access, high ceilings and a three-phase electricity connection.", "Suitable for storage, light manufacturing or distribution, with loading space on site.", "Industrial power connection and space for loading and unloading."]));
    if (type === "building") paras.push(`A ${rng.int(3, 6)}-storey building with ground-floor commercial units and offices or apartments above, suitable for rental income.`);
    if (features.has("elevator") || features.has("backup_generator")) paras.push(`Building facilities include ${[features.has("elevator") && "elevator access", features.has("backup_generator") && "backup power", features.has("parking") && "parking", features.has("security") && "security"].filter(Boolean).join(", ")}.`);
  } else {
    const roomsText = beds === 0 ? "a studio layout" : `${beds} bedroom${beds === 1 ? "" : "s"} and ${baths} bathroom${baths === 1 ? "" : "s"}`;
    paras.push(`${intro}, this ${condition === "brand_new" ? "newly built " : ""}${typeLabel.toLowerCase()} offers ${roomsText}${type === "flat" || type === "apartment" || type === "penthouse" ? ` across ${areaSqft.toLocaleString("en-PK")} sq ft${floorNumber ? ` on floor ${floorNumber}` : ""}` : ` on a ${sizeLabel.toLowerCase()} plot`}.`);
    const spaces = ["drawing_room", "dining_room", "study_room", "store_room", "servant_quarter", "lawn", "terrace", "basement"].filter((f) => features.has(f));
    if (spaces.length) paras.push(`The layout includes ${spaces.map((f) => f.replace(/_/g, " ")).join(", ")}${type === "house" || type === "villa" ? `, with a kitchen on ${floors && floors > 1 ? "each floor" : "the ground floor"}` : ""}.`);
    const finish = condition === "brand_new" ? rng.pick(["Modern finishes throughout, including tiled floors, fitted wardrobes and a fitted kitchen.", "Finished with porcelain tiles, wooden kitchen cabinets and modern bathroom fittings."]) : condition === "old" ? "The property is older and may benefit from renovation, which is reflected in the price." : rng.pick(["The property has been well maintained and is ready to move in.", "Recently painted and in good condition."]);
    paras.push(finish);
    const utils = ["electricity", "gas", "water", "solar", "backup_generator", "internet"].filter((f) => features.has(f)).map((f) => ({ electricity: "electricity", gas: "Sui gas", water: "water supply", solar: "solar panels", backup_generator: "backup generator", internet: "broadband" })[f]);
    if (utils.length) paras.push(`Utilities: ${utils.join(", ")}.`);
    if (purpose === "rent") paras.push(rng.pick(["Suitable for families. Rent is negotiable for a longer lease.", "Available from next month. Security deposit and advance as per agreement.", "Preference for families or working professionals."]));
    if (installment) paras.push(`Installment option: advance of PKR ${installment.advance.toLocaleString("en-IN")} and ${installment.remaining} monthly installments of PKR ${installment.monthly.toLocaleString("en-IN")}.`);
  }
  const nearby = ["mosque_nearby", "school_nearby", "market_nearby", "hospital_nearby"].filter((f) => features.has(f)).map((f) => f.replace("_nearby", ""));
  if (nearby.length) paras.push(`Nearby: ${nearby.join(", ")}.`);
  paras.push("Contact through Bismillah to arrange a visit. Please verify all documents independently before making any payment.");

  const highlights: string[] = [];
  if (corner) highlights.push("Corner property");
  if (parkFacing) highlights.push("Facing a park");
  if (condition === "brand_new") highlights.push("Brand new construction");
  if (features.has("possession")) highlights.push("Possession available");
  if (installment) highlights.push("Installments available");
  if (furnishing === "furnished") highlights.push("Fully furnished");
  if (features.has("solar")) highlights.push("Solar installed");
  if (loc.kind === "society") highlights.push(`Inside ${loc.name}`);

  // images
  const images: GeneratedListing["images"] = [];
  const add = (urls: string[], n: number) => rng.pickN(urls, n).forEach((url) => images.push({ url, kind: "image" }));
  if (type === "house" || type === "upper_portion" || type === "lower_portion") {
    add(IMG.houseExterior, 1);
    add(IMG.living, 2);
    add(IMG.kitchen, 1);
    add(IMG.bedroom, 1);
    add(IMG.bathroom, 1);
  } else if (type === "villa" || type === "penthouse") {
    add(IMG.villa, 1);
    add(IMG.living, 3);
    add(IMG.kitchen, 1);
    add(IMG.bathroom, 1);
  } else if (type === "flat" || type === "apartment" || type === "room") {
    add(IMG.apartmentBuilding, 1);
    add(IMG.living, 2);
    add(IMG.kitchen, 1);
    add(IMG.bedroom, 1);
  } else if (type === "farmhouse") {
    add(IMG.farmhouse, 2);
    add(IMG.living, 2);
  } else if (info.category === "plot") {
    add([...IMG.aerial, ...IMG.land], 2);
  } else if (type === "agricultural_land") {
    add(IMG.land, 2);
  } else if (type === "office" || type === "building") {
    add([...IMG.tower, ...IMG.office], 3);
  } else if (type === "shop") {
    add(IMG.shop, 1);
    add(IMG.office, 1);
  } else {
    add(IMG.warehouse, 2);
  }
  if (beds && beds >= 2 && rng.chance(0.35)) images.push({ url: "/floor-plans/sample-floor-plan.svg", kind: "floor_plan" });

  // coordinates (jitter around centroid)
  const jitter = loc.kind === "society" ? 0.018 : 0.011;
  const lat = loc.lat + (rng.next() - 0.5) * 2 * jitter;
  const lng = loc.lng + (rng.next() - 0.5) * 2 * jitter;
  const street = info.category === "agricultural" ? "" : rng.chance(0.6) ? `Street ${rng.int(1, 40)}` : "";

  return {
    type,
    purpose,
    areaValue,
    areaUnit,
    areaSqft,
    beds,
    baths,
    parking,
    floors,
    floorNumber,
    yearBuilt,
    furnishing,
    condition,
    features: [...features],
    price,
    rentPeriod,
    installment,
    title,
    description: paras.join("\n\n"),
    highlights: highlights.slice(0, 5),
    images,
    lat,
    lng,
    address: [street, block, loc.name, city.name].filter(Boolean).join(", "),
  };
}
