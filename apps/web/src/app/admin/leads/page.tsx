import Link from "next/link";
import { Download, MessageCircle, Phone, Mail } from "lucide-react";
import { getSetting, leadWebhookConfig, listLeads, type LeadWebhookSetting } from "@propertyx/core";
import { COUNTRY, formatPKR } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkCard, darkBtn, okBtn, badBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";
import { LeadWebhookForm } from "@/components/admin/lead-webhook-form";

export const metadata = { title: "Leads" };

const SOURCES: Record<string, string> = {
  form: "Enquiry",
  call: "Call button",
  whatsapp: "WhatsApp",
  chat: "Chat",
  visit: "Visit",
  offer: "Offer",
  payment_plan: "Payment plan",
  brochure: "Brochure",
  ai_assistant: "AI assistant",
  mortgage: "Mortgage calculator",
  valuation: "Valuation",
  tool: "Calculator",
};
const STATUSES = ["new", "contacted", "qualified", "negotiation", "won", "lost"];

export default async function AdminLeads({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const user = await requirePermission("support.access", "/admin/leads");
  const sp = await searchParams;
  const view = sp.view === "all" ? "all" : "team";
  const status = STATUSES.includes(sp.status ?? "") ? sp.status! : "all";
  const canSettings = user.permissions.includes("settings.manage");
  const [leads, hookSetting, hook] = await Promise.all([
    listLeads(db, user, { scope: view === "all" ? "all" : "platform", status }),
    canSettings ? getSetting<LeadWebhookSetting>(db, "lead_webhook").catch(() => undefined) : Promise.resolve(undefined),
    leadWebhookConfig(db).catch(() => null),
  ]);
  const extra = `&view=${view}`;
  return (
    <div>
      <AdminHeader
        title="Leads"
        subtitle={view === "team" ? "Call-back requests from the calculators and valuation tool. Nobody else gets these — call them back." : "Every lead on the site, across all agents, agencies and developers."}
        actions={
          <a href={`/api/v1/leads/export?scope=${view === "all" ? "all" : "platform"}`} className={darkBtn}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        }
      />
      <div className="mb-3 flex gap-1 text-sm font-semibold">
        <Link href="/admin/leads" className={`rounded-lg px-3 py-1.5 ${view === "team" ? "bg-white/10 text-white" : "text-slate-400"}`}>Site team leads</Link>
        <Link href="/admin/leads?view=all" className={`rounded-lg px-3 py-1.5 ${view === "all" ? "bg-white/10 text-white" : "text-slate-400"}`}>All leads</Link>
      </div>
      <AdminTabs active={status} extra={extra} tabs={[{ key: "all", label: "All" }, ...STATUSES.map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))]} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {leads.length === 0 && (
            <DarkCard>
              <p className="text-sm text-slate-400">No leads yet.</p>
            </DarkCard>
          )}
          {leads.map((l) => {
            const wa = l.phone.replace(/\D/g, "");
            const tier = l.aiScore == null ? null : l.aiScore >= 70 ? "Hot" : l.aiScore >= 45 ? "Warm" : "Cold";
            return (
              <DarkCard key={l.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge bg-white/10 capitalize text-slate-200">{l.status}</span>
                      <span className="badge bg-gold-400/15 text-gold-300">{SOURCES[l.source] ?? l.source}</span>
                      {tier && <span className={`badge ${tier === "Hot" ? "bg-red-500/15 text-red-300" : tier === "Warm" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}>{tier} · {l.aiScore}</span>}
                      <span className="text-xs text-slate-500">{new Date(l.createdAt).toLocaleString(COUNTRY.locale, { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    <p className="mt-2 font-semibold text-white">{l.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
                      {l.phone && <span>{l.phone}</span>}
                      {l.email && <span>{l.email}</span>}
                    </div>
                    {(l.listingTitle || l.projectName) && (
                      <p className="mt-1 text-sm text-slate-400">
                        On{" "}
                        {l.listingSlug ? (
                          <Link href={`/property/${l.listingSlug}`} target="_blank" className="text-gold-300 hover:underline">{l.listingTitle}</Link>
                        ) : l.projectSlug ? (
                          <Link href={`/project/${l.projectSlug}`} target="_blank" className="text-gold-300 hover:underline">{l.projectName}</Link>
                        ) : null}
                        {l.offerAmount ? ` · offer ${formatPKR(l.offerAmount)}` : ""}
                        {view === "all" && l.recipientName ? ` · to ${l.recipientName}` : ""}
                      </p>
                    )}
                    {l.message && <p className="mt-2 whitespace-pre-line rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">{l.message}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {l.phone && (
                      <div className="flex gap-1.5">
                        <a href={`tel:${l.phone}`} className={darkBtn}><Phone className="h-3.5 w-3.5" /> Call</a>
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={darkBtn}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
                        {l.email && <a href={`mailto:${l.email}`} className={darkBtn}><Mail className="h-3.5 w-3.5" /></a>}
                      </div>
                    )}
                    {view === "team" && (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {l.status === "new" && <AdminAction action="lead.update" payload={{ id: l.id, status: "contacted" }} label="Contacted" className={darkBtn} />}
                        {["new", "contacted"].includes(l.status) && <AdminAction action="lead.update" payload={{ id: l.id, status: "qualified" }} label="Qualified" className={darkBtn} />}
                        {!["won", "lost"].includes(l.status) && <AdminAction action="lead.update" payload={{ id: l.id, status: "won" }} label="Won" className={okBtn} />}
                        {!["won", "lost"].includes(l.status) && <AdminAction action="lead.update" payload={{ id: l.id, status: "lost" }} label="Lost" className={badBtn} />}
                        <AdminAction action="lead.update" payload={{ id: l.id }} label="Note" className={darkBtn} promptFor={{ key: "notes", label: "Note for this lead" }} done="Note saved" />
                      </div>
                    )}
                    {l.notes && <p className="max-w-60 text-right text-xs text-slate-400">Note: {l.notes}</p>}
                  </div>
                </div>
              </DarkCard>
            );
          })}
        </div>

        <div className="space-y-4">
          <DarkCard>
            <p className="font-semibold text-white">Send leads to other tools</p>
            <p className="mt-1 text-sm text-slate-400">
              Every new lead — enquiries, WhatsApp and call taps, offers and calculator requests — is sent as JSON to this URL. Works with Zapier, Make, Google Sheets (Apps Script), HubSpot, Pipedrive or your own CRM.
            </p>
            <p className={`mt-2 text-xs font-semibold ${hook ? "text-emerald-300" : "text-slate-500"}`}>{hook ? "On — new leads are being sent" : "Off"}</p>
            <div className="mt-3">
              {canSettings ? <LeadWebhookForm initial={hookSetting ?? null} envUrl={!!process.env.LEADS_WEBHOOK_URL} /> : <p className="text-xs text-slate-500">Only admins can change this.</p>}
            </div>
          </DarkCard>
          <DarkCard>
            <p className="font-semibold text-white">Spreadsheet / CRM import</p>
            <p className="mt-1 text-sm text-slate-400">Download a CSV and open it in Excel or Google Sheets, or import it into any CRM. Agents can export their own leads from Dashboard → Leads.</p>
            <a href={`/api/v1/leads/export?scope=${view === "all" ? "all" : "platform"}`} className={`${darkBtn} mt-3`}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          </DarkCard>
        </div>
      </div>
    </div>
  );
}
