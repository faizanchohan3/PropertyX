import { and, eq } from "drizzle-orm";
import { propertyListings, agents, agencies, projects, developers } from "@propertyx/database";
import { myCampaigns, gatewaysForCheckout } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { PageHeader } from "@/components/dashboard/ui";
import { AdCampaigns } from "@/components/dashboard/ad-campaigns";

export const metadata = { title: "Advertising" };

export default async function AdsPage() {
  const user = await requirePermission("ads.create", "/dashboard/ads");
  const [ads, ls, ag, agc, pr] = await Promise.all([
    myCampaigns(db, user),
    db.select({ id: propertyListings.id, title: propertyListings.title }).from(propertyListings).where(and(eq(propertyListings.postedById, user.id), eq(propertyListings.status, "active"))).limit(50),
    db.select({ id: agents.id, name: agents.displayName }).from(agents).where(eq(agents.userId, user.id)),
    db.select({ id: agencies.id, name: agencies.name }).from(agencies).where(eq(agencies.ownerId, user.id)),
    db.select({ id: projects.id, name: projects.name }).from(projects).innerJoin(developers, eq(developers.id, projects.developerId)).where(eq(developers.ownerId, user.id)),
  ]);
  const targets = [
    ...pr.map((p) => ({ type: "project", id: p.id, label: `Project — ${p.name}` })),
    ...agc.map((a) => ({ type: "agency", id: a.id, label: `Agency — ${a.name}` })),
    ...ag.map((a) => ({ type: "agent", id: a.id, label: `Agent profile — ${a.name}` })),
    ...ls.map((l) => ({ type: "listing", id: l.id, label: `Listing — ${l.title.slice(0, 70)}` })),
  ];
  return (
    <div>
      <PageHeader title="Advertising" subtitle="Promote listings, projects and your brand across PropertyX." />
      <AdCampaigns
        targets={targets}
        gateways={gatewaysForCheckout()}
        ads={ads.map((a) => ({ id: a.id, campaignName: a.campaignName, format: a.format, title: a.title, status: a.status, budget: a.budget, spent: a.spent, impressions: a.impressions, clicks: a.clicks, startAt: a.startAt.toISOString(), endAt: a.endAt.toISOString(), paymentId: a.paymentId, rejectionReason: a.rejectionReason }))}
      />
    </div>
  );
}
