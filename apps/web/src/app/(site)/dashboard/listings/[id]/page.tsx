import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Heart, Phone, MessageCircle, MessageSquare, CalendarDays, Share2, Users, Pencil } from "lucide-react";
import { getListingForEdit, listingAnalytics, listLeads, AppError } from "@propertyx/core";
import { formatPKR } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { PageHeader, StatCard, Panel } from "@/components/dashboard/ui";
import { TrendChart, Bars } from "@/components/dashboard/charts";
import { StatusPill } from "@/components/badges";
import { LeadsBoard } from "@/components/dashboard/leads-board";

export const metadata = { title: "Listing performance" };

export default async function ListingStats({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> }) {
  const { id } = await params;
  const days = Math.min(365, Math.max(7, Number((await searchParams).days ?? 30)));
  const user = await requirePermission("listing.create");
  let l;
  try {
    l = await getListingForEdit(db, user, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const [a, leads] = await Promise.all([listingAnalytics(db, user, { listingId: id, days }), listLeads(db, user, { listingId: id })]);
  const f = a.funnel;
  return (
    <div className="space-y-6">
      <PageHeader
        title={l.input.title}
        subtitle={`${formatPKR(l.input.price)} · ${days}-day performance`}
        actions={
          <>
            <StatusPill status={l.status} />
            <Link href={`/dashboard/listings/${id}/edit`} className="btn-outline btn-sm">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
            <Link href={`/property/${l.slug}`} className="btn-outline btn-sm">
              View
            </Link>
          </>
        }
      />
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <Link key={d} href={`?days=${d}`} className={`chip text-xs ${d === days ? "chip-active" : ""}`}>
            {d} days
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard dark label="Views" value={f.view} icon={Eye} />
        <StatCard dark label="Saves" value={f.save} icon={Heart} />
        <StatCard dark label="Enquiries" value={a.enquiries} hint={`${a.conversionRate}% conversion`} icon={MessageSquare} />
        <StatCard dark label="Leads" value={a.leads.total} hint={`${a.leads.won} won`} icon={Users} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Views & enquiries per day" dark>
          <TrendChart dark data={a.daily} x="day" series={[{ key: "views", label: "Views" }, { key: "enquiries", label: "Enquiries" }, { key: "saves", label: "Saves" }]} />
        </Panel>
        <Panel title="Engagement funnel" dark>
          <Bars
            dark
            horizontal
            height={260}
            x="label"
            series={[{ key: "value", label: "Count" }]}
            data={[
              { label: "Views", value: f.view },
              { label: "Phone reveals", value: f.phone_reveal + f.call_click },
              { label: "WhatsApp", value: f.whatsapp_click },
              { label: "Messages", value: f.message },
              { label: "Leads", value: f.lead },
              { label: "Visit requests", value: f.visit_request },
              { label: "Shares", value: f.share },
            ]}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
            <span><Phone className="mx-auto mb-1 h-4 w-4" />{f.call_click} calls</span>
            <span><MessageCircle className="mx-auto mb-1 h-4 w-4" />{f.whatsapp_click} WhatsApp</span>
            <span><CalendarDays className="mx-auto mb-1 h-4 w-4" />{f.visit_request} visits</span>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500"><Share2 className="h-3 w-3" /> {f.share} shares</p>
        </Panel>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-bold">Leads for this listing</h2>
        <LeadsBoard leads={leads} team={false} />
      </section>
    </div>
  );
}
