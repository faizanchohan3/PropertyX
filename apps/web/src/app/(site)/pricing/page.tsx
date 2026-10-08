import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { listPlans, gatewaysForCheckout, getActivePlan } from "@propertyx/core";
import { db, getUser } from "@/lib/server";
import { CheckoutButton } from "@/components/checkout-button";

export const metadata: Metadata = { title: "Pricing & plans", description: "Free for owners. Plans for agents, agencies, developers and enterprises.", alternates: { canonical: "/pricing" } };

export default async function PricingPage() {
  const user = await getUser();
  const [plans, current] = await Promise.all([listPlans(db), user ? getActivePlan(db, user.id) : null]);
  const gateways = gatewaysForCheckout();
  return (
    <div className="container-px py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold">Simple, transparent plans</h1>
        <p className="mt-3 text-slate-500">Owners list for free. Professionals get more reach, featured placement, CRM and analytics. Prices in PKR, billed monthly.</p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {plans.map((p) => {
          const isCurrent = current?.key === p.key;
          const highlight = p.key === "agent_pro";
          return (
            <div key={p.id} className={`card flex flex-col p-6 ${highlight ? "ring-2 ring-brand-600" : ""}`}>
              {highlight && <span className="badge mb-3 self-start bg-brand-700 text-white">Most popular</span>}
              <p className="text-lg font-bold">{p.name}</p>
              <p className="mt-1 min-h-10 text-sm text-slate-500">{p.description}</p>
              <p className="mt-4">
                {p.isContactSales ? (
                  <span className="text-2xl font-extrabold">Custom</span>
                ) : p.priceMonthly === 0 ? (
                  <span className="text-3xl font-extrabold">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold">Rs {p.priceMonthly.toLocaleString("en-PK")}</span>
                    <span className="text-sm text-slate-500"> /month</span>
                  </>
                )}
              </p>
              {p.priceYearly > 0 && <p className="text-xs text-slate-500">or Rs {p.priceYearly.toLocaleString("en-PK")} / year (2 months free)</p>}
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2">
                {isCurrent ? (
                  <span className="btn-outline pointer-events-none w-full">Current plan</span>
                ) : p.isContactSales ? (
                  <Link href="/help?topic=enterprise" className="btn-outline w-full">
                    Contact sales
                  </Link>
                ) : p.priceMonthly === 0 ? (
                  <Link href={user ? "/post-property" : "/register"} className="btn-outline w-full">
                    {user ? "Post a property" : "Get started"}
                  </Link>
                ) : user ? (
                  <>
                    <CheckoutButton purpose="subscription" referenceId={p.id} option="monthly" label="Subscribe monthly" gateways={gateways} />
                    <CheckoutButton purpose="subscription" referenceId={p.id} option="yearly" label="Pay yearly" className="btn-ghost w-full text-brand-700" gateways={gateways} />
                  </>
                ) : (
                  <Link href={`/login?next=/pricing`} className="btn-primary w-full">
                    Sign in to subscribe
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-center text-sm text-slate-500">Featured listings can also be bought individually from your dashboard: 7 days Rs 1,500 · 15 days Rs 2,500 · 30 days Rs 4,500.</p>
    </div>
  );
}
