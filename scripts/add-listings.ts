/**
 * Adds demo listings to an existing database without wiping anything.
 *
 *   npm run db:add-listings            -> 50 listings (houses for sale/rent, plots, commercial)
 *   npm run db:add-listings -- 120     -> any number
 *
 * Listings are generated (not real) and flagged is_seed = true, like the main demo seed.
 * Run `npm run db:seed` or `npm run db:reference` first so cities and localities exist.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { createDb } from "@propertyx/database";
import * as s from "@propertyx/database";
import { createRng } from "@propertyx/database/seed/rng";
import { CITIES } from "@propertyx/database/seed/data/locations";
import { generateListing } from "@propertyx/database/seed/listing-generator";
import { slugify, PROPERTY_TYPE_LABELS, propertyTypeInfo, type PropertyType, type Purpose } from "@propertyx/shared";

const GROUPS: { label: string; share: number; purpose: Purpose; types: PropertyType[] }[] = [
  { label: "houses for sale", share: 0.26, purpose: "sale", types: ["house", "house", "house", "villa"] },
  { label: "houses for rent", share: 0.26, purpose: "rent", types: ["house", "house", "upper_portion", "lower_portion"] },
  { label: "plots for sale", share: 0.24, purpose: "sale", types: ["residential_plot", "residential_plot", "residential_plot", "plot_file"] },
  { label: "commercial for sale", share: 0.24, purpose: "sale", types: ["shop", "office", "commercial_plot", "building"] },
];

const DAY = 86_400_000;
const rid = (n: number) => Math.random().toString(36).slice(2, 2 + n);

async function main() {
  const total = Math.max(1, Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 50));
  const url = process.env.DATABASE_URL ?? "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx";
  const { db, sql: conn } = createDb(url);
  const rng = createRng(Date.now() % 2 ** 31);
  const now = new Date();
  const ago = (d: number) => new Date(now.getTime() - d * DAY);

  try {
    // demo cities + localities that exist in this database
    const locs = await db.select({ id: s.locations.id, slug: s.locations.slug, kind: s.locations.kind, refId: s.locations.refId, cityId: s.locations.cityId }).from(s.locations);
    const bySlug = new Map(locs.map((l) => [l.slug, l]));
    const places = CITIES.flatMap((city) => {
      const citySlug = slugify(city.name);
      const cityLoc = bySlug.get(citySlug);
      if (!cityLoc) return [];
      return city.locs.flatMap((loc) => {
        const base = slugify(loc.name);
        const slug = base.includes(citySlug) ? base : `${base}-${citySlug}`;
        const ref = bySlug.get(slug);
        if (!ref) return [];
        const blocks = (loc.blocks ?? []).map((b) => ({ name: b, ref: bySlug.get(`${slugify(b)}-${slug}`) })).filter((b) => b.ref);
        return [{ city, loc, cityId: cityLoc.refId, ref, blocks, weight: loc.weight ?? 1 }];
      });
    });
    if (!places.length) throw new Error("No demo localities found. Run `npm run db:seed` first.");

    // agents per city (via their user's city)
    const agentRows = await db
      .select({ id: s.agents.id, userId: s.agents.userId, agencyId: s.agents.agencyId, name: s.agents.displayName, phone: s.agents.phone, cityId: s.users.cityId })
      .from(s.agents)
      .innerJoin(s.users, eq(s.users.id, s.agents.userId));
    const anyAgent = agentRows.filter((a) => a.phone);
    if (!anyAgent.length) throw new Error("No agents found to post the listings. Run `npm run db:seed` first.");

    const featureRows = await db.select({ id: s.features.id, key: s.features.key }).from(s.features);
    const featureId = new Map(featureRows.map((f) => [f.key, f.id]));
    const [{ maxRef }] = await db.execute<{ maxRef: number | null }>(
      sql`select max(nullif(regexp_replace(reference_code, '[^0-9]', '', 'g'), '')::bigint)::float8 as "maxRef" from property_listings`,
    );
    let refCounter = Math.max(1_000_100, Number(maxRef ?? 0) + 1);

    const totalW = places.reduce((a, p) => a + p.weight, 0);
    const pickPlace = () => {
      let r = rng.next() * totalW;
      for (const p of places) if ((r -= p.weight) <= 0) return p;
      return places[places.length - 1];
    };

    const plan: { purpose: Purpose; type: PropertyType }[] = [];
    GROUPS.forEach((g, i) => {
      const n = i === GROUPS.length - 1 ? total - plan.length : Math.round(total * g.share);
      for (let k = 0; k < n; k++) plan.push({ purpose: g.purpose, type: rng.pick(g.types) });
    });

    const created: string[] = [];
    for (const { purpose, type } of plan) {
      const place = pickPlace();
      const block = place.blocks.length && rng.chance(0.85) ? rng.pick(place.blocks) : undefined;
      const g = generateListing(rng, place.city, place.loc, type, block?.name, now, purpose);
      const cityAgents = anyAgent.filter((a) => a.cityId === place.cityId);
      const agent = rng.pick(cityAgents.length ? cityAgents : anyAgent);
      const daysAgo = Math.floor(Math.pow(rng.next(), 1.6) * 60);
      const publishedAt = ago(daysAgo);
      const verificationLevel = Number(rng.weighted({ 0: 14, 1: 34, 2: 20, 3: 10, 4: 16, 5: 6 }));
      const views = Math.round(rng.int(20, 300) * Math.max(0.2, daysAgo / 30));

      await db.transaction(async (tx) => {
        const [prop] = await tx
          .insert(s.properties)
          .values({
            ownerId: agent.userId,
            type,
            category: propertyTypeInfo(type)!.category,
            cityId: place.cityId,
            areaId: place.ref.kind === "area" ? place.ref.refId : null,
            societyId: place.ref.kind === "society" ? place.ref.refId : null,
            blockId: block?.ref?.refId ?? null,
            locationId: (block?.ref ?? place.ref).id,
            address: g.address,
            lat: g.lat,
            lng: g.lng,
            areaValue: g.areaValue,
            areaUnit: g.areaUnit,
            areaSqft: g.areaSqft,
            beds: g.beds,
            baths: g.baths,
            parkingSpaces: g.parking,
            floors: g.floors,
            floorNumber: g.floorNumber,
            yearBuilt: g.yearBuilt,
            furnishing: g.furnishing,
            condition: g.condition,
            isSeed: true,
            createdAt: publishedAt,
          })
          .returning({ id: s.properties.id });
        const searchText = [g.title, PROPERTY_TYPE_LABELS[type], purpose === "sale" ? "sale buy" : "rent", block?.name, place.loc.name, place.city.name, place.city.province, g.highlights.join(" "), g.description.slice(0, 600)].filter(Boolean).join(" ");
        const [listing] = await tx
          .insert(s.propertyListings)
          .values({
            propertyId: prop.id,
            slug: `${slugify(g.title).slice(0, 70)}-${rid(5)}`,
            referenceCode: `PX-${refCounter++}`,
            purpose,
            status: "active",
            title: g.title,
            description: g.description,
            highlights: g.highlights,
            price: g.price,
            pricePerSqft: Math.round((g.price / g.areaSqft) * 100) / 100,
            rentPeriod: g.rentPeriod,
            installmentAvailable: !!g.installment,
            advanceAmount: g.installment?.advance ?? null,
            monthlyInstallment: g.installment?.monthly ?? null,
            installmentsRemaining: g.installment?.remaining ?? null,
            contactName: agent.name,
            contactPhone: agent.phone!,
            contactWhatsapp: agent.phone,
            postedById: agent.userId,
            agentId: agent.id,
            agencyId: agent.agencyId,
            verificationLevel,
            verifiedAt: verificationLevel >= 2 ? ago(rng.int(0, daysAgo)) : null,
            qualityScore: Math.min(100, 40 + g.images.length * 6 + (g.description.length > 400 ? 15 : 5) + (g.highlights.length ? 10 : 0)),
            viewsCount: views,
            savesCount: Math.round(views * rng.float(0.01, 0.06)),
            leadsCount: Math.round(views * rng.float(0.005, 0.02)),
            publishedAt,
            expiresAt: new Date(publishedAt.getTime() + 90 * DAY),
            searchText,
            isSeed: true,
            createdAt: publishedAt,
            updatedAt: publishedAt,
          })
          .returning({ id: s.propertyListings.id });
        const pf = g.features.filter((f) => featureId.has(f)).map((f) => ({ propertyId: prop.id, featureId: featureId.get(f)! }));
        if (pf.length) await tx.insert(s.propertyFeatures).values(pf).onConflictDoNothing();
        if (g.images.length)
          await tx.insert(s.propertyMedia).values(
            g.images.map((m, k) => ({ propertyId: prop.id, kind: m.kind, url: m.url, sortOrder: k, caption: m.kind === "floor_plan" ? "Floor plan (indicative)" : null, sha256: `demo-add-${listing.id}-${k}`, isSeed: true })),
          );
        await tx.insert(s.propertyPriceHistory).values({ listingId: listing.id, oldPrice: null, newPrice: g.price, changedAt: publishedAt, changedById: agent.userId });
        created.push(listing.id);
      });
    }

    // keep the per-location "N properties" counters in sync
    await db.execute(sql`
      update locations l set active_listings = coalesce(x.n, 0)
      from (
        select loc.id, count(pl.id) as n from locations loc
        join properties p on (
          (loc.kind = 'city' and p.city_id = loc.ref_id) or
          (loc.kind = 'area' and p.area_id = loc.ref_id) or
          (loc.kind = 'society' and p.society_id = loc.ref_id) or
          (loc.kind = 'block' and p.block_id = loc.ref_id))
        join property_listings pl on pl.property_id = p.id and pl.status = 'active'
        group by loc.id) x
      where x.id = l.id`);

    const summary = await db
      .select({ purpose: s.propertyListings.purpose, category: s.properties.category, n: sql<number>`count(*)::int` })
      .from(s.propertyListings)
      .innerJoin(s.properties, eq(s.properties.id, s.propertyListings.propertyId))
      .where(inArray(s.propertyListings.id, created))
      .groupBy(s.propertyListings.purpose, s.properties.category);
    console.log(`✔ added ${created.length} listings`);
    for (const r of summary) console.log(`  ${r.category} for ${r.purpose}: ${r.n}`);
  } finally {
    await conn.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
