"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Home, Users, Wallet, Wrench, Receipt, HardHat, Loader2, CheckCircle2, FileText } from "lucide-react";
import { formatPKR, formatPKRFull } from "@propertyx/shared";
import { api } from "@/lib/client";
import { Modal, FormError } from "../modal";
import { StatusPill } from "../badges";
import { toast } from "../toast";
import { StatCard, Panel } from "./ui";
import { Bars } from "./charts";

type Data = {
  properties: { id: string; name: string; address: string; cityName: string | null; ownerId: string; managerId: string | null }[];
  units: { id: string; managedPropertyId: string; label: string; beds: number | null; baths: number | null; areaSqft: number | null; marketRent: number | null; occupancy: string }[];
  leases: { id: string; unitId: string; tenantName: string; tenantPhone: string; tenantEmail: string | null; tenantUserId: string | null; startDate: string; endDate: string; monthlyRent: number; securityDeposit: number; dueDay: number; status: string; agreementDocumentId: string | null }[];
  payments: { id: string; leaseId: string; period: string; amountDue: number; amountPaid: number; dueDate: string; paidAt: string | null; method: string | null; status: string }[];
  maintenance: { id: string; unitId: string; title: string; description: string; category: string; priority: string; status: string; cost: number | null; createdAt: string }[];
  expenses: { id: string; managedPropertyId: string; category: string; description: string | null; amount: number; incurredOn: string }[];
  staff: { id: string; name: string; role: string; phone: string | null; monthlySalary: number | null }[];
  kpis: { units: number; occupied: number; occupancy: number; monthlyRent: number; outstanding: number; collectedThisMonth: number; expensesThisMonth: number; netIncomeThisMonth: number };
  trend: { month: string; income: number; expenses: number; net: number }[];
};

const TABS = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "properties", label: "Properties & units", icon: Building2 },
  { key: "leases", label: "Tenants & leases", icon: Users },
  { key: "rent", label: "Rent", icon: Wallet },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "staff", label: "Staff", icon: HardHat },
] as const;

export function RentalsWorkspace({ data }: { data: Data }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const [modal, setModal] = useState<null | "property" | "unit" | "lease" | "expense" | "staff" | "maintenance" | { pay: Data["payments"][number] }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const unitLabel = (id: string) => {
    const u = data.units.find((x) => x.id === id);
    const p = u && data.properties.find((x) => x.id === u.managedPropertyId);
    return u ? `${p?.name ?? ""} · ${u.label}` : "—";
  };
  const leaseOf = (id: string) => data.leases.find((l) => l.id === id);
  const post = async (action: string, body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/v1/rentals/${action}`, { body });
      toast(ok);
      setModal(null);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const form = (fields: { name: string; label: string; type?: string; options?: { v: string; l: string }[]; required?: boolean; def?: string }[], action: string, ok: string, extra: Record<string, unknown> = {}) => (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body: Record<string, unknown> = { ...extra };
        for (const f of fields) {
          const v = fd.get(f.name);
          if (v !== null && v !== "") body[f.name] = f.type === "number" ? Number(v) : v;
        }
        post(action, body, ok);
      }}
    >
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={`rf-${f.name}`}>{f.label}</label>
          {f.options ? (
            <select id={`rf-${f.name}`} name={f.name} className="input" defaultValue={f.def} required={f.required}>
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea id={`rf-${f.name}`} name={f.name} className="input min-h-20" required={f.required} defaultValue={f.def} />
          ) : (
            <input id={`rf-${f.name}`} name={f.name} type={f.type ?? "text"} className="input" required={f.required} defaultValue={f.def} />
          )}
        </div>
      ))}
      <FormError msg={err} />
      <button className="btn-primary w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </form>
  );
  const unitOptions = data.units.map((u) => ({ v: u.id, l: unitLabel(u.id) }));
  const today = new Date().toISOString().slice(0, 10);
  const inYear = new Date(Date.now() + 334 * 86400_000).toISOString().slice(0, 10);
  const dues = data.payments.filter((p) => p.status !== "paid" && p.status !== "waived");

  return (
    <div>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === t.key ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard dark label="Occupancy" value={`${data.kpis.occupancy}%`} hint={`${data.kpis.occupied} of ${data.kpis.units} units`} icon={Home} />
            <StatCard dark label="Monthly rent roll" value={formatPKR(data.kpis.monthlyRent)} icon={Wallet} />
            <StatCard dark label="Outstanding rent" value={formatPKR(data.kpis.outstanding)} hint={`${dues.length} unpaid dues`} icon={Receipt} />
            <StatCard dark label="Net income (this month)" value={formatPKR(data.kpis.netIncomeThisMonth)} hint={`${formatPKR(data.kpis.collectedThisMonth)} in − ${formatPKR(data.kpis.expensesThisMonth)} out`} icon={CheckCircle2} />
          </div>
          <Panel title="Income vs expenses (6 months)" dark>
            <Bars dark x="month" data={data.trend} series={[{ key: "income", label: "Rent collected" }, { key: "expenses", label: "Expenses" }]} formatY={(v) => formatPKR(v).replace("PKR ", "")} />
          </Panel>
          <Panel title="Rent due & overdue">
            <DuesTable dues={dues.slice(0, 8)} leaseOf={leaseOf} unitLabel={unitLabel} onPay={(p) => setModal({ pay: p })} />
          </Panel>
        </div>
      )}

      {tab === "properties" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setModal("property")}><Plus className="h-4 w-4" /> Add property</button>
            <button className="btn-outline" disabled={!data.properties.length} onClick={() => setModal("unit")}><Plus className="h-4 w-4" /> Add unit</button>
          </div>
          {data.properties.map((p) => (
            <Panel key={p.id} title={p.name} actions={<span className="text-xs text-slate-500">{p.address}</span>}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.units.filter((u) => u.managedPropertyId === p.id).map((u) => {
                  const lease = data.leases.find((l) => l.unitId === u.id && l.status === "active");
                  return (
                    <div key={u.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between"><p className="font-semibold">{u.label}</p><StatusPill status={u.occupancy} /></div>
                      <p className="mt-1 text-xs text-slate-500">{[u.beds != null && `${u.beds} bed`, u.baths != null && `${u.baths} bath`, u.areaSqft && `${u.areaSqft} sq ft`].filter(Boolean).join(" · ")}</p>
                      <p className="mt-2 text-sm">{lease ? <>Tenant: <b>{lease.tenantName}</b> · {formatPKR(lease.monthlyRent)}/mo</> : <span className="text-slate-500">Vacant{u.marketRent ? ` · market rent ${formatPKR(u.marketRent)}` : ""}</span>}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          ))}
          {!data.properties.length && <p className="text-sm text-slate-500">Add your first property to start tracking rent.</p>}
        </div>
      )}

      {tab === "leases" && (
        <div className="space-y-3">
          <button className="btn-primary" disabled={!data.units.length} onClick={() => setModal("lease")}><Plus className="h-4 w-4" /> New lease</button>
          {data.leases.map((l) => (
            <div key={l.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2"><p className="font-semibold">{l.tenantName}</p><StatusPill status={l.status} />{l.tenantUserId && <span className="badge bg-brand-50 text-brand-700">Has tenant portal</span>}</div>
                <p className="text-sm text-slate-500">{unitLabel(l.unitId)} · {formatPKR(l.monthlyRent)}/mo · due day {l.dueDay}</p>
                <p className="text-xs text-slate-400">{l.startDate} → {l.endDate} · deposit {formatPKR(l.securityDeposit)} · {l.tenantPhone.replace("+92", "0")}</p>
              </div>
              <div className="flex gap-2">
                {l.agreementDocumentId && <a href={`/api/v1/documents/${l.agreementDocumentId}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><FileText className="h-3.5 w-3.5" /> Agreement</a>}
                {l.status === "active" && <button className="btn-outline btn-sm text-red-600" onClick={() => confirm(`End the lease for ${l.tenantName}?`) && post("end-lease", { leaseId: l.id }, "Lease ended")}>End lease</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "rent" && (
        <Panel title="All rent dues">
          <DuesTable dues={data.payments} leaseOf={leaseOf} unitLabel={unitLabel} onPay={(p) => setModal({ pay: p })} />
          <p className="mt-3 text-xs text-slate-500">Dues are generated automatically each month for active leases. Tenants with a Bismillah account receive reminders 3 days before and on the due date.</p>
        </Panel>
      )}

      {tab === "maintenance" && (
        <div className="space-y-3">
          <button className="btn-primary" disabled={!data.units.length} onClick={() => setModal("maintenance")}><Plus className="h-4 w-4" /> Log request</button>
          {data.maintenance.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><p className="font-semibold">{m.title}</p><StatusPill status={m.status} /><span className={`badge ${m.priority === "urgent" || m.priority === "high" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{m.priority}</span></div>
                <select aria-label="Status" className="input w-auto py-1.5 text-xs" value={m.status} onChange={(e) => { const cost = e.target.value === "resolved" ? prompt("Repair cost in PKR (optional — added to expenses)") : null; post("maintenance-update", { id: m.id, status: e.target.value, cost: cost ? Number(cost) : undefined }, "Updated"); }}>
                  {["open", "in_progress", "resolved", "closed"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <p className="mt-1 text-sm text-slate-600">{m.description}</p>
              <p className="mt-1 text-xs text-slate-400">{unitLabel(m.unitId)} · {m.category} · {new Date(m.createdAt).toLocaleDateString("en-PK")}{m.cost ? ` · cost ${formatPKR(m.cost)}` : ""}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "expenses" && (
        <Panel title="Expenses" actions={<button className="btn-primary btn-sm" disabled={!data.properties.length} onClick={() => setModal("expense")}><Plus className="h-3.5 w-3.5" /> Add expense</button>}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="pb-2">Date</th><th className="pb-2">Property</th><th className="pb-2">Category</th><th className="pb-2">Description</th><th className="pb-2 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.expenses.map((e) => <tr key={e.id}><td className="py-2">{e.incurredOn}</td><td>{data.properties.find((p) => p.id === e.managedPropertyId)?.name}</td><td className="capitalize">{e.category}</td><td>{e.description}</td><td className="text-right font-semibold">{formatPKRFull(e.amount)}</td></tr>)}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "staff" && (
        <Panel title="Staff" actions={<button className="btn-primary btn-sm" onClick={() => setModal("staff")}><Plus className="h-3.5 w-3.5" /> Add staff</button>}>
          {data.staff.length === 0 ? <p className="text-sm text-slate-500">No staff added.</p> : (
            <ul className="divide-y divide-slate-100">
              {data.staff.map((s) => <li key={s.id} className="flex justify-between py-2 text-sm"><span><b>{s.name}</b> · <span className="capitalize">{s.role}</span></span><span className="text-slate-500">{s.phone?.replace("+92", "0")}{s.monthlySalary ? ` · ${formatPKR(s.monthlySalary)}/mo` : ""}</span></li>)}
            </ul>
          )}
        </Panel>
      )}

      <Modal open={modal === "property"} onClose={() => setModal(null)} title="Add property">
        {form([{ name: "name", label: "Name (e.g. Johar Town House)", required: true }, { name: "address", label: "Address", required: true }, { name: "cityName", label: "City" }, { name: "managerEmail", label: "Property manager's Bismillah email (optional)", type: "email" }, { name: "notes", label: "Notes", type: "textarea" }], "property", "Property added")}
      </Modal>
      <Modal open={modal === "unit"} onClose={() => setModal(null)} title="Add unit">
        {form([{ name: "managedPropertyId", label: "Property", options: data.properties.map((p) => ({ v: p.id, l: p.name })) }, { name: "label", label: "Unit label (e.g. Ground floor, Flat 101)", required: true }, { name: "beds", label: "Bedrooms", type: "number" }, { name: "baths", label: "Bathrooms", type: "number" }, { name: "areaSqft", label: "Area (sq ft)", type: "number" }, { name: "marketRent", label: "Market rent (PKR)", type: "number" }], "unit", "Unit added")}
      </Modal>
      <Modal open={modal === "lease"} onClose={() => setModal(null)} title="New lease">
        {form([{ name: "unitId", label: "Unit", options: unitOptions }, { name: "tenantName", label: "Tenant name", required: true }, { name: "tenantPhone", label: "Tenant mobile", required: true }, { name: "tenantEmail", label: "Tenant email (links their Bismillah account)", type: "email" }, { name: "startDate", label: "Start date", type: "date", def: today, required: true }, { name: "endDate", label: "End date", type: "date", def: inYear, required: true }, { name: "monthlyRent", label: "Monthly rent (PKR)", type: "number", required: true }, { name: "securityDeposit", label: "Security deposit (PKR)", type: "number" }, { name: "dueDay", label: "Rent due day (1–28)", type: "number", def: "5" }, { name: "annualIncreasePct", label: "Annual increase %", type: "number", def: "10" }, { name: "terms", label: "Key terms", type: "textarea" }], "lease", "Lease created — rent dues generated")}
      </Modal>
      <Modal open={modal === "maintenance"} onClose={() => setModal(null)} title="Log maintenance request">
        {form([{ name: "unitId", label: "Unit", options: unitOptions }, { name: "title", label: "Title", required: true }, { name: "description", label: "Details", type: "textarea", required: true }, { name: "category", label: "Category", options: ["general", "plumbing", "electrical", "appliance", "structural", "cleaning", "pest"].map((v) => ({ v, l: v })) }, { name: "priority", label: "Priority", def: "normal", options: ["low", "normal", "high", "urgent"].map((v) => ({ v, l: v })) }], "maintenance", "Request logged")}
      </Modal>
      <Modal open={modal === "expense"} onClose={() => setModal(null)} title="Add expense">
        {form([{ name: "managedPropertyId", label: "Property", options: data.properties.map((p) => ({ v: p.id, l: p.name })) }, { name: "category", label: "Category", options: ["repairs", "utilities", "tax", "salaries", "insurance", "other"].map((v) => ({ v, l: v })) }, { name: "description", label: "Description" }, { name: "amount", label: "Amount (PKR)", type: "number", required: true }, { name: "incurredOn", label: "Date", type: "date", def: today, required: true }], "expense", "Expense added")}
      </Modal>
      <Modal open={modal === "staff"} onClose={() => setModal(null)} title="Add staff member">
        {form([{ name: "name", label: "Name", required: true }, { name: "role", label: "Role", options: ["caretaker", "guard", "electrician", "plumber", "cleaner", "accountant", "other"].map((v) => ({ v, l: v })) }, { name: "phone", label: "Mobile" }, { name: "monthlySalary", label: "Monthly salary (PKR)", type: "number" }], "staff", "Staff added")}
      </Modal>
      <Modal open={!!modal && typeof modal === "object"} onClose={() => setModal(null)} title="Record rent payment">
        {modal && typeof modal === "object" && (
          <>
            <p className="mb-3 text-sm text-slate-600">{leaseOf(modal.pay.leaseId)?.tenantName} · {modal.pay.period} · balance {formatPKR(modal.pay.amountDue - modal.pay.amountPaid)}</p>
            {form([{ name: "amount", label: "Amount received (PKR)", type: "number", def: String(modal.pay.amountDue - modal.pay.amountPaid), required: true }, { name: "method", label: "Method", options: ["Bank transfer", "Raast", "Cash", "Cheque", "JazzCash", "Easypaisa"].map((v) => ({ v, l: v })) }, { name: "reference", label: "Reference / cheque no." }], "payment", "Payment recorded", { paymentId: modal.pay.id })}
          </>
        )}
      </Modal>
    </div>
  );
}

function DuesTable({ dues, leaseOf, unitLabel, onPay }: { dues: Data["payments"]; leaseOf: (id: string) => Data["leases"][number] | undefined; unitLabel: (id: string) => string; onPay: (p: Data["payments"][number]) => void }) {
  if (!dues.length) return <p className="text-sm text-slate-500">Nothing due. 🎉</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="pb-2">Period</th><th className="pb-2">Tenant</th><th className="pb-2">Unit</th><th className="pb-2">Due</th><th className="pb-2 text-right">Amount</th><th className="pb-2 text-right">Status</th><th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {dues.map((p) => {
            const l = leaseOf(p.leaseId);
            return (
              <tr key={p.id}>
                <td className="py-2">{p.period}</td>
                <td>{l?.tenantName}</td>
                <td className="text-slate-500">{l ? unitLabel(l.unitId) : ""}</td>
                <td>{p.dueDate}</td>
                <td className="text-right font-semibold">{formatPKRFull(p.amountDue)}{p.amountPaid > 0 && p.amountPaid < p.amountDue && <span className="block text-xs text-slate-500">paid {formatPKRFull(p.amountPaid)}</span>}</td>
                <td className="text-right"><StatusPill status={p.status} /></td>
                <td className="pl-2 text-right">{p.status !== "paid" && <button onClick={() => onPay(p)} className="btn-outline btn-sm">Record payment</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
