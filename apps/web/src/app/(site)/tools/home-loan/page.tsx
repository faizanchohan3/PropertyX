import type { Metadata } from "next";
import { getSetting } from "@propertyx/core";
import { financingProductsFor, type FinancingProduct, COUNTRY, isUAE } from "@propertyx/shared";
import { db } from "@/lib/server";
import { HomeLoanCalculator } from "@/components/tools/home-loan-calculator";

export const metadata: Metadata = isUAE
  ? {
      title: "UAE mortgage calculator",
      description: "Work out your monthly mortgage payment in the UAE with the Central Bank loan-to-value limits for expats and nationals, plus DLD fees and the cash you need upfront.",
      alternates: { canonical: "/tools/home-loan" },
    }
  : {
      title: "Home loan & Islamic financing calculator",
      description: `Work out your monthly installment for a conventional home loan, Diminishing Musharakah, Ijarah or Murabaha in ${COUNTRY.inName}, with a year-by-year repayment schedule.`,
      alternates: { canonical: "/tools/home-loan" },
    };

export default async function HomeLoanPage({ searchParams }: { searchParams: Promise<{ price?: string }> }) {
  const initialPrice = Number((await searchParams).price) || undefined;
  const saved = await getSetting<FinancingProduct[]>(db, "financing_products").catch(() => null);
  const products = financingProductsFor(saved);
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{isUAE ? "Mortgage calculator" : "Home loan calculator"}</h1>
        <p className="mt-3 text-slate-500">
          {isUAE
            ? "See how much a UAE bank can lend you, your monthly payment, and the total cash you need on day one — down payment plus DLD and other buying costs."
            : "Compare conventional and Islamic home financing. See your monthly installment, the total cost of financing and how your balance falls year by year."}
        </p>
      </div>
      <HomeLoanCalculator products={products} initialPrice={initialPrice} />
    </div>
  );
}
