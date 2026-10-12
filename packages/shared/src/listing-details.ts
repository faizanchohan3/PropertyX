/**
 * Market-specific listing extras, stored in property_listings.details (jsonb).
 * Used by the UAE site: regulator permit, broker (BRN) and office (ORN) registration numbers,
 * off-plan status with handover date and payment plan, annual service charge and rent cheques.
 */
import { z } from "zod";

export const COMPLETION_STATUSES = ["ready", "off_plan"] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];
export const COMPLETION_LABELS: Record<CompletionStatus, string> = { ready: "Ready", off_plan: "Off-plan" };

export const CHEQUE_OPTIONS = [1, 2, 3, 4, 6, 12] as const;

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const listingDetailsSchema = z
  .object({
    /** Dubai Land Department / RERA (Trakheesi) or ADREC advertising permit number */
    permitNumber: optText(40),
    /** Broker Registration Number of the agent */
    brn: optText(20),
    /** Office Registration Number of the brokerage */
    orn: optText(20),
    completionStatus: z.enum(COMPLETION_STATUSES).optional(),
    /** "YYYY-MM" */
    handoverDate: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the handover month")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    /** e.g. "60/40" or "1% monthly" */
    paymentPlan: optText(60),
    developer: optText(80),
    /** annual service charge in the site currency per sq ft */
    serviceChargePerSqft: z.coerce.number().min(0).max(1000).optional().nullable().transform((v) => v ?? undefined),
    /** number of rent cheques accepted per year */
    cheques: z.coerce.number().int().min(1).max(12).optional().nullable().transform((v) => v ?? undefined),
  })
  .default({});
export type ListingDetails = z.infer<typeof listingDetailsSchema>;

/** "2027-12" -> "Dec 2027" (Q4 2027 style is what developers quote, but month is what we store) */
export function formatHandover(v?: string | null): string | null {
  if (!v) return null;
  const [y, m] = v.split("-").map(Number);
  if (!y || !m) return v;
  return `${new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "short", timeZone: "UTC" })} ${y} (Q${Math.ceil(m / 3)})`;
}

/** Rough annual service charge for the unit. */
export function annualServiceCharge(perSqft: number | undefined | null, areaSqft: number | undefined | null): number | null {
  if (!perSqft || !areaSqft) return null;
  return Math.round(perSqft * areaSqft);
}
