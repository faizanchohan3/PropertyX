/** PKR formatting and parsing using the South Asian numbering system (lakh / crore / arab). */

export const LAKH = 100_000;
export const CRORE = 10_000_000;
export const ARAB = 1_000_000_000;

function trim(n: number, digits = 2) {
  return Number(n.toFixed(digits)).toString();
}

/** 25000000 -> "2.5 Crore", 4500000 -> "45 Lakh", 85000 -> "85 Thousand" */
export function formatPriceWords(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const a = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (a >= ARAB) return `${sign}${trim(a / ARAB)} Arab`;
  if (a >= CRORE) return `${sign}${trim(a / CRORE)} Crore`;
  if (a >= LAKH) return `${sign}${trim(a / LAKH)} Lakh`;
  if (a >= 1000) return `${sign}${trim(a / 1000, 1)} Thousand`;
  return `${sign}${Math.round(a)}`;
}

/** "PKR 2.5 Crore" */
export function formatPKR(amount: number | null | undefined): string {
  if (amount == null) return "Price on request";
  return `PKR ${formatPriceWords(amount)}`;
}

/** Full digits with South Asian grouping: 25000000 -> "2,50,00,000" */
export function formatPKRFull(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Compact for cards and map pins: "2.5Cr", "45L", "85K" */
export function formatPriceShort(amount: number): string {
  const a = Math.abs(amount);
  if (a >= CRORE) return `${trim(a / CRORE, a >= 10 * CRORE ? 0 : 2)}Cr`;
  if (a >= LAKH) return `${trim(a / LAKH, a >= 10 * LAKH ? 0 : 1)}L`;
  if (a >= 1000) return `${trim(a / 1000, 0)}K`;
  return String(Math.round(a));
}

const UNIT_MULTIPLIERS: [RegExp, number][] = [
  [/^(arab|arb)$/i, ARAB],
  [/^(crore|crores|cr|caror|karor|karod)$/i, CRORE],
  [/^(lakh|lakhs|lac|lacs|lak|l)$/i, LAKH],
  [/^(million|mn|m)$/i, 1_000_000],
  [/^(thousand|k|hazar|hazaar)$/i, 1_000],
];

/**
 * Parse a human price expression: "2 crore", "1.5cr", "80 lakh", "PKR 45,00,000", "50k".
 * Returns null when it can't be interpreted.
 */
export function parsePrice(input: string): number | null {
  const s = input.toLowerCase().replace(/pkr|rs\.?|rupees?/g, "").trim();
  const m = s.match(/^([\d.,]+)\s*([a-z]+)?$/);
  if (!m) return null;
  const num = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  if (!m[2]) return num;
  for (const [re, mult] of UNIT_MULTIPLIERS) if (re.test(m[2])) return Math.round(num * mult);
  return null;
}

export function formatNumber(n: number, digits = 0) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatPercent(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}
