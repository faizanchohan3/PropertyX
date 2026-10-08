/**
 * Pakistani land measurement units.
 *
 * Marla size varies across Pakistan. Most modern housing societies (DHA, Bahria,
 * LDA schemes) use 225 sq ft per marla while revenue records traditionally use
 * 272.25 sq ft. We normalise everything to square feet using a configurable marla
 * size (default 225) so comparisons are consistent.
 */
export const AREA_UNITS = ["sqft", "sqyd", "marla", "kanal", "acre", "sqm"] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];
export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  sqft: "Sq. Ft.",
  sqyd: "Sq. Yd.",
  marla: "Marla",
  kanal: "Kanal",
  acre: "Acre",
  sqm: "Sq. M.",
};

export const DEFAULT_MARLA_SQFT = 225;

export function sqftPerUnit(unit: AreaUnit, marlaSqft = DEFAULT_MARLA_SQFT): number {
  switch (unit) {
    case "sqft":
      return 1;
    case "sqyd":
      return 9;
    case "sqm":
      return 10.7639;
    case "marla":
      return marlaSqft;
    case "kanal":
      return marlaSqft * 20;
    case "acre":
      return 43560;
  }
}

export function toSqft(value: number, unit: AreaUnit, marlaSqft = DEFAULT_MARLA_SQFT): number {
  return value * sqftPerUnit(unit, marlaSqft);
}

export function fromSqft(sqft: number, unit: AreaUnit, marlaSqft = DEFAULT_MARLA_SQFT): number {
  return sqft / sqftPerUnit(unit, marlaSqft);
}

function trim(n: number, digits = 2) {
  return Number(n.toFixed(digits)).toString();
}

/** Human readable area in the listing's own unit, e.g. "10 Marla", "1 Kanal", "1,250 Sq. Ft." */
export function formatArea(value: number, unit: AreaUnit): string {
  const v = unit === "sqft" || unit === "sqyd" || unit === "sqm" ? Math.round(value).toLocaleString("en-PK") : trim(value);
  return `${v} ${AREA_UNIT_LABELS[unit]}`;
}

/** Best Pakistani-style unit for a square feet value (for descriptions and AI answers). */
export function describeSqft(sqft: number, marlaSqft = DEFAULT_MARLA_SQFT): string {
  if (sqft >= 43560 * 2) return formatArea(sqft / 43560, "acre");
  const kanal = marlaSqft * 20;
  if (sqft >= kanal && Math.abs(sqft / kanal - Math.round(sqft / kanal)) < 0.05) return formatArea(sqft / kanal, "kanal");
  if (sqft >= marlaSqft * 2) return formatArea(sqft / marlaSqft, "marla");
  return formatArea(sqft, "sqft");
}
