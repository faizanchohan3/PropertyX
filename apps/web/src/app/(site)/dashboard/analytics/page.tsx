import Link from "next/link";
import { Eye, MessageSquare, Users, Trophy, Clock, Building2, FileDown, CalendarCheck } from "lucide-react";
import { listingAnalytics, agencyAnalytics, developerAnalytics, myAgency } from "@propertyx/core";
import { formatPKR } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { PageHeader, StatCard, Panel } from "@/components/dashboard/ui";
import { TrendChart, Bars } from "@/components/dashboard/charts";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; view?: string }> }) {
  const user = await requirePermission("analytics.own", "/dashboard/analytics");
  const sp = await searchParams;
  const days = Math.min(365, Math.max(7, Number(sp.days ?? 30)));
  const agency = await myAgency(db, user);
  const agencyView = !!agency && ["admin", "manager", "marketing"].includes(agency.role);
  const [mine, team, dev] = await Promise.all([listingAnalytics(db, user, { days }), agencyView ? agencyAnalytics(db, user, days) : null, user.roles.includes("developer") ? developerAnalytics(db, user, days) : null]);
  const a = sp.view === "agency" && team ? team.overall : mine;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Engagement on your listings. Figures update in real time."
        actions={
          <div className="flex gap-2">
            {[7, 30, 90, 365].map((d) => (
              <Link key={d} href={`?days=${d}${sp.view ? `&view=${sp.view}` : ""}`} className={`chip text-xs ${d === days ? "chip-active" : ""}`}>
                {d === 365 ? "1 year" : `${d} days`}
              </Link>
            ))}
          </div>
        }
      />
      {team && (
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold sm:w-fit">
          <Link href={`?days=${days}`} className={`rounded-lg px-3 py-1.5 ${sp.view !== "agency" ? "bg-white shadow-sm" : "text-slate-500"}`}>My listings</Link>
          <Link href={`?days=${days}&view=agency`} className={`rounded-lg px-3 py-1.5 ${sp.view === "agency" ? "bg-white shadow-sm" : "text-slate-500"}`}>{team.agency.name}</Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard dark label="Views" value={a.funnel.view.toLocaleString()} icon={Eye} />
        <StatCard dark label="Enquiries" value={a.enquiries} hint={`${a.conversionRate}% conversion`} icon={MessageSquare} />
        <StatCard dark label="Leads" value={a.leads.total} hint={`${a.leads.new} new`} icon={Users} />
        <StatCard dark label="Deals won" value={a.leads.won} hint={`${a.leads.conversionPct}% of leads`} icon={Trophy} />
        <StatCard dark label="Avg. response" value={a.leads.avgResponseMins != null ? `${a.leads.avgResponseMins} min` : "—"} icon={Clock} />
      </div>
      <Panel title="Daily activity" dark>
        <TrendChart dark data={a.daily} x="day" series={[{ key: "views", label: "Views" }, { key: "enquiries", label: "Enquiries" }, { key: "saves", label: "Saves" }]} height={300} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Enquiry channels" dark>
          <Bars
            dark
            x="channel"
            series={[{ key: "count", label: "Count" }]}
            data={[
              { channel: "Calls", count: a.funnel.call_click + a.funnel.phone_reveal },
              { channel: "WhatsApp", count: a.funnel.whatsapp_click },
              { channel: "Messages", count: a.funnel.message },
              { channel: "Forms", count: a.funnel.lead },
              { channel: "Visits", count: a.funnel.visit_request },
            ]}
          />
        </Panel>
        <Panel title="Top listings" dark>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="pb-2 font-semibold">Listing</th><th className="pb-2 text-right font-semibold">Views</th><th className="pb-2 text-right font-semibold">Enq.</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {a.top.map((t) => (
                <tr key={t.id}>
                  <td className="max-w-0 truncate py-2 pr-3"><Link href={`/dashboard/listings/${t.id}`} className="text-slate-200 hover:text-gold-300">{t.title}</Link></td>
                  <td className="py-2 text-right text-slate-300">{t.views}</td>
                  <td className="py-2 text-right text-slate-300">{t.enquiries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      {sp.view === "agency" && team && (
        <Panel title="Agent performance" dark>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>{["Agent", "Listings", "Views", "Leads", "Won", "Conversion", "Deal value"].map((h) => <th key={h} className="pb-2 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {team.perAgent.map((r) => (
                  <tr key={r.id}><td className="py-2">{r.name}</td><td>{r.listings}</td><td>{r.views}</td><td>{r.leads}</td><td>{r.won}</td><td>{r.conversion}%</td><td>{r.dealValue ? formatPKR(r.dealValue) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {dev && dev.projects.length > 0 && (
        <>
          <h2 className="pt-4 text-xl font-bold">Projects — {dev.developer.name}</h2>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard dark label="Project views" value={dev.projects.reduce((t, p) => t + p.views, 0)} icon={Building2} />
            <StatCard dark label="Leads" value={dev.projects.reduce((t, p) => t + p.leads, 0)} icon={Users} />
            <StatCard dark label="Brochure / plan requests" value={dev.projects.reduce((t, p) => t + p.brochures + p.planRequests, 0)} icon={FileDown} />
            <StatCard dark label="Paid bookings" value={dev.projects.reduce((t, p) => t + p.bookings, 0)} icon={CalendarCheck} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Project views per day" dark>
              <TrendChart dark data={dev.daily} x="day" series={[{ key: "views", label: "Views" }]} />
            </Panel>
            <Panel title="Unit interest (sold vs total)" dark>
              <Bars dark horizontal x="name" height={Math.max(220, dev.unitInterest.length * 34)} stacked series={[{ key: "sold", label: "Sold / booked" }, { key: "available", label: "Available" }]} data={dev.unitInterest.map((u) => ({ name: `${u.project.split(" ")[0]} · ${u.name}`, sold: u.sold, available: u.total - u.sold }))} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
