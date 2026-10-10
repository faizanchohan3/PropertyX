import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Flame, Hammer, Landmark, LineChart, MapPinned, Ruler, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Free property calculators and tools",
  description: "Free calculators for Pakistani property: valuation, investment, home finance, installment plans, construction cost and area units.",
  alternates: { canonical: "/tools" },
};

const TOOLS: { label: string; desc: string; href: string; icon: LucideIcon }[] = [
  { label: "AI Property Assistant", desc: "Describe what you need in plain words.", href: "/ai", icon: Sparkles },
  { label: "What's My Property Worth?", desc: "Indicative value from comparable listings.", href: "/tools/property-value", icon: LineChart },
  { label: "Investment Advisor", desc: "Yield, ROI, cash flow and a clear score.", href: "/tools/investment", icon: TrendingUp },
  { label: "Home Finance", desc: "Conventional and Islamic financing.", href: "/tools/home-loan", icon: Landmark },
  { label: "Installment Planner", desc: "Full schedule for any payment plan.", href: "/tools/installment", icon: Calculator },
  { label: "Construction Cost", desc: "Grey structure to finishing, itemised.", href: "/tools/construction-cost", icon: Hammer },
  { label: "Area Unit Converter", desc: "Marla, kanal, sq ft, sq yd and more.", href: "/tools/area-unit-converter", icon: Ruler },
  { label: "Property Index", desc: "How prices and rents are moving.", href: "/price-index", icon: LineChart },
  { label: "Property Trends", desc: "The most popular areas right now.", href: "/trends", icon: Flame },
  { label: "Area Guides", desc: "Housing societies and neighbourhoods.", href: "/areas", icon: MapPinned },
];

export default function ToolsPage() {
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Smarter decisions</h1>
        <p className="mt-3 text-slate-500">Free calculators and market data built for Pakistani property.</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card group flex items-start gap-4 p-5 hover:border-brand-300">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <t.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-slate-900 group-hover:text-brand-700">{t.label}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{t.desc}</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
          </Link>
        ))}
      </div>
    </div>
  );
}
