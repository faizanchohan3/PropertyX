/**
 * UAE demo dataset for the UAE deployment (NEXT_PUBLIC_COUNTRY=ae). Unlike seedDemo it does NOT
 * wipe anything: it adds fictional agencies, agents, developers, off-plan projects and listings on top
 * of the UAE reference geography (npm run db:reference). Every row has is_seed = true, all company
 * names are invented, and phone numbers sit in one fixed demo block (call buttons are disabled for
 * demo listings). Run it once: it refuses to add a second copy.
 */
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { slugify, PROPERTY_TYPE_LABELS, propertyTypeInfo, formatHandover, type PropertyType, type ListingDetails } from "@propertyx/shared";
import type { Database } from "../client";
import * as s from "../schema";
import { createRng, type Rng } from "./rng";
import { IMG } from "./data/images";

export const UAE_DEMO_DOMAIN = "demo-uae.bismillah.test";
const PASSWORD = "Demo@12345";
const DAY = 86_400_000;

/** AED per sq ft (sale) and typical service charge (AED / sq ft / year) by community. */
const MARKET: Record<string, { psf: number; sc: number; kind: "apt" | "villa" | "mixed" | "commercial" }> = {
  "Dubai Marina": { psf: 1_850, sc: 22, kind: "apt" },
  "Downtown Dubai": { psf: 2_600, sc: 28, kind: "apt" },
  "Business Bay": { psf: 2_050, sc: 20, kind: "apt" },
  "Jumeirah Village Circle": { psf: 1_250, sc: 15, kind: "apt" },
  "Jumeirah Lake Towers": { psf: 1_400, sc: 17, kind: "apt" },
  "Palm Jumeirah": { psf: 3_400, sc: 26, kind: "mixed" },
  "Dubai Hills Estate": { psf: 2_050, sc: 16, kind: "mixed" },
  "Arabian Ranches": { psf: 1_500, sc: 5, kind: "villa" },
  "Damac Hills": { psf: 1_250, sc: 8, kind: "mixed" },
  "Town Square": { psf: 1_050, sc: 6, kind: "mixed" },
  "Motor City": { psf: 1_250, sc: 14, kind: "mixed" },
  "Dubai Sports City": { psf: 1_000, sc: 13, kind: "apt" },
  "Dubai Silicon Oasis": { psf: 950, sc: 12, kind: "apt" },
  "International City": { psf: 650, sc: 10, kind: "apt" },
  "Al Barsha": { psf: 1_300, sc: 14, kind: "mixed" },
  Jumeirah: { psf: 2_300, sc: 4, kind: "villa" },
  Deira: { psf: 900, sc: 12, kind: "commercial" },
  "Bur Dubai": { psf: 1_100, sc: 13, kind: "commercial" },
  Mirdif: { psf: 1_150, sc: 4, kind: "villa" },
  "Al Nahda Dubai": { psf: 900, sc: 12, kind: "apt" },
  "Al Reem Island": { psf: 1_350, sc: 16, kind: "apt" },
  "Saadiyat Island": { psf: 2_100, sc: 15, kind: "mixed" },
  "Yas Island": { psf: 1_400, sc: 13, kind: "mixed" },
  "Al Raha Beach": { psf: 1_450, sc: 14, kind: "apt" },
  "Khalifa City": { psf: 950, sc: 4, kind: "villa" },
  "Mohammed Bin Zayed City": { psf: 800, sc: 4, kind: "villa" },
  "Al Reef": { psf: 900, sc: 6, kind: "mixed" },
  "Corniche Abu Dhabi": { psf: 1_300, sc: 15, kind: "apt" },
  "Al Jimi": { psf: 600, sc: 3, kind: "villa" },
  "Al Muwaiji": { psf: 650, sc: 3, kind: "villa" },
  "Al Majaz": { psf: 750, sc: 11, kind: "apt" },
  "Al Khan": { psf: 800, sc: 12, kind: "apt" },
  "Al Taawun": { psf: 780, sc: 11, kind: "apt" },
  "Al Nahda Sharjah": { psf: 650, sc: 10, kind: "apt" },
  Muwaileh: { psf: 700, sc: 9, kind: "mixed" },
  Aljada: { psf: 1_100, sc: 12, kind: "mixed" },
  "Al Nuaimiya": { psf: 500, sc: 8, kind: "apt" },
  "Al Rashidiya": { psf: 520, sc: 8, kind: "apt" },
  "Al Jurf": { psf: 500, sc: 4, kind: "villa" },
  "Emirates City": { psf: 450, sc: 8, kind: "apt" },
  "Al Hamra Village": { psf: 1_100, sc: 12, kind: "mixed" },
  "Al Marjan Island": { psf: 1_500, sc: 16, kind: "apt" },
  "Mina Al Arab": { psf: 1_200, sc: 12, kind: "mixed" },
  "Al Faseel": { psf: 600, sc: 8, kind: "apt" },
  "Al Salamah": { psf: 450, sc: 5, kind: "villa" },
};
/** relative listing volume per community */
const WEIGHT: Record<string, number> = {
  "Dubai Marina": 14, "Downtown Dubai": 12, "Business Bay": 14, "Jumeirah Village Circle": 16, "Jumeirah Lake Towers": 9, "Palm Jumeirah": 8,
  "Dubai Hills Estate": 11, "Arabian Ranches": 7, "Damac Hills": 7, "Town Square": 6, "Al Reem Island": 9, "Yas Island": 6, "Saadiyat Island": 5,
  Aljada: 5, "Al Majaz": 5, "Al Khan": 4,
};
const OFF_PLAN_HOTSPOTS = new Set(["Business Bay", "Jumeirah Village Circle", "Dubai Hills Estate", "Damac Hills", "Town Square", "Yas Island", "Saadiyat Island", "Al Reem Island", "Aljada", "Al Marjan Island", "Dubai Marina", "Mina Al Arab"]);

const AGENCIES = [
  { name: "Gulf Crest Real Estate", city: "dubai", year: 2011, about: "Residential sales and leasing across Dubai Marina, JLT and JVC, with a dedicated off-plan desk." },
  { name: "Marina Bay Homes", city: "dubai", year: 2015, about: "Waterfront apartments and Palm Jumeirah villas for end users and investors." },
  { name: "Desert Rose Properties", city: "dubai", year: 2009, about: "Family villas and townhouses in Arabian Ranches, Dubai Hills and Damac Hills." },
  { name: "Capital Keys Realty", city: "abu-dhabi", year: 2013, about: "Abu Dhabi sales and leasing on Al Reem, Yas and Saadiyat islands." },
  { name: "Emirates Gate Brokers", city: "sharjah", year: 2016, about: "Affordable homes for families in Sharjah and Ajman, plus commercial leasing." },
];
const DEVELOPERS = [
  { name: "Azure Coast Developments", city: "dubai", year: 2006, about: "Waterfront towers and branded residences in Dubai." },
  { name: "Oasis Line Properties", city: "dubai", year: 2012, about: "Townhouse and villa communities with family amenities." },
  { name: "Falcon Ridge Real Estate", city: "abu-dhabi", year: 2010, about: "Island living in Abu Dhabi, from studios to beachfront villas." },
];
const FIRST = ["Omar", "Rashid", "Khalid", "Yousef", "Hamdan", "Sara", "Mariam", "Noura", "Aisha", "Layla", "Arjun", "Priya", "Rahul", "Anita", "James", "Emma", "Olivia", "Daniel", "Sophie", "Ahmed", "Fatima", "Bilal", "Hina", "Mark", "Elena", "Ivan", "Chen", "Grace"];
const LAST = ["Al Mansoori", "Al Hashimi", "Haddad", "Nasser", "Khoury", "Saleh", "Menon", "Sharma", "Kapoor", "Thompson", "Walker", "Bennett", "Morgan", "Rossi", "Ivanova", "Qureshi", "Malik", "Fernandes", "D'Souza", "Wang"];
const LANGS = ["English", "Arabic", "Hindi", "Urdu", "Russian", "French", "Tagalog", "Malayalam"];
const SPECIALIZATIONS = ["Off-plan", "Luxury Apartments", "Villas & Townhouses", "Rentals", "Investor Portfolios", "Commercial Leasing", "Short Lets", "First-time Buyers"];
const PLANS = ["60/40", "70/30", "50/50", "80/20", "1% monthly", "40/60 post-handover"];

type Loc = { id: string; name: string; slug: string; kind: string; refId: string; cityId: string; citySlug: string; cityName: string; lat: number; lng: number };

function pickType(rng: Rng, kind: string, purpose: "sale" | "rent"): PropertyType {
  if (kind === "villa") return rng.weighted({ villa: 6, townhouse: 3, residential_plot: purpose === "sale" ? 1 : 0 }) as PropertyType;
  if (kind === "commercial") return rng.weighted({ apartment: 4, office: 3, shop: 2, warehouse: 1, building: purpose === "sale" ? 0.3 : 0 }) as PropertyType;
  if (kind === "mixed") return rng.weighted({ apartment: 5, villa: 3, townhouse: 3, penthouse: 0.6 }) as PropertyType;
  return rng.weighted({ apartment: 10, penthouse: 0.8, hotel_apartment: purpose === "rent" ? 0.8 : 0.4, office: 0.8, shop: 0.4 }) as PropertyType;
}

function size(rng: Rng, type: PropertyType): { beds: number | null; baths: number | null; sqft: number } {
  switch (type) {
    case "apartment":
    case "hotel_apartment": {
      const beds = Number(rng.weighted({ 0: 2, 1: 4, 2: 3.5, 3: 1.6, 4: 0.3 }));
      const base = [430, 760, 1_220, 1_700, 2_400][beds];
      return { beds, baths: Math.max(1, beds + (beds >= 2 ? 1 : 0)), sqft: Math.round(base * rng.float(0.9, 1.18)) };
    }
    case "penthouse": {
      const beds = rng.int(3, 5);
      return { beds, baths: beds + 1, sqft: Math.round(rng.float(3_200, 6_500)) };
    }
    case "townhouse": {
      const beds = rng.int(2, 4);
      return { beds, baths: beds + 1, sqft: Math.round([0, 0, 1_650, 2_150, 2_700][beds] * rng.float(0.92, 1.12)) };
    }
    case "villa": {
      const beds = Number(rng.weighted({ 3: 3, 4: 4, 5: 2.5, 6: 0.8 }));
      return { beds, baths: beds + 1, sqft: Math.round([0, 0, 0, 2_900, 3_800, 5_200, 7_000][beds] * rng.float(0.9, 1.15)) };
    }
    case "office":
      return { beds: null, baths: rng.int(1, 2), sqft: Math.round(rng.float(550, 3_200)) };
    case "shop":
      return { beds: null, baths: 1, sqft: Math.round(rng.float(350, 1_600)) };
    case "warehouse":
      return { beds: null, baths: 1, sqft: Math.round(rng.float(4_000, 22_000)) };
    case "building":
      return { beds: null, baths: null, sqft: Math.round(rng.float(18_000, 60_000)) };
    case "residential_plot":
      return { beds: null, baths: null, sqft: Math.round(rng.float(4_500, 14_000)) };
    default:
      return { beds: 1, baths: 1, sqft: 700 };
  }
}

/** sale price per sq ft adjustment by type */
const TYPE_PSF: Partial<Record<PropertyType, number>> = { penthouse: 1.45, villa: 0.92, townhouse: 0.9, office: 0.95, shop: 1.25, warehouse: 0.32, building: 0.7, residential_plot: 0.42, hotel_apartment: 1.05 };

function images(rng: Rng, type: PropertyType) {
  const interiors = [...IMG.living, ...IMG.kitchen, ...IMG.bedroom, ...IMG.bathroom];
  let set: string[];
  if (type === "villa" || type === "townhouse") set = [rng.pick([...IMG.villa, ...IMG.houseExterior]), ...rng.pickN(interiors, 4)];
  else if (type === "office") set = rng.pickN(IMG.office, 2).concat(rng.pick(IMG.tower));
  else if (type === "shop") set = [...IMG.shop, rng.pick(IMG.tower)];
  else if (type === "warehouse") set = IMG.warehouse;
  else if (type === "building") set = [rng.pick(IMG.tower), rng.pick(IMG.apartmentBuilding)];
  else if (type === "residential_plot") set = [rng.pick([...IMG.land, ...IMG.aerial])];
  else set = [rng.pick([...IMG.apartmentBuilding, ...IMG.tower]), ...rng.pickN(interiors, 4)];
  return [...new Set(set)];
}

function features(rng: Rng, type: PropertyType, kind: string): string[] {
  const f = new Set<string>(["central_ac", "security", "cctv", "maintenance_staff", "internet"]);
  if (["apartment", "penthouse", "hotel_apartment", "office"].includes(type)) ["elevator", "parking", "gym", "swimming_pool"].forEach((x) => rng.chance(0.85) && f.add(x));
  if (["villa", "townhouse"].includes(type)) ["gated_community", "parking", "garage", "lawn", "terrace", "swimming_pool"].forEach((x) => rng.chance(0.65) && f.add(x));
  if (kind !== "commercial") ["school_nearby", "hospital_nearby", "market_nearby", "mosque_nearby"].forEach((x) => rng.chance(0.55) && f.add(x));
  if (type === "residential_plot") return ["market_nearby", "school_nearby"].filter(() => rng.chance(0.6));
  return [...f];
}

function describe(rng: Rng, o: { type: PropertyType; purpose: "sale" | "rent"; beds: number | null; sqft: number; loc: Loc; det: ListingDetails; furnished: boolean }) {
  const label = PROPERTY_TYPE_LABELS[o.type];
  const bed = o.beds == null ? "" : o.beds === 0 ? "Studio " : `${o.beds} Bed `;
  const views = rng.pick(["community view", "pool view", "city view", "sea view", "marina view", "park view", "Burj view", "garden view"]);
  const hook = o.det.completionStatus === "off_plan" ? rng.pick(["Off-plan", "Payment plan", "New launch"]) : o.purpose === "rent" ? rng.pick(["Vacant", "Ready to move", "Chiller free", "Well maintained"]) : rng.pick(["Vacant on transfer", "Upgraded", "Tenanted — good ROI", "Prime location"]);
  const title = `${hook} | ${bed}${label}${o.type === "apartment" || o.type === "penthouse" ? ` with ${views}` : ""} in ${o.loc.name}`.replace(/\s+/g, " ");
  const lines = [
    `${o.beds == null ? "This" : `This ${o.beds === 0 ? "studio" : `${o.beds}-bedroom`}`} ${label.toLowerCase()} in ${o.loc.name}, ${o.loc.cityName} offers about ${o.sqft.toLocaleString("en-US")} sq ft of ${o.type === "office" || o.type === "shop" || o.type === "warehouse" ? "usable space" : "living space"}${o.furnished ? ", fully furnished" : ""}.`,
    o.det.completionStatus === "off_plan"
      ? `Expected handover ${formatHandover(o.det.handoverDate)} with a ${o.det.paymentPlan} payment plan from ${o.det.developer}.`
      : o.purpose === "rent"
        ? `Available now, ${o.det.cheques === 1 ? "single cheque" : `up to ${o.det.cheques} cheques`}. Viewing by appointment.`
        : rng.pick(["Title deed ready. Vacant on transfer.", "Currently tenanted until next year — ideal for investors.", "Recently upgraded kitchen and flooring."]),
    o.type === "residential_plot" ? "Freehold plot suitable for a custom villa; building permits through the master developer." : `Residents enjoy ${rng.pickN(["a swimming pool", "a fully equipped gym", "24/7 security", "covered parking", "kids' play areas", "jogging tracks", "retail and cafés nearby", "quick access to the metro"], 3).join(", ")}.`,
    "Demo listing — sample data for this site and not a real offer.",
  ];
  return { title: title.slice(0, 118), description: lines.join(" ") };
}

export async function seedUaeDemo(db: Database, opts: { log?: (m: string) => void; listings?: number } = {}) {
  const log = opts.log ?? console.log;
  const rng = createRng(20261013);
  const now = Date.now();
  const ago = (d: number) => new Date(now - d * DAY);
  const ahead = (d: number) => new Date(now + d * DAY);
  const rid = (n = 5) => Array.from({ length: n }, () => "abcdefghijkmnpqrstuvwxyz23456789"[rng.int(0, 31)]).join("");
  let phoneN = 1;
  const phone = () => `+97150000${String(phoneN++).padStart(4, "0")}`;

  const [exists] = await db.select({ id: s.users.id }).from(s.users).where(sql`${s.users.email} like ${"%@" + UAE_DEMO_DOMAIN}`).limit(1);
  if (exists) throw new Error("UAE demo data is already loaded (users @" + UAE_DEMO_DOMAIN + " exist).");

  const locs = (await db.execute<Loc>(sql`
    select l.id, l.name, l.slug, l.kind, l.ref_id as "refId", c.id as "cityId", c.slug as "citySlug", c.name as "cityName", l.lat, l.lng
    from locations l join cities c on c.id = l.city_id
    where l.kind in ('area', 'society') and l.lat is not null`)) as unknown as Loc[];
  const usable = locs.filter((l) => MARKET[l.name]);
  if (usable.length < 10) throw new Error("UAE communities not found — run `npm run db:reference` with NEXT_PUBLIC_COUNTRY=ae first.");
  const cities = await db.select({ id: s.cities.id, slug: s.cities.slug, name: s.cities.name }).from(s.cities);
  const cityBySlug = new Map(cities.map((c) => [c.slug, c]));
  const roles = new Map((await db.select().from(s.roles)).map((r) => [r.key, r.id]));
  const featureId = new Map((await db.select().from(s.features)).map((f) => [f.key, f.id]));

  /* users */
  log("• users, agencies, agents");
  const pw = await bcrypt.hash(PASSWORD, 10);
  const person = () => `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
  const usedEmails = new Set<string>();
  const email = (name: string, prefix: string) => {
    const base = `${prefix}.${slugify(name).replace(/-/g, ".")}`;
    let e = `${base}@${UAE_DEMO_DOMAIN}`;
    for (let n = 2; usedEmails.has(e); n++) e = `${base}${n}@${UAE_DEMO_DOMAIN}`;
    usedEmails.add(e);
    return e;
  };
  const users: { email: string; name: string; roles: string[]; cityId: string; level: number; phone: string }[] = [];
  const addUser = (name: string, prefix: string, roleKeys: string[], citySlug: string, level = 2) => {
    users.push({ email: email(name, prefix), name, roles: roleKeys, cityId: cityBySlug.get(citySlug)!.id, level, phone: phone() });
    return users.length - 1;
  };
  const named = { agent: addUser("Sara Haddad", "agent", ["agent"], "dubai"), seller: addUser("Daniel Morgan", "seller", ["seller", "landlord"], "dubai", 1), buyer: addUser("Priya Menon", "buyer", ["buyer", "investor"], "dubai", 1) };
  const agencyPlans = AGENCIES.map((a) => {
    const owner = addUser(person(), "owner", ["agency", "agent"], a.city);
    const team = Array.from({ length: rng.int(2, 3) }, () => addUser(person(), "agent", ["agent"], a.city));
    return { ...a, owner, team: a.name === "Gulf Crest Real Estate" ? [named.agent, ...team] : team };
  });
  const devOwners = DEVELOPERS.map((d) => addUser(person(), "developer", ["developer"], d.city));
  const sellers = Array.from({ length: 8 }, (_, i) => addUser(person(), "owner", ["seller", "landlord"], ["dubai", "dubai", "abu-dhabi", "sharjah"][i % 4], rng.int(0, 2)));

  const insertedUsers = await db
    .insert(s.users)
    .values(users.map((u) => ({ email: u.email, name: u.name, phone: u.phone, passwordHash: pw, primaryRole: u.roles[0], status: "active" as const, phoneVerifiedAt: ago(rng.int(30, 300)), emailVerifiedAt: ago(rng.int(30, 300)), identityVerifiedAt: u.level >= 2 ? ago(rng.int(10, 200)) : null, verificationLevel: u.level, cityId: u.cityId, isSeed: true, createdAt: ago(rng.int(60, 700)) })))
    .returning({ id: s.users.id });
  const uid = (i: number) => insertedUsers[i].id;
  await db.insert(s.userRoles).values(users.flatMap((u, i) => u.roles.map((k) => ({ userId: uid(i), roleId: roles.get(k)! })))).onConflictDoNothing();

  const agencyRows = await db
    .insert(s.agencies)
    .values(
      agencyPlans.map((a, i) => ({
        ownerId: uid(a.owner),
        name: a.name,
        slug: slugify(a.name),
        description: `${a.about} (Demo agency — sample data.)`,
        phone: phone(),
        whatsapp: users[a.owner].phone,
        email: `hello@${slugify(a.name)}.${UAE_DEMO_DOMAIN}`,
        cityId: cityBySlug.get(a.city)!.id,
        address: `Office ${rng.int(101, 2405)}, ${rng.pick(usable.filter((l) => l.citySlug === a.city)).name}, ${cityBySlug.get(a.city)!.name}`,
        establishedYear: a.year,
        verificationLevel: i === 4 ? 1 : 2,
        isSeed: true,
        createdAt: ago(rng.int(300, 900)),
      })),
    )
    .returning();
  const orn = agencyRows.map(() => String(rng.int(10_000, 49_999)));
  const agentPlans = agencyPlans.flatMap((a, ai) => [a.owner, ...a.team].map((userIdx) => ({ userIdx, agencyIdx: ai, city: a.city })));
  const agentRows = await db
    .insert(s.agents)
    .values(
      agentPlans.map((p, i) => ({
        userId: uid(p.userIdx),
        agencyId: agencyRows[p.agencyIdx].id,
        slug: `${slugify(users[p.userIdx].name)}-${rid(4)}`,
        displayName: users[p.userIdx].name,
        bio: `${users[p.userIdx].name.split(" ")[0]} is a RERA-registered broker with ${AGENCIES[p.agencyIdx].name}, focused on ${rng.pickN(SPECIALIZATIONS, 2).join(" and ").toLowerCase()}. (Demo profile.)`,
        experienceYears: rng.int(2, 16),
        phone: users[p.userIdx].phone,
        whatsapp: users[p.userIdx].phone,
        specializations: rng.pickN(SPECIALIZATIONS, rng.int(2, 3)),
        languages: ["English", ...rng.pickN(LANGS.slice(1), rng.int(1, 2))],
        verificationLevel: 2,
        responseTimeMins: rng.pick([10, 15, 20, 30, 60]),
        isFeatured: i % 4 === 0,
        isSeed: true,
        createdAt: ago(rng.int(100, 700)),
      })),
    )
    .returning();
  const brn = agentRows.map(() => String(rng.int(30_000, 79_999)));
  await db.insert(s.agencyMembers).values(agentPlans.map((p) => ({ agencyId: agencyRows[p.agencyIdx].id, userId: uid(p.userIdx), role: p.userIdx === agencyPlans[p.agencyIdx].owner ? "admin" : "agent" }))).onConflictDoNothing();
  await db
    .insert(s.agentAreas)
    .values(agentPlans.flatMap((p, i) => rng.pickN(usable.filter((l) => l.citySlug === p.city), 3).map((l) => ({ agentId: agentRows[i].id, locationId: l.id }))))
    .onConflictDoNothing();

  /* developers + off-plan projects */
  log("• developers & projects");
  const devRows = await db
    .insert(s.developers)
    .values(DEVELOPERS.map((d, i) => ({ ownerId: uid(devOwners[i]), name: d.name, slug: slugify(d.name), description: `${d.about} (Demo developer — sample data.)`, phone: phone(), email: `sales@${slugify(d.name)}.${UAE_DEMO_DOMAIN}`, cityId: cityBySlug.get(d.city)!.id, establishedYear: d.year, verificationLevel: 2, isSeed: true })))
    .returning();
  const PROJECTS = [
    { name: "Azure Bay Residences", dev: 0, loc: "Business Bay", status: "under_construction" as const, progress: 45, completion: "2028-06-30", image: "tower" as const, units: [["apartment", "1 Bed", 780, 1, 1_650_000], ["apartment", "2 Bed", 1_250, 2, 2_600_000], ["penthouse", "Sky Penthouse", 4_200, 4, 11_500_000]] },
    { name: "Azure Marina Heights", dev: 0, loc: "Dubai Marina", status: "pre_launch" as const, progress: 5, completion: "2029-03-31", image: "apartmentBuilding" as const, units: [["apartment", "Studio", 450, 0, 980_000], ["apartment", "1 Bed", 820, 1, 1_750_000], ["apartment", "2 Bed", 1_300, 2, 2_750_000]] },
    { name: "Oasis Line Gardens", dev: 1, loc: "Damac Hills", status: "under_construction" as const, progress: 60, completion: "2027-12-31", image: "villa" as const, units: [["villa", "3 Bed Townhouse", 2_150, 3, 2_300_000], ["villa", "4 Bed Villa", 3_600, 4, 4_100_000]] },
    { name: "Oasis Line Parkside", dev: 1, loc: "Jumeirah Village Circle", status: "near_completion" as const, progress: 85, completion: "2027-03-31", image: "apartmentBuilding" as const, units: [["apartment", "Studio", 420, 0, 620_000], ["apartment", "1 Bed", 760, 1, 1_000_000], ["apartment", "2 Bed", 1_180, 2, 1_480_000]] },
    { name: "Falcon Ridge Shores", dev: 2, loc: "Yas Island", status: "under_construction" as const, progress: 35, completion: "2028-09-30", image: "villa" as const, units: [["apartment", "1 Bed", 790, 1, 1_150_000], ["villa", "4 Bed Villa", 3_900, 4, 5_600_000]] },
  ];
  const projectByLoc = new Map<string, { id: string; dev: number }>();
  for (const p of PROJECTS) {
    const loc = usable.find((l) => l.name === p.loc)!;
    const prices = p.units.map((u) => Number(u[4]));
    const cover = rng.pick(IMG[p.image] as string[]);
    const [proj] = await db
      .insert(s.projects)
      .values({
        developerId: devRows[p.dev].id,
        name: p.name,
        slug: slugify(`${p.name} ${loc.cityName}`),
        tagline: `${p.units.map((u) => u[1]).join(", ")} in ${p.loc}`,
        description: `${p.name} by ${DEVELOPERS[p.dev].name} brings ${p.units.map((u) => String(u[1]).toLowerCase()).join(", ")} to ${p.loc}, with a pool deck, gym, kids' play areas and landscaped gardens. Payment plans are spread over construction with the balance on handover. (Demo project — sample data.)`,
        cityId: loc.cityId,
        locationId: loc.id,
        address: `${p.loc}, ${loc.cityName}`,
        lat: loc.lat + (rng.next() - 0.5) * 0.008,
        lng: loc.lng + (rng.next() - 0.5) * 0.008,
        status: p.status,
        constructionProgress: p.progress,
        launchDate: new Date(now - rng.int(60, 600) * DAY).toISOString().slice(0, 10),
        expectedCompletion: p.completion,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        totalUnits: rng.int(180, 640),
        availableUnits: rng.int(40, 160),
        amenities: ["Swimming Pool", "Gym", "Kids Play Area", "Landscaped Gardens", "Covered Parking", "24/7 Security"],
        coverImage: cover,
        masterPlanUrl: "/floor-plans/sample-master-plan.svg",
        approvalStatus: "Demo project — not a real development",
        isFeatured: true,
        viewsCount: rng.int(800, 7_000),
        isSeed: true,
        createdAt: ago(rng.int(30, 300)),
      })
      .returning();
    projectByLoc.set(p.loc, { id: proj.id, dev: p.dev });
    await db.insert(s.projectMedia).values([cover, ...rng.pickN([...IMG.living, ...IMG.kitchen, ...IMG.bathroom], 4)].map((url, i) => ({ projectId: proj.id, kind: "image" as const, url, sortOrder: i, isSeed: true })));
    await db.insert(s.projectUnits).values(p.units.map((u) => ({ projectId: proj.id, type: u[0] as "apartment", name: String(u[1]), areaSqft: Number(u[2]), beds: Number(u[3]), baths: Number(u[3]) + 1, priceFrom: Number(u[4]), priceTo: Math.round(Number(u[4]) * 1.12), totalUnits: rng.int(20, 200), availableUnits: rng.int(5, 60), floorPlanUrl: "/floor-plans/sample-floor-plan.svg", isSeed: true })));
    await db.insert(s.projectPaymentPlans).values([
      { projectId: proj.id, name: "60/40 Plan", downPaymentPct: 20, durationMonths: 36, frequency: "quarterly", possessionPct: 40, notes: "20% booking, 40% during construction, 40% on handover", isSeed: true },
      { projectId: proj.id, name: "1% Monthly", downPaymentPct: 10, durationMonths: 60, frequency: "monthly", possessionPct: 30, notes: "10% booking, 1% a month, 30% on handover", isSeed: true },
    ]);
  }

  /* listings */
  const total = opts.listings ?? 220;
  log(`• ${total} listings`);
  const weights = usable.map((l) => WEIGHT[l.name] ?? (l.citySlug === "dubai" ? 3 : 2));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const pickLoc = () => {
    let r = rng.next() * sumW;
    for (let i = 0; i < usable.length; i++) if ((r -= weights[i]) <= 0) return usable[i];
    return usable[usable.length - 1];
  };
  const agentsIn = (city: string) => agentPlans.map((p, i) => ({ p, i })).filter((x) => x.p.city === city);
  const props: (typeof s.properties.$inferInsert)[] = [];
  const rows: (typeof s.propertyListings.$inferInsert & { _img: string[]; _feat: string[] })[] = [];
  let ref = 4_000_100;
  for (let n = 0; n < total; n++) {
    const loc = pickLoc();
    const m = MARKET[loc.name];
    const purpose = rng.chance(0.58) ? "sale" : "rent";
    const type = pickType(rng, m.kind, purpose);
    const sz = size(rng, type);
    const offPlan = purpose === "sale" && OFF_PLAN_HOTSPOTS.has(loc.name) && ["apartment", "townhouse", "villa", "penthouse"].includes(type) && rng.chance(0.42);
    const psf = m.psf * (TYPE_PSF[type] ?? 1) * rng.float(0.88, 1.14) * (offPlan ? 0.93 : 1);
    const salePrice = Math.round((psf * sz.sqft) / 5_000) * 5_000;
    const price = purpose === "sale" ? salePrice : Math.round((salePrice * rng.float(0.058, 0.078)) / 1_000) * 1_000;
    const furnished = purpose === "rent" && sz.beds != null && rng.chance(0.35);
    const proj = offPlan ? projectByLoc.get(loc.name) : undefined;
    const devName = proj ? DEVELOPERS[proj.dev].name : rng.pick(DEVELOPERS).name;
    const byAgent = rng.chance(0.82) && agentsIn(loc.citySlug).length > 0;
    const agentPick = byAgent ? rng.pick(agentsIn(loc.citySlug)) : null;
    const ownerIdx = agentPick ? agentPick.p.userIdx : rng.pick(sellers);
    const det: ListingDetails = {
      permitNumber: loc.citySlug === "dubai" || loc.citySlug === "abu-dhabi" ? (rng.chance(0.93) ? String(rng.int(1_000_000_000, 9_999_999_999)) : undefined) : undefined,
      brn: agentPick ? brn[agentPick.i] : undefined,
      orn: agentPick ? orn[agentPick.p.agencyIdx] : undefined,
      completionStatus: purpose === "sale" ? (offPlan ? "off_plan" : "ready") : undefined,
      handoverDate: offPlan ? `${rng.int(2027, 2029)}-${String(rng.pick([3, 6, 9, 12])).padStart(2, "0")}` : undefined,
      paymentPlan: offPlan ? rng.pick(PLANS) : undefined,
      developer: offPlan || rng.chance(0.3) ? devName : undefined,
      serviceChargePerSqft: ["warehouse", "residential_plot", "building"].includes(type) ? undefined : Math.round(m.sc * rng.float(0.85, 1.2) * 10) / 10,
      cheques: purpose === "rent" ? Number(rng.weighted({ 1: 2, 2: 2, 4: 4, 6: 1.5, 12: 1 })) : undefined,
    };
    const { title, description } = describe(rng, { type, purpose, beds: sz.beds, sqft: sz.sqft, loc, det, furnished });
    type St = "active" | "sold" | "rented" | "paused" | "expired";
    const status = rng.weighted({ active: 88, sold: 4, rented: 4, paused: 2, expired: 2 }) as St;
    const finalStatus: St = status === "sold" && purpose === "rent" ? "rented" : status === "rented" && purpose === "sale" ? "sold" : status;
    const days = finalStatus === "active" ? Math.floor(Math.pow(rng.next(), 1.6) * 120) : rng.int(60, 300);
    const level = Number(rng.weighted({ 1: 3, 2: 4, 3: 2, 4: 2, 5: 0.6 }));
    const featured = finalStatus === "active" && rng.chance(0.1);
    const views = Math.round(rng.int(40, 500) * Math.max(0.2, Math.min(3, days / 30)) * (featured ? 2 : 1));
    const lat = loc.lat + (rng.next() - 0.5) * 0.012;
    const lng = loc.lng + (rng.next() - 0.5) * 0.012;
    const contact = agentPick ? users[agentPick.p.userIdx] : users[ownerIdx];
    props.push({
      ownerId: uid(ownerIdx),
      type,
      category: propertyTypeInfo(type)!.category,
      cityId: loc.cityId,
      areaId: loc.kind === "area" ? loc.refId : null,
      societyId: loc.kind === "society" ? loc.refId : null,
      locationId: loc.id,
      address: `${loc.name}, ${loc.cityName}`,
      lat,
      lng,
      areaValue: sz.sqft,
      areaUnit: "sqft",
      areaSqft: sz.sqft,
      beds: sz.beds,
      baths: sz.baths,
      parkingSpaces: sz.beds == null ? (type === "office" ? rng.int(1, 3) : null) : Math.max(1, Math.min(3, sz.beds - 1)),
      floorNumber: ["apartment", "penthouse", "hotel_apartment", "office"].includes(type) ? rng.int(1, 48) : null,
      floors: ["villa", "townhouse"].includes(type) ? rng.int(2, 3) : null,
      yearBuilt: offPlan ? null : rng.int(2006, 2025),
      furnishing: sz.beds == null ? null : furnished ? "furnished" : rng.chance(0.3) ? "semi_furnished" : "unfurnished",
      condition: offPlan ? "under_construction" : rng.pick(["brand_new", "good", "good"] as const),
      isSeed: true,
      createdAt: ago(days),
    });
    rows.push({
      propertyId: String(props.length - 1),
      slug: `${slugify(title).slice(0, 70)}-${rid(5)}`,
      referenceCode: `PX-${ref++}`,
      purpose,
      status: finalStatus,
      title,
      description,
      highlights: [det.completionStatus === "off_plan" ? `Handover ${formatHandover(det.handoverDate)}` : null, det.paymentPlan ? `${det.paymentPlan} plan` : null, furnished ? "Furnished" : null, det.cheques && det.cheques >= 4 ? `${det.cheques} cheques` : null].filter(Boolean) as string[],
      details: det,
      price,
      pricePerSqft: Math.round((price / sz.sqft) * 100) / 100,
      rentPeriod: purpose === "rent" ? "yearly" : null,
      contactName: contact.name,
      contactPhone: contact.phone,
      contactWhatsapp: contact.phone,
      postedById: uid(ownerIdx),
      agentId: agentPick ? agentRows[agentPick.i].id : null,
      agencyId: agentPick ? agencyRows[agentPick.p.agencyIdx].id : null,
      projectId: proj?.id ?? null,
      isPremium: featured && rng.chance(0.5),
      featuredUntil: featured ? ahead(rng.int(5, 30)) : null,
      verificationLevel: level,
      verifiedAt: level >= 2 ? ago(rng.int(1, 90)) : null,
      qualityScore: rng.int(62, 96),
      viewsCount: views,
      savesCount: Math.round(views * rng.float(0.01, 0.05)),
      leadsCount: Math.round(views * rng.float(0.005, 0.02)),
      publishedAt: ago(days),
      expiresAt: new Date(now - days * DAY + 90 * DAY),
      closedAt: finalStatus === "active" || finalStatus === "paused" ? null : ago(Math.max(1, days - rng.int(10, 50))),
      searchText: [title, PROPERTY_TYPE_LABELS[type], purpose === "sale" ? "sale buy" : "rent", det.completionStatus === "off_plan" ? "off-plan off plan" : "", loc.name, loc.cityName, description.slice(0, 400)].join(" "),
      isSeed: true,
      createdAt: ago(days),
      updatedAt: ago(Math.max(0, days - rng.int(0, 5))),
      _img: images(rng, type),
      _feat: features(rng, type, m.kind),
    });
  }
  const propIds = await db.insert(s.properties).values(props).returning({ id: s.properties.id });
  const listingIds = await db
    .insert(s.propertyListings)
    .values(rows.map(({ _img, _feat, ...l }) => ({ ...l, propertyId: propIds[Number(l.propertyId)].id })))
    .returning({ id: s.propertyListings.id });
  const media: (typeof s.propertyMedia.$inferInsert)[] = [];
  const pf: { propertyId: string; featureId: string }[] = [];
  const hist: (typeof s.propertyPriceHistory.$inferInsert)[] = [];
  rows.forEach((l, i) => {
    const pid = propIds[i].id;
    l._img.forEach((url, k) => media.push({ propertyId: pid, kind: "image", url, sortOrder: k, sha256: `demo-uae-${i}-${k}`, isSeed: true }));
    if (["apartment", "penthouse", "villa", "townhouse"].includes(String(props[i].type)) && rng.chance(0.4)) media.push({ propertyId: pid, kind: "floor_plan", url: "/floor-plans/sample-floor-plan.svg", caption: "Floor plan (indicative)", sortOrder: 20, isSeed: true });
    l._feat.forEach((f) => featureId.get(f) && pf.push({ propertyId: pid, featureId: featureId.get(f)! }));
    hist.push({ listingId: listingIds[i].id, oldPrice: null, newPrice: l.price!, changedAt: l.publishedAt!, changedById: l.postedById });
  });
  await db.insert(s.propertyMedia).values(media);
  if (pf.length) await db.insert(s.propertyFeatures).values(pf).onConflictDoNothing();
  await db.insert(s.propertyPriceHistory).values(hist);

  await db.insert(s.siteSettings).values({ key: "demo_mode", value: true }).onConflictDoUpdate({ target: s.siteSettings.key, set: { value: true } });
  log(`  added ${listingIds.length} listings, ${agentRows.length} agents, ${agencyRows.length} agencies, ${PROJECTS.length} projects`);
  return { listings: listingIds.length, agents: agentRows.length, agencies: agencyRows.length, projects: PROJECTS.length, password: PASSWORD, accounts: users.slice(0, 3).map((u) => u.email) };
}
