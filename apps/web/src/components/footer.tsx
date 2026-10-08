import Link from "next/link";
import { Logo } from "./logo";
import { CITY_LINKS } from "./nav-data";
import { isDemoMode } from "@/lib/server";

export async function Footer() {
  const demo = await isDemoMode();
  const cols = [
    { title: "Buy", links: CITY_LINKS.map((c) => ({ label: `Property in ${c.name}`, href: `/buy/property/${c.slug}` })) },
    { title: "Rent", links: CITY_LINKS.slice(0, 6).map((c) => ({ label: `Rent in ${c.name}`, href: `/rent/property/${c.slug}` })) },
    {
      title: "Tools",
      links: [
        { label: "AI Property Assistant", href: "/ai" },
        { label: "Property Valuation", href: "/tools/property-value" },
        { label: "Investment Advisor", href: "/tools/investment" },
        { label: "Home Finance", href: "/tools/home-loan" },
        { label: "Construction Cost", href: "/tools/construction-cost" },
        { label: "Price Index", href: "/price-index" },
      ],
    },
    {
      title: "PropertyX",
      links: [
        { label: "Post a property", href: "/post-property" },
        { label: "Pricing", href: "/pricing" },
        { label: "Guides & News", href: "/blog" },
        { label: "Community", href: "/forum" },
        { label: "Help & Support", href: "/help" },
        { label: "Safety tips", href: "/safety" },
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
      ],
    },
  ];
  return (
    <footer className="mt-20 bg-night pb-24 text-slate-300 md:pb-0">
      {demo && (
        <div className="border-b border-white/10 bg-gold-500/10 py-2 text-center text-xs text-gold-200">
          Demo environment — listings, agents, agencies, developers and projects shown here are sample data generated for demonstration and do not represent real offers.
        </div>
      )}
      <div className="container-px grid gap-10 py-14 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">Pakistan's intelligent property marketplace — verified listings, transparent pricing data and AI that explains every match.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-sm font-semibold text-white">{c.title}</p>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-400 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-px flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} PropertyX Pakistan. All rights reserved.</p>
          <p>Prices and estimates are indicative. Always verify ownership documents before paying.</p>
        </div>
      </div>
    </footer>
  );
}
