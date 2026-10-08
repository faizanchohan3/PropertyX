import Link from "next/link";
import { agencyTeam, myAgency } from "@propertyx/core";
import { requireUser, db } from "@/lib/server";
import { PageHeader, Empty } from "@/components/dashboard/ui";
import { TeamManager } from "@/components/dashboard/team-manager";

export const metadata = { title: "Agency team" };

export default async function TeamPage() {
  const user = await requireUser("/dashboard/team");
  const mine = await myAgency(db, user);
  if (!mine)
    return (
      <div>
        <PageHeader title="Agency team" />
        <Empty title="You're not part of an agency" body="Agency owners can create an agency from their public profile page." action={<Link href="/dashboard/profile" className="btn-primary">Set up agency</Link>} />
      </div>
    );
  const team = await agencyTeam(db, user);
  return (
    <div>
      <PageHeader title={team.agency.name} subtitle={`${team.plan} plan · your role: ${team.myRole}`} actions={<Link href={`/agencies/${team.agency.slug}`} className="btn-outline">Public page</Link>} />
      <TeamManager myId={user.id} myRole={team.myRole} seats={team.seats} members={team.members.map((m) => ({ user_id: m.user_id as string, role: m.role as string, status: m.status as string, name: m.name as string, email: m.email as string, phone: (m.phone as string) ?? null, last_login_at: m.last_login_at ? new Date(m.last_login_at as string).toISOString() : null, listings: Number(m.listings), leads_30d: Number(m.leads_30d), won: Number(m.won), agent_slug: (m.agent_slug as string) ?? null }))} />
    </div>
  );
}
