import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { projects } from "@propertyx/database";
import { getProject, myDeveloper } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { allCities } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/ui";
import { ProjectEditor } from "@/components/dashboard/project-editor";

export const metadata = { title: "Edit project" };

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("project.create");
  const [row] = await db.select({ slug: projects.slug, developerId: projects.developerId }).from(projects).where(eq(projects.id, id));
  const dev = await myDeveloper(db, user);
  if (!row || (row.developerId !== dev?.id && !user.isStaff)) notFound();
  const p = (await getProject(db, row.slug, user))!;
  const cities = await allCities();
  return (
    <div>
      <PageHeader title={`Edit ${p.project.name}`} />
      <ProjectEditor
        projectId={id}
        cities={cities}
        initial={{
          name: p.project.name,
          tagline: p.project.tagline ?? "",
          description: p.project.description,
          cityId: p.project.cityId,
          locationSlug: p.location?.slug ?? null,
          locationLabel: p.location?.name ?? "",
          address: p.project.address ?? "",
          status: p.project.status,
          constructionProgress: p.project.constructionProgress,
          launchDate: p.project.launchDate ?? "",
          expectedCompletion: p.project.expectedCompletion ?? "",
          amenities: p.project.amenities ?? [],
          gallery: p.gallery.map((g) => g.url),
          videoUrl: p.project.videoUrl ?? "",
          brochureUrl: p.project.brochureUrl ?? "",
          units: p.units.map((u) => ({ type: u.type, name: u.name, areaSqft: u.areaSqft, beds: u.beds ?? "", baths: u.baths ?? "", priceFrom: u.priceFrom, priceTo: u.priceTo ?? "", totalUnits: u.totalUnits, availableUnits: u.availableUnits })),
          plans: p.plans.map((pl) => ({ name: pl.name, downPaymentPct: pl.downPaymentPct, durationMonths: pl.durationMonths, frequency: pl.frequency as "monthly", possessionPct: pl.possessionPct, balloonPct: pl.balloonPct, notes: pl.notes ?? "" })),
        }}
      />
    </div>
  );
}
