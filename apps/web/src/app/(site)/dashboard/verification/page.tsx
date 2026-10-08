import { eq, and, inArray } from "drizzle-orm";
import { agents, agencies, developers, propertyListings } from "@propertyx/database";
import { myVerification } from "@propertyx/core";
import { requireUser, db } from "@/lib/server";
import { PageHeader } from "@/components/dashboard/ui";
import { VerificationCenter } from "@/components/dashboard/verification-center";

export const metadata = { title: "Verification" };

export default async function VerificationPage() {
  const user = await requireUser("/dashboard/verification");
  const [{ requests, docs }, myAgents, myAgencies, myDevs, myListings] = await Promise.all([
    myVerification(db, user),
    db.select({ id: agents.id, name: agents.displayName, level: agents.verificationLevel }).from(agents).where(eq(agents.userId, user.id)),
    db.select({ id: agencies.id, name: agencies.name, level: agencies.verificationLevel }).from(agencies).where(eq(agencies.ownerId, user.id)),
    db.select({ id: developers.id, name: developers.name, level: developers.verificationLevel }).from(developers).where(eq(developers.ownerId, user.id)),
    db.select({ id: propertyListings.id, title: propertyListings.title, level: propertyListings.verificationLevel }).from(propertyListings).where(and(eq(propertyListings.postedById, user.id), inArray(propertyListings.status, ["active", "pending_review", "paused"]))).limit(50),
  ]);
  const subjects = [
    { type: "user", id: user.id, label: `My identity (${user.name})`, currentLevel: user.verificationLevel, maxLevel: 2 },
    ...myAgents.map((a) => ({ type: "agent", id: a.id, label: `Agent profile — ${a.name}`, currentLevel: a.level, maxLevel: 2 })),
    ...myAgencies.map((a) => ({ type: "agency", id: a.id, label: `Agency — ${a.name}`, currentLevel: a.level, maxLevel: 2 })),
    ...myDevs.map((d) => ({ type: "developer", id: d.id, label: `Developer — ${d.name}`, currentLevel: d.level, maxLevel: 4 })),
    ...myListings.map((l) => ({ type: "listing", id: l.id, label: `Listing — ${l.title.slice(0, 60)}`, currentLevel: l.level, maxLevel: 5 })),
  ];
  return (
    <div>
      <PageHeader title="Verification" subtitle="Earn trust badges for your profile and listings." />
      <VerificationCenter
        subjects={subjects}
        phoneVerified={user.phoneVerified}
        docs={docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
        requests={requests.map((r) => ({ id: r.id, subjectType: r.subjectType, subjectId: r.subjectId, requestedLevel: r.requestedLevel, status: r.status, notes: r.notes, reviewerNotes: r.reviewerNotes, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
