import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isUAE } from "@propertyx/shared";
import { BuyingCostsCalculator } from "@/components/tools/buying-costs-calculator";

export const metadata: Metadata = {
  title: "UAE property buying costs calculator (DLD fees)",
  description: "Work out the DLD transfer fee, trustee, mortgage registration, agent and bank fees when you buy property in Dubai, Abu Dhabi or Sharjah.",
  alternates: { canonical: "/tools/buying-costs" },
};

export default async function BuyingCostsPage({ searchParams }: { searchParams: Promise<{ price?: string }> }) {
  if (!isUAE) notFound();
  const initialPrice = Number((await searchParams).price) || undefined;
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Buying costs calculator</h1>
        <p className="mt-3 text-slate-500">Everything you pay on top of the price when you buy in the UAE — the 4% DLD transfer fee, registration, trustee, agent and mortgage fees — and the total cash you need on transfer day.</p>
      </div>
      <BuyingCostsCalculator initialPrice={initialPrice} />
    </div>
  );
}
