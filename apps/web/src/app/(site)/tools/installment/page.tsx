import type { Metadata } from "next";
import { InstallmentCalculator } from "@/components/tools/installment-calculator";

export const metadata: Metadata = {
  title: "Installment plan calculator",
  description: "Build a full payment schedule for any property installment plan: down payment, monthly and quarterly installments and a possession payment.",
  alternates: { canonical: "/tools/installment" },
};

export default function InstallmentPage() {
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Installment planner</h1>
        <p className="mt-3 text-slate-500">Work out the monthly installment for a project or plot payment plan, and see every payment with its due date.</p>
      </div>
      <InstallmentCalculator />
    </div>
  );
}
