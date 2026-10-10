import type { Metadata } from "next";
import { getSetting } from "@propertyx/core";
import { DEFAULT_FINANCING_PRODUCTS, type FinancingProduct } from "@propertyx/shared";
import { db } from "@/lib/server";
import { HomeLoanCalculator } from "@/components/tools/home-loan-calculator";

export const metadata: Metadata = {
  title: "Home loan & Islamic financing calculator",
  description: "Work out your monthly installment for a conventional home loan, Diminishing Musharakah, Ijarah or Murabaha in Pakistan, with a year-by-year repayment schedule.",
  alternates: { canonical: "/tools/home-loan" },
};

export const revalidate = 3600;

export default async function HomeLoanPage() {
  const saved = await getSetting<FinancingProduct[]>(db, "financing_products").catch(() => null);
  const products = Array.isArray(saved) && saved.length ? saved : DEFAULT_FINANCING_PRODUCTS;
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Home loan calculator</h1>
        <p className="mt-3 text-slate-500">Compare conventional and Islamic home financing. See your monthly installment, the total cost of financing and how your balance falls year by year.</p>
      </div>
      <HomeLoanCalculator products={products} />
    </div>
  );
}
