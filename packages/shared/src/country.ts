/**
 * Country the deployment serves. One codebase runs the Pakistan site and the UAE site as
 * separate deployments with separate databases; set NEXT_PUBLIC_COUNTRY=ae on the UAE one.
 * (NEXT_PUBLIC_ so the same value is available in the browser.) Defaults to Pakistan.
 */
import type { AreaUnit } from "./units";

export type CountryCode = "pk" | "ae";

export interface CountryConfig {
  code: CountryCode;
  /** "Pakistan" / "UAE" — used in copy such as "property across Pakistan" */
  name: string;
  /** full site name */
  brand: string;
  /** short word under the logo */
  brandTag: string;
  currency: "PKR" | "AED";
  /** BCP 47 locale for number formatting and <html lang> */
  locale: string;
  phone: { dial: string; example: string; label: string };
  /** units offered in forms and filters (stored data can still use any unit) */
  areaUnits: AreaUnit[];
  defaultAreaUnit: AreaUnit;
  /** usual rent period quoted in this market */
  rentPeriod: "monthly" | "yearly";
  map: { center: [number, number]; zoom: number; bounds: { south: number; west: number; north: number; east: number } };
  /** second UI language besides English (Urdu for Pakistan; Arabic for the UAE once translated) */
  altLang: "ur" | "ar" | null;
  /** province-level divisions are called… */
  regionLabel: string;
  /** for "in …" phrases: "Pakistan" / "the UAE" */
  inName: string;
  /** "Pakistani" / "UAE" */
  adjective: string;
  /** local time offset used for visit times */
  utcOffset: string;
  ogLocale: string;
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  pk: {
    code: "pk",
    name: "Pakistan",
    brand: "Bismillah Pakistan",
    brandTag: "PAKISTAN",
    currency: "PKR",
    locale: "en-PK",
    phone: { dial: "+92", example: "0300 1234567", label: "Pakistani mobile number" },
    areaUnits: ["marla", "kanal", "sqft", "sqyd", "sqm", "acre"],
    defaultAreaUnit: "marla",
    rentPeriod: "monthly",
    map: { center: [30.3753, 69.3451], zoom: 6, bounds: { south: 23, west: 60, north: 38, east: 78 } },
    altLang: "ur",
    regionLabel: "Province",
    inName: "Pakistan",
    adjective: "Pakistani",
    utcOffset: "+05:00",
    ogLocale: "en_PK",
  },
  ae: {
    code: "ae",
    name: "UAE",
    brand: "Bismillah UAE",
    brandTag: "UAE",
    currency: "AED",
    locale: "en-AE",
    phone: { dial: "+971", example: "050 123 4567", label: "UAE mobile number" },
    areaUnits: ["sqft", "sqm", "acre"],
    defaultAreaUnit: "sqft",
    rentPeriod: "yearly",
    map: { center: [24.7, 54.9], zoom: 7, bounds: { south: 22.5, west: 51.4, north: 26.3, east: 56.6 } },
    altLang: "ar",
    regionLabel: "Emirate",
    inName: "the UAE",
    adjective: "UAE",
    utcOffset: "+04:00",
    ogLocale: "en_AE",
  },
};

const raw = (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_COUNTRY ?? process.env.COUNTRY : undefined)?.toLowerCase();

export const COUNTRY: CountryConfig = COUNTRIES[raw === "ae" ? "ae" : "pk"];
export const isUAE = COUNTRY.code === "ae";

/** True when a coordinate lies inside the deployment's country (used to validate map input). */
export function inCountry(lat: number, lng: number) {
  const b = COUNTRY.map.bounds;
  return lat > b.south && lat < b.north && lng > b.west && lng < b.east;
}

/** "+923001234567" -> "03001234567", "+971501234567" -> "0501234567" (how people write numbers locally). */
export function localPhone(e164: string | null | undefined): string {
  return (e164 ?? "").replace(COUNTRY.phone.dial, "0");
}

/** Quick client-side check for a local mobile number before the server validates it properly. */
export function isMobileNumber(input: string): boolean {
  const s = input.replace(/[\s-]/g, "");
  return COUNTRY.code === "ae" ? /^(\+971|00971|971|0)5\d{8}$/.test(s) : /^(\+92|0092|92|0)3\d{9}$/.test(s);
}
