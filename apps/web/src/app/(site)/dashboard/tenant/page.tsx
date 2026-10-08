import { tenantPortal } from "@propertyx/core";
import { formatPKR, formatPKRFull } from "@propertyx/shared";
import { requireUser, db } from "@/lib/server";
import { PageHeader, Panel, Empty, fmtDate } from "@/components/dashboard/ui";
import { StatusPill } from "@/components/badges";
import { TenantMaintenance } from "@/components/dashboard/tenant-maintenance";

export const metadata = { title: "My tenancy" };

export default async function TenantPage() {
  const user = await requireUser("/dashboard/tenant");
  const t = await tenantPortal(db, user);
  if (!t.leases.length)
    return (
      <div>
        <PageHeader title="My tenancy" />
        <Empty title="No lease linked to your account" body="Ask your landlord to add your lease on PropertyX using this account's email address. It will appear here automatically." />
      </div>
    );
  const active = t.leases.find((l) => l.l.status === "active") ?? t.leases[0];
  const mine = t.payments.filter((p) => p.leaseId === active.l.id);
  const nextDue = mine.filter((p) => p.status !== "paid").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return (
    <div className="space-y-6">
      <PageHeader title="My tenancy" subtitle={`${active.mp.name} · ${active.unit.label}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Monthly rent</p>
          <p className="mt-1 text-2xl font-extrabold">{formatPKR(active.l.monthlyRent)}</p>
          <p className="text-xs text-slate-500">Due on day {active.l.dueDay} of each month</p>
        </div>
        <div className={`card p-5 ${nextDue?.status === "overdue" ? "ring-1 ring-red-300" : ""}`}>
          <p className="text-xs font-semibold uppercase text-slate-500">Next payment</p>
          <p className="mt-1 text-2xl font-extrabold">{nextDue ? formatPKR(nextDue.amountDue - nextDue.amountPaid) : "All paid"}</p>
          <p className="text-xs text-slate-500">{nextDue ? `${nextDue.status === "overdue" ? "Overdue since" : "Due"} ${fmtDate(nextDue.dueDate)}` : "Nothing outstanding"}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Lease</p>
          <p className="mt-1 font-bold">
            {fmtDate(active.l.startDate)} – {fmtDate(active.l.endDate)}
          </p>
          <p className="text-xs text-slate-500">
            Landlord: {active.landlordName} · deposit {formatPKR(active.l.securityDeposit)}
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Payment history">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {mine.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{p.period}</td>
                  <td>{formatPKRFull(p.amountDue)}</td>
                  <td className="text-slate-500">
                    {p.paidAt ? fmtDate(p.paidAt) : ""} {p.method ?? ""}
                  </td>
                  <td className="text-right">
                    <StatusPill status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Maintenance requests">
          <TenantMaintenance leaseId={active.l.id} items={t.maintenance.map((m) => ({ id: m.id, title: m.title, status: m.status, createdAt: m.createdAt.toISOString(), priority: m.priority }))} />
        </Panel>
      </div>
      <Panel title="Lease terms & documents">
        <p className="whitespace-pre-line text-sm text-slate-700">{active.l.terms ?? "No terms recorded."}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {t.documents.map((d) => (
            <li key={d.id}>
              <a href={`/api/v1/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700">
                {d.originalName}
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
