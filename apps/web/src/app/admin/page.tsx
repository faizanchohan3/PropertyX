import Link from "next/link";
import { Users, Building2, Briefcase, HardHat, Wallet, MessageSquare, ShieldAlert, ShieldCheck, Flag, Star, Megaphone, CreditCard } from "lucide-react";
import { platformOverview } from "@propertyx/core";
import { formatPKR } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { StatCard } from "@/components/dashboard/ui";
import { TrendChart, Bars } from "@/components/dashboard/charts";
import { AdminHeader, DarkCard } from "@/components/admin/ui";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  const user = await requirePermission("admin.access", "/admin");
  const o = await platformOverview(db, user);
  const c = o.counts;
  const months = [...new Set(o.revenue.map((r) => r.month))];
  const revenue = months.map((m) => ({ month: m, ...Object.fromEntries(o.revenue.filter((r) => r.month === m).map((r) => [r.purpose, r.amount])) }));
  const queues = [
    { label: "Listings to review", n: c.pending_listings, href: "/admin/listings", icon: Building2 },
    { label: "Verification requests", n: c.pending_verifications, href: "/admin/verification", icon: ShieldCheck },
    { label: "High-risk fraud alerts", n: c.high_fraud, href: "/admin/fraud", icon: ShieldAlert },
    { label: "Open reports", n: c.open_reports, href: "/admin/reports", icon: Flag },
    { label: "Reviews to moderate", n: c.pending_reviews, href: "/admin/reviews", icon: Star },
    { label: "Projects to approve", n: c.pending_projects, href: "/admin/projects", icon: HardHat },
    { label: "Ad campaigns to approve", n: c.pending_ads, href: "/admin/ads", icon: Megaphone },
  ];
  return (
    <div className="space-y-6">
      <AdminHeader title="Platform overview" subtitle={`Welcome back, ${user.name}. Live figures from the PropertyX database.`} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard dark label="Users" value={c.users.toLocaleString()} hint={`+${c.users_30d} in 30 days`} icon={Users} href="/admin/users" />
        <StatCard dark label="Active listings" value={c.active_listings.toLocaleString()} hint={`${c.pending_listings} pending review`} icon={Building2} href="/admin/listings" />
        <StatCard dark label="Agents / agencies" value={`${c.agents} / ${c.agencies}`} hint={`${c.developers} developers · ${c.projects} projects`} icon={Briefcase} />
        <StatCard dark label="Leads (30 days)" value={c.leads_30d.toLocaleString()} icon={MessageSquare} />
        <StatCard dark label="Revenue (30 days)" value={formatPKR(c.revenue_30d)} hint={`${formatPKR(c.revenue_total)} all time`} icon={Wallet} href="/admin/billing" />
        <StatCard dark label="Active subscriptions" value={c.active_subscriptions} icon={CreditCard} href="/admin/billing" />
        <StatCard dark label="Open fraud flags" value={c.open_fraud} hint={`${c.high_fraud} high / critical`} icon={ShieldAlert} href="/admin/fraud" />
        <StatCard dark label="Open reports" value={c.open_reports} icon={Flag} href="/admin/reports" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <DarkCard className="xl:col-span-2">
          <p className="mb-3 font-bold text-white">Signups, listings & leads — last 30 days</p>
          <TrendChart dark data={o.growth} x="day" series={[{ key: "signups", label: "Signups" }, { key: "listings", label: "New listings" }, { key: "leads", label: "Leads" }]} />
        </DarkCard>
        <DarkCard>
          <p className="mb-3 font-bold text-white">Work queues</p>
          <ul className="space-y-1">
            {queues.map((q) => (
              <li key={q.href + q.label}>
                <Link href={q.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5">
                  <q.icon className="h-4 w-4 text-slate-400" />
                  <span className="flex-1 text-sm">{q.label}</span>
                  <span className={`rounded-full px-2 text-xs font-bold ${q.n ? "bg-gold-500 text-night" : "bg-white/10 text-slate-400"}`}>{q.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </DarkCard>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <DarkCard>
          <p className="mb-3 font-bold text-white">Revenue by month & source</p>
          {revenue.length ? (
            <Bars dark stacked x="month" data={revenue} yFormat="pkr" series={[{ key: "subscription", label: "Subscriptions" }, { key: "featured_listing", label: "Featured" }, { key: "advertising", label: "Ads" }, { key: "project_booking", label: "Bookings" }]} />
          ) : (
            <p className="text-sm text-slate-400">No payments yet.</p>
          )}
        </DarkCard>
        <DarkCard>
          <p className="mb-3 font-bold text-white">Active listings by city</p>
          <Bars dark horizontal x="name" height={300} data={o.byCity} series={[{ key: "count", label: "Listings" }]} />
        </DarkCard>
      </div>
    </div>
  );
}
