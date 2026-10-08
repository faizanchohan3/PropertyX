import Link from "next/link";
import { CheckCircle2, XCircle, Receipt } from "lucide-react";
import { billingOverview, getPaymentByInvoice } from "@propertyx/core";
import { formatPKRFull } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { PageHeader, Panel, fmtDate } from "@/components/dashboard/ui";
import { StatusPill } from "@/components/badges";
import { CancelSubscription } from "@/components/dashboard/cancel-subscription";

export const metadata = { title: "Plan & billing" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requirePermission("subscription.purchase", "/dashboard/billing");
  const sp = await searchParams;
  const [o, justPaid] = await Promise.all([billingOverview(db, user), sp.payment ? getPaymentByInvoice(db, sp.payment) : null]);
  const sub = o.plan.subscription;
  const pct = (n: number, d: number) => (d ? Math.min(100, Math.round((n / d) * 100)) : 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Plan & billing" subtitle="Your subscription, usage and invoices." />
      {justPaid && justPaid.userId === user.id && (
        <div className={`flex items-center gap-3 rounded-2xl p-4 text-sm ${justPaid.status === "succeeded" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {justPaid.status === "succeeded" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {justPaid.status === "succeeded" ? `Payment received — ${justPaid.description}. Thank you!` : `Payment ${justPaid.status}. ${justPaid.failureReason ?? "No money was taken."}`}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Current plan" className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-extrabold">{o.plan.name}</p>
              <p className="text-sm text-slate-500">
                {sub ? (
                  <>
                    {sub.billingCycle === "yearly" ? "Yearly" : "Monthly"} · {sub.cancelAtPeriodEnd ? "ends" : "renews"} on {fmtDate(sub.currentPeriodEnd)}
                  </>
                ) : (
                  "Free forever — upgrade any time"
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/pricing" className="btn-primary">
                {sub ? "Change plan" : "Upgrade"}
              </Link>
              {sub && !sub.cancelAtPeriodEnd && <CancelSubscription />}
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Active listings</span>
                <b>
                  {o.usage.listings} / {o.plan.listingQuota}
                </b>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${pct(o.usage.listings, o.plan.listingQuota) > 90 ? "bg-red-500" : "bg-brand-600"}`} style={{ width: `${pct(o.usage.listings, o.plan.listingQuota)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Featured credits used</span>
                <b>
                  {sub?.featuredCreditsUsed ?? 0} / {o.plan.featuredQuota}
                </b>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-gold-500" style={{ width: `${pct(sub?.featuredCreditsUsed ?? 0, o.plan.featuredQuota)}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{o.usage.featured} listing(s) currently featured</p>
            </div>
          </div>
        </Panel>
        <Panel title="Plan includes">
          <ul className="space-y-2 text-sm">
            {o.plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Payments & invoices">
        {o.payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 font-semibold">Invoice</th>
                  <th className="py-2 font-semibold">Description</th>
                  <th className="py-2 font-semibold">Date</th>
                  <th className="py-2 font-semibold">Method</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                  <th className="py-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {o.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5">
                      <Link href={`/dashboard/billing/invoice/${p.invoiceNumber}`} className="flex items-center gap-1 font-medium text-brand-700">
                        <Receipt className="h-3.5 w-3.5" /> {p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2.5">{p.description}</td>
                    <td className="py-2.5 text-slate-500">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                    <td className="py-2.5 capitalize text-slate-500">{p.provider}</td>
                    <td className="py-2.5 text-right font-semibold">{formatPKRFull(p.amount)}</td>
                    <td className="py-2.5 text-right">
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
