import Link from "next/link";
import { eq } from "drizzle-orm";
import { agentAreas, locations } from "@propertyx/database";
import { getMyAgentProfile, myAgency, myDeveloper } from "@propertyx/core";
import { requireUser, db } from "@/lib/server";
import { PageHeader, Panel } from "@/components/dashboard/ui";
import { AgentProfileForm, OrgForm } from "@/components/dashboard/profile-forms";
import { VerificationBadge } from "@/components/badges";

export const metadata = { title: "Public profile" };

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const [agent, agency, dev] = await Promise.all([getMyAgentProfile(db, user), myAgency(db, user), myDeveloper(db, user)]);
  const areas = agent ? await db.select({ slug: locations.slug, name: locations.name }).from(agentAreas).innerJoin(locations, eq(locations.id, agentAreas.locationId)).where(eq(agentAreas.agentId, agent.id)) : [];
  const isAgent = user.roles.includes("agent") || user.roles.includes("agency");
  return (
    <div className="space-y-6">
      <PageHeader title="Public profile" subtitle="How buyers see you on PropertyX." />
      {isAgent && (
        <Panel
          title="Agent profile"
          actions={
            agent && (
              <span className="flex items-center gap-2">
                <VerificationBadge level={agent.verificationLevel} kind="agent" />
                <Link href={`/agents/${agent.slug}`} className="text-sm font-semibold text-brand-700">View public page</Link>
              </span>
            )
          }
        >
          <AgentProfileForm
            initial={{
              displayName: agent?.displayName ?? user.name,
              bio: agent?.bio ?? "",
              experienceYears: agent?.experienceYears ?? null,
              phone: (agent?.phone ?? user.phone ?? "").replace("+92", "0"),
              whatsapp: (agent?.whatsapp ?? "").replace("+92", "0"),
              specializations: agent?.specializations ?? [],
              languages: agent?.languages ?? ["Urdu", "English"],
              areas,
            }}
          />
        </Panel>
      )}
      {(user.roles.includes("agency") || agency) && (
        <Panel title={agency ? `Agency — ${agency.agency.name}` : "Create your agency"} actions={agency && <Link href={`/agencies/${agency.agency.slug}`} className="text-sm font-semibold text-brand-700">View public page</Link>}>
          {agency && agency.role !== "admin" ? (
            <p className="text-sm text-slate-500">You're a {agency.role} at {agency.agency.name}. Only agency admins can edit the agency profile.</p>
          ) : (
            <OrgForm kind="agency" exists={!!agency} initial={{ name: agency?.agency.name ?? "", description: agency?.agency.description ?? "", phone: (agency?.agency.phone ?? "").replace("+92", "0"), website: agency?.agency.website ?? "", email: agency?.agency.email ?? "", establishedYear: agency?.agency.establishedYear ?? null, whatsapp: agency?.agency.whatsapp ?? "", address: agency?.agency.address ?? "" }} />
          )}
        </Panel>
      )}
      {user.roles.includes("developer") && (
        <Panel title={dev ? `Developer — ${dev.name}` : "Create your developer profile"} actions={dev && <Link href={`/developers/${dev.slug}`} className="text-sm font-semibold text-brand-700">View public page</Link>}>
          <OrgForm kind="developer" exists={!!dev} initial={{ name: dev?.name ?? "", description: dev?.description ?? "", phone: dev?.phone ?? "", website: dev?.website ?? "", email: dev?.email ?? "", establishedYear: dev?.establishedYear ?? null }} />
        </Panel>
      )}
    </div>
  );
}
