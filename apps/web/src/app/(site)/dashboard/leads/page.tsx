import Link from "next/link";
import { listLeads, myAgency, agencyTeam } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { PageHeader } from "@/components/dashboard/ui";
import { LeadsBoard } from "@/components/dashboard/leads-board";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ scope?: string; listing?: string }> }) {
  const user = await requirePermission("lead.read.own", "/dashboard/leads");
  const sp = await searchParams;
  const agency = await myAgency(db, user);
  const canTeam = !!agency && ["admin", "manager"].includes(agency.role);
  const team = canTeam && sp.scope === "team";
  const [leads, members] = await Promise.all([
    listLeads(db, user, { scope: team ? "team" : "mine", listingId: sp.listing }),
    team ? agencyTeam(db, user).then((t) => t.members.map((m) => ({ id: m.user_id as string, name: m.name as string }))) : Promise.resolve([]),
  ]);
  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Every enquiry, call-back request and offer — scored by intent."
        actions={
          canTeam && (
            <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
              <Link href="/dashboard/leads" className={`rounded-lg px-3 py-1.5 ${!team ? "bg-white shadow-sm" : "text-slate-500"}`}>
                My leads
              </Link>
              <Link href="/dashboard/leads?scope=team" className={`rounded-lg px-3 py-1.5 ${team ? "bg-white shadow-sm" : "text-slate-500"}`}>
                Agency leads
              </Link>
            </div>
          )
        }
      />
      {sp.listing && (
        <p className="mb-4 text-sm text-slate-500">
          Showing leads for one listing.{" "}
          <Link href="/dashboard/leads" className="font-semibold text-brand-700">
            Show all
          </Link>
        </p>
      )}
      <LeadsBoard leads={leads} team={team} members={members} />
    </div>
  );
}
