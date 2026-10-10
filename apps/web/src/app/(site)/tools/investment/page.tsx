import type { Metadata } from "next";
import { InvestmentCalculator } from "@/components/tools/investment-calculator";

export const metadata: Metadata = {
  title: "Property investment calculator — yield, ROI and cash flow",
  description: "Analyse a property investment in Pakistan: rental yield, cash flow, appreciation, ROI, break-even and a clear investment score.",
  alternates: { canonical: "/tools/investment" },
};

export default function InvestmentPage() {
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Investment advisor</h1>
        <p className="mt-3 text-slate-500">See the rental yield, cash flow, total return and break-even point of a property, with a score that explains what drives it.</p>
      </div>
      <InvestmentCalculator />
    </div>
  );
}
