/**
 * UAE mortgage limits and property buying costs. Figures follow the UAE Central Bank mortgage
 * regulations and the published Dubai Land Department / ADREC fee schedules; they are estimates
 * for planning and the UI labels them as such (banks and land departments update fees).
 */
import type { FinancingProduct } from "./calculators";

export type UaeResidency = "national" | "expat";
export type UaeEmirate = "dubai" | "abu-dhabi" | "sharjah" | "other";
export type UaePurchase = "resale" | "off_plan";

export const UAE_EMIRATE_LABELS: Record<UaeEmirate, string> = { dubai: "Dubai", "abu-dhabi": "Abu Dhabi", sharjah: "Sharjah", other: "Other emirates" };

/** Banks may lend for at most 25 years. */
export const UAE_MAX_TENURE_YEARS = 25;
const VAT = 0.05;

/**
 * Maximum loan-to-value under the Central Bank rules:
 * first home up to AED 5M: 85% nationals / 80% expats; above AED 5M: 70% nationals / 65% expats;
 * second and later homes: 65% nationals / 60% expats; off-plan (under construction): 50%.
 */
export function uaeMaxLtv(o: { residency: UaeResidency; firstHome: boolean; price: number; offPlan?: boolean }): number {
  if (o.offPlan) return 50;
  if (!o.firstHome) return o.residency === "national" ? 65 : 60;
  if (o.price <= 5_000_000) return o.residency === "national" ? 85 : 80;
  return o.residency === "national" ? 70 : 65;
}

export interface UaeCostInput {
  price: number;
  emirate: UaeEmirate;
  purchase: UaePurchase;
  /** 0 for a cash purchase */
  loanAmount: number;
  /** buyer's agent commission in % of price (VAT added) */
  agentCommissionPct?: number;
  /** bank arrangement fee in % of the loan (VAT added) */
  bankFeePct?: number;
  valuationFee?: number;
}

export interface UaeCostItem {
  key: string;
  label: string;
  amount: number;
  note?: string;
}

/** One-off costs of buying, on top of the down payment. */
export function uaeBuyingCosts(i: UaeCostInput): { items: UaeCostItem[]; total: number; percentOfPrice: number } {
  const price = Math.max(0, i.price);
  const loan = Math.max(0, i.loanAmount);
  const resale = i.purchase === "resale";
  const items: UaeCostItem[] = [];
  const add = (key: string, label: string, amount: number, note?: string) => amount > 0 && items.push({ key, label, amount: Math.round(amount), note });

  if (i.emirate === "abu-dhabi") {
    add("transfer", "ADREC registration fee", price * 0.02, "2% of the price");
    if (loan) add("mortgage_reg", "Mortgage registration", loan * 0.001, "0.1% of the loan");
  } else if (i.emirate === "sharjah") {
    add("transfer", "Land registration fee", price * 0.04, "4% of the price");
    if (loan) add("mortgage_reg", "Mortgage registration", loan * 0.0025, "0.25% of the loan");
  } else {
    const dubai = i.emirate === "dubai";
    add("transfer", dubai ? "DLD transfer fee" : "Land registration fee", price * 0.04, dubai ? "4% of the price, paid to the Dubai Land Department" : "about 4% of the price — check with the emirate's land department");
    add("title", resale ? "Title deed issuance" : "Oqood (off-plan) registration", resale ? 580 : 1_150);
    if (dubai && resale) add("trustee", "Registration trustee fee", (price >= 500_000 ? 4_000 : 2_000) * (1 + VAT), price >= 500_000 ? "AED 4,000 + VAT" : "AED 2,000 + VAT");
    if (loan) add("mortgage_reg", "Mortgage registration", loan * 0.0025 + 290, "0.25% of the loan + AED 290");
  }
  if (resale) add("noc", "Developer NOC", 1_000, "usually AED 500 – 5,000");
  const commission = i.agentCommissionPct ?? (resale ? 2 : 0);
  if (commission) add("agent", "Agent commission", price * (commission / 100) * (1 + VAT), `${commission}% + VAT`);
  if (loan) {
    const bankPct = i.bankFeePct ?? 1;
    if (bankPct) add("bank", "Bank arrangement fee", loan * (bankPct / 100) * (1 + VAT), `up to ${bankPct}% of the loan + VAT`);
    add("valuation", "Property valuation", (i.valuationFee ?? 3_000) * (1 + VAT), "AED 2,500 – 3,500 + VAT");
  }
  const total = items.reduce((s, x) => s + x.amount, 0);
  return { items, total, percentOfPrice: price ? Math.round((total / price) * 1000) / 10 : 0 };
}

/** Typical UAE mortgage products (rates as of 2026; admins can edit them in Settings). */
export const UAE_FINANCING_PRODUCTS: FinancingProduct[] = [
  {
    key: "ae_fixed",
    name: "Fixed-rate mortgage",
    mode: "conventional",
    defaultRate: 4.25,
    maxTenureYears: UAE_MAX_TENURE_YEARS,
    maxFinancingPct: 80,
    description: "Rate fixed for the first 1–5 years, then usually EIBOR plus a margin.",
  },
  {
    key: "ae_variable",
    name: "Variable (EIBOR-linked)",
    mode: "conventional",
    defaultRate: 4.75,
    maxTenureYears: UAE_MAX_TENURE_YEARS,
    maxFinancingPct: 80,
    description: "3-month EIBOR plus the bank's margin; payments move when EIBOR changes.",
  },
  {
    key: "ae_islamic",
    name: "Islamic home finance (Ijara)",
    mode: "ijarah",
    defaultRate: 4.5,
    maxTenureYears: UAE_MAX_TENURE_YEARS,
    maxFinancingPct: 80,
    description: "The bank buys the home and leases it to you; ownership passes to you with the final payment.",
  },
];
