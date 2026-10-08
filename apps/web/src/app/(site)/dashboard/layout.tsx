import { eq, sql } from "drizzle-orm";
import { agencyMembers, developers, leases } from "@propertyx/database";
import { requireUser, db } from "@/lib/server";
import { DASH_NAV } from "@/components/dashboard/nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export const metadata = { robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const [[agency], [dev], [lease]] = await Promise.all([
    db.select({ id: agencyMembers.agencyId }).from(agencyMembers).where(eq(agencyMembers.userId, user.id)).limit(1),
    db.select({ id: developers.id }).from(developers).where(eq(developers.ownerId, user.id)).limit(1),
    db.select({ id: leases.id }).from(leases).where(sql`${leases.tenantUserId} = ${user.id}`).limit(1),
  ]);
  const ctx = { hasAgency: !!agency, isDeveloper: !!dev, isTenant: !!lease };
  const groups = DASH_NAV.map((g) => ({ title: g.title, items: g.items.filter((i) => i.show(user, ctx)).map(({ href, label, icon }) => ({ href, label, icon })) })).filter((g) => g.items.length);
  return (
    <div className="container-px grid gap-6 py-6 lg:grid-cols-[250px_1fr]">
      <DashboardSidebar groups={groups} user={{ name: user.name, role: user.primaryRole }} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
