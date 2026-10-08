import Link from "next/link";
import { listPlans, listAllPayments, listAllSubscriptions } from "@propertyx/core";
import { formatPKRFull } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkPill, th, td, darkBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";
import { PlanEditor } from "@/components/admin/plan-editor";

export const metadata = { title: "Plans & payments" };

export default async function AdminBilling({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  const user = await requirePermission("billing.manage", "/admin/billing");
  const sp = await searchParams;
  const tab = sp.tab ?? "payments";
  return (
    <div>
      <AdminHeader title="Plans & payments" subtitle="Subscription packages, transactions and refunds. Gateways are configured with PAYMENT_GATEWAYS." />
      <AdminTabs param="tab" active={tab} tabs={[{ key: "payments", label: "Payments" }, { key: "subscriptions", label: "Subscriptions" }, { key: "plans", label: "Plans" }]} />
      {tab === "plans" && <Plans />}
      {tab === "subscriptions" && <Subs user={user} />}
      {tab === "payments" && <Payments user={user} status={sp.status ?? "all"} />}
    </div>
  );
}

async function Plans() {
  const plans = await listPlans(db);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((p) => (
        <PlanEditor key={p.id} plan={{ id: p.id, key: p.key, name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, listingQuota: p.listingQuota, featuredQuota: p.featuredQuota, agentSeats: p.agentSeats, isActive: p.isActive, features: p.features }} />
      ))}
    </div>
  );
}

async function Subs({ user }: { user: Parameters<typeof listAllSubscriptions>[1] }) {
  const rows = await listAllSubscriptions(db, user);
  return (
    <div className="dark-panel overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-white/10"><tr>{["Customer", "Plan", "Cycle", "Period end", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(({ sub, plan, userName, email }) => (
            <tr key={sub.id}><td className={td}><p className="text-white">{userName}</p><p className="text-xs text-slate-500">{email}</p></td><td className={td}>{plan}</td><td className={td}>{sub.billingCycle}</td><td className={td}>{sub.currentPeriodEnd.toLocaleDateString("en-PK")}{sub.cancelAtPeriodEnd ? " (cancelling)" : ""}</td><td className={td}><DarkPill s={sub.status} /></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Payments({ user, status }: { user: Parameters<typeof listAllPayments>[1]; status: string }) {
  const rows = await listAllPayments(db, user, status);
  return (
    <>
      <div className="mb-3 flex gap-2">
        {["all", "succeeded", "pending", "failed", "refunded"].map((s) => (
          <Link key={s} href={`?tab=payments&status=${s}`} className={`${darkBtn} ${s === status ? "border-gold-400 text-gold-300" : ""}`}>{s}</Link>
        ))}
      </div>
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-white/10"><tr>{["Invoice", "Customer", "Description", "Gateway", "Date", "Amount", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(({ p, userName, email }) => (
              <tr key={p.id}>
                <td className={td}><Link href={`/dashboard/billing/invoice/${p.invoiceNumber}`} className="text-gold-300 hover:underline">{p.invoiceNumber}</Link></td>
                <td className={td}><p className="text-white">{userName}</p><p className="text-xs text-slate-500">{email}</p></td>
                <td className={td}>{p.description}</td>
                <td className={td}>{p.provider}<p className="text-xs text-slate-500">{p.providerRef}</p></td>
                <td className={td}>{(p.paidAt ?? p.createdAt).toLocaleDateString("en-PK")}</td>
                <td className={`${td} font-semibold text-white`}>{formatPKRFull(p.amount)}</td>
                <td className={td}><DarkPill s={p.status} /></td>
                <td className={td}>{p.status === "succeeded" && <AdminAction action="payment.refund" payload={{ id: p.id }} label="Mark refunded" className={darkBtn} promptFor={{ key: "reason", label: "Refund reason (process the refund in the gateway portal)" }} promptRequired />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-slate-400">No payments.</p>}
      </div>
    </>
  );
}
