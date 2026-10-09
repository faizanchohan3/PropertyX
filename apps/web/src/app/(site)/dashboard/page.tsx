import Link from "next/link";
import { sql } from "drizzle-orm";
import { Building2, Eye, MessageSquare, Users, Heart, BellRing, CalendarDays, ShieldCheck, Plus, KeyRound, Shield, Sparkles, ArrowRight } from "lucide-react";
import { listingAnalytics, listLeads, listVisits, getActivePlan, recommendedFor } from "@propertyx/core";
import { formatPKR } from "@propertyx/shared";
import { requireUser, db } from "@/lib/server";
import { PageHeader, StatCard, Panel, Empty, timeAgo, fmtDate } from "@/components/dashboard/ui";
import { TrendChart } from "@/components/dashboard/charts";
import { StatusPill } from "@/components/badges";
import { PropertyGrid } from "@/components/property-card";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const lister = user.permissions.includes("listing.create");
  const [counts] = await db.execute<{ saved: number; searches: number; active: number; pending: number }>(sql`
    select (select count(*)::int from saved_properties where user_id = ${user.id}) as saved,
      (select count(*)::int from saved_searches where user_id = ${user.id}) as searches,
      (select count(*)::int from property_listings where posted_by_id = ${user.id} and status = 'active') as active,
      (select count(*)::int from property_listings where posted_by_id = ${user.id} and status = 'pending_review') as pending`);
  const [analytics, leads, visits, plan, rec] = await Promise.all([
    lister ? listingAnalytics(db, user, { days: 30 }) : null,
    lister ? listLeads(db, user, {}) : [],
    listVisits(db, user),
    lister ? getActivePlan(db, user.id) : null,
    !lister ? recommendedFor(db, user.id, 4) : null,
  ]);
  const upcoming = visits.filter((v) => ["requested", "confirmed"].includes(v.status) && new Date(v.scheduledAt) > new Date()).slice(0, 5);
  const newLeads = leads.filter((l) => l.status === "new");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Assalam o Alaikum, ${user.name.split(" ")[0]}`}
        subtitle="Here's what's happening with your property activity."
        actions={
          lister && (
            <Link href="/post-property" className="btn-gold">
              <Plus className="h-4 w-4" /> Post property
            </Link>
          )
        }
      />
      {sp.denied && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">You don't have access to that page.</p>}
      {sp.welcome && (
        <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 p-5 text-white">
          <p className="text-lg font-bold">Welcome to Bismillah 🎉</p>
          <p className="mt-1 text-sm text-brand-100">Start by saving a search so we can alert you to new matches, or post your first property.</p>
        </div>
      )}
      {!user.phoneVerified && (
        <Link href="/account#security" className="flex items-center gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            <b>Verify your phone number</b> to get the phone-verified badge, write reviews and build trust with buyers.
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      {user.isStaff && (
        <Link href="/admin" className="flex items-center gap-3 rounded-2xl bg-night p-4 text-sm text-white">
          <Shield className="h-5 w-5 text-gold-300" /> <span className="flex-1">You have staff access. Open the admin panel.</span> <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {lister && analytics ? (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Active listings" value={counts.active} hint={counts.pending ? `${counts.pending} pending review` : plan ? `${plan.name} plan · ${plan.listingQuota} max` : undefined} icon={Building2} href="/dashboard/listings" />
            <StatCard label="Views (30 days)" value={analytics.funnel.view.toLocaleString()} icon={Eye} href="/dashboard/analytics" />
            <StatCard label="Enquiries (30 days)" value={analytics.enquiries} hint={`${analytics.conversionRate}% of views`} icon={MessageSquare} tone="gold" href="/dashboard/analytics" />
            <StatCard label="New leads" value={newLeads.length} hint={`${leads.length} total`} icon={Users} tone={newLeads.length ? "red" : "slate"} href="/dashboard/leads" />
          </div>
          <Panel title="Last 30 days" dark>
            <TrendChart dark data={analytics.daily} x="day" series={[{ key: "views", label: "Views" }, { key: "enquiries", label: "Enquiries" }]} />
          </Panel>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Latest leads"
              actions={
                <Link href="/dashboard/leads" className="text-sm font-semibold text-brand-700">
                  View all
                </Link>
              }
            >
              {leads.length === 0 ? (
                <Empty title="No leads yet" body="Enquiries, offers and call-back requests on your listings appear here." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {leads.slice(0, 6).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {l.name} {l.offerAmount && <span className="text-sm font-medium text-gold-700">· offer {formatPKR(l.offerAmount)}</span>}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {l.listingTitle ?? l.projectName} · {timeAgo(l.createdAt)}
                        </p>
                      </div>
                      <StatusPill status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <VisitsPanel visits={upcoming} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Saved properties" value={counts.saved} icon={Heart} href="/saved" />
            <StatCard label="Saved searches" value={counts.searches} icon={BellRing} href="/alerts" tone="gold" />
            <StatCard label="Upcoming visits" value={upcoming.length} icon={CalendarDays} href="/dashboard/appointments" />
            <StatCard label="Verification" value={`Level ${user.verificationLevel}`} icon={ShieldCheck} href="/dashboard/verification" tone="slate" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <VisitsPanel visits={upcoming} />
            <Panel title="Quick actions">
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/ai" className="btn-outline justify-start">
                  <Sparkles className="h-4 w-4 text-gold-500" /> Ask the AI assistant
                </Link>
                <Link href="/map" className="btn-outline justify-start">
                  Search on map
                </Link>
                <Link href="/tools/home-loan" className="btn-outline justify-start">
                  Home finance calculator
                </Link>
                <Link href="/post-property" className="btn-outline justify-start">
                  <Plus className="h-4 w-4" /> List a property
                </Link>
                {user.permissions.includes("rental.tenant") && (
                  <Link href="/dashboard/tenant" className="btn-outline justify-start">
                    <KeyRound className="h-4 w-4" /> My tenancy
                  </Link>
                )}
              </div>
            </Panel>
          </div>
          {rec && rec.items.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-bold">Recommended for you</h2>
              <PropertyGrid items={rec.items} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function VisitsPanel({ visits }: { visits: { id: string; title: string; scheduledAt: string; status: string; isHost: boolean; requesterName: string; hostName: string }[] }) {
  return (
    <Panel
      title="Upcoming visits"
      actions={
        <Link href="/dashboard/appointments" className="text-sm font-semibold text-brand-700">
          Manage
        </Link>
      }
    >
      {visits.length === 0 ? (
        <Empty title="No upcoming visits" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {visits.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{v.title}</p>
                <p className="text-xs text-slate-500">
                  {fmtDate(v.scheduledAt, true)} · {v.isHost ? `with ${v.requesterName}` : `host ${v.hostName}`}
                </p>
              </div>
              <StatusPill status={v.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
