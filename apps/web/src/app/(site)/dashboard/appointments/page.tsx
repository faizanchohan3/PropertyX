import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { listVisits } from "@propertyx/core";
import { requireUser, db } from "@/lib/server";
import { PageHeader } from "@/components/dashboard/ui";
import { VisitsList } from "@/components/dashboard/visits-list";

export const metadata = { title: "Property visits" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser("/dashboard/appointments");
  const tab = (await searchParams).tab ?? "upcoming";
  const all = await listVisits(db, user);
  const now = Date.now();
  const lists: Record<string, typeof all> = {
    upcoming: all.filter((v) => ["requested", "confirmed"].includes(v.status) && new Date(v.scheduledAt).getTime() > now).reverse(),
    requests: all.filter((v) => v.isHost && v.status === "requested"),
    past: all.filter((v) => new Date(v.scheduledAt).getTime() <= now || ["completed", "cancelled", "no_show", "rejected"].includes(v.status)),
  };
  const tabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "requests", label: "Requests to me" },
    { key: "past", label: "Past & closed" },
  ];
  return (
    <div>
      <PageHeader
        title="Property visits"
        subtitle="Requests you've made and visits buyers have booked with you."
        actions={
          <a href="/api/v1/appointments/calendar.ics" className="btn-outline">
            <CalendarDays className="h-4 w-4" /> Export calendar (.ics)
          </a>
        }
      />
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <Link key={t.key} href={`?tab=${t.key}`} className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === t.key ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500"}`}>
            {t.label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">{lists[t.key].length}</span>
          </Link>
        ))}
      </div>
      <VisitsList visits={lists[tab] ?? lists.upcoming} />
    </div>
  );
}
