import { pgTable, text, uuid, boolean, integer, index, uniqueIndex, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { id, createdAt, updatedAt, isSeed } from "./_helpers";
import { locationKindEnum } from "./enums";

export const provinces = pgTable("provinces", {
  id: id(),
  countryCode: text("country_code").notNull().default("PK"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isSeed: isSeed(),
});

export const cities = pgTable(
  "cities",
  {
    id: id(),
    provinceId: uuid("province_id").notNull().references(() => provinces.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    district: text("district"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    isMajor: boolean("is_major").notNull().default(false),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(100),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("cities_province_idx").on(t.provinceId)],
);

/** Neighbourhoods / localities / towns (e.g. Gulberg, F-7, Clifton). */
export const areas = pgTable(
  "areas",
  {
    id: id(),
    cityId: uuid("city_id").notNull().references(() => cities.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    tehsil: text("tehsil"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    description: text("description"),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("areas_city_idx").on(t.cityId)],
);

/** Housing societies / schemes (e.g. DHA Lahore, Bahria Town Karachi). */
export const societies = pgTable(
  "societies",
  {
    id: id(),
    cityId: uuid("city_id").notNull().references(() => cities.id),
    areaId: uuid("area_id").references(() => areas.id),
    developerId: uuid("developer_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    description: text("description"),
    approvalAuthority: text("approval_authority"),
    isGated: boolean("is_gated").notNull().default(true),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("societies_city_idx").on(t.cityId)],
);

export const blocks = pgTable(
  "blocks",
  {
    id: id(),
    societyId: uuid("society_id").references(() => societies.id),
    areaId: uuid("area_id").references(() => areas.id),
    cityId: uuid("city_id").notNull().references(() => cities.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    isSeed: isSeed(),
  },
  (t) => [index("blocks_society_idx").on(t.societyId)],
);

/**
 * Unified location index used for autocomplete, SEO area pages and as the
 * "most specific location" foreign key on properties. One row per province,
 * city, area, society and block (refId points at the source row).
 */
export const locations = pgTable(
  "locations",
  {
    id: id(),
    kind: locationKindEnum("kind").notNull(),
    refId: uuid("ref_id").notNull(),
    parentId: uuid("parent_id"),
    cityId: uuid("city_id"),
    name: text("name").notNull(),
    /** "DHA Phase 6, DHA Lahore, Lahore" */
    fullName: text("full_name").notNull(),
    slug: text("slug").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    /** cached counts refreshed by the stats job */
    activeListings: integer("active_listings").notNull().default(0),
    popularity: integer("popularity").notNull().default(0),
    overview: text("overview"),
    investmentOutlook: text("investment_outlook"),
    highlights: jsonb("highlights").$type<string[]>().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("locations_slug_uq").on(t.slug),
    uniqueIndex("locations_ref_uq").on(t.kind, t.refId),
    index("locations_city_idx").on(t.cityId),
    index("locations_parent_idx").on(t.parentId),
    index("locations_name_trgm").using("gin", t.fullName.op("gin_trgm_ops")),
  ],
);
