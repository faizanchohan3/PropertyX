import { requirePermission } from "@/lib/server";
import { allCities } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/ui";
import { ProjectEditor } from "@/components/dashboard/project-editor";

export const metadata = { title: "New project" };

export default async function NewProject() {
  await requirePermission("project.create", "/dashboard/projects/new");
  const cities = await allCities();
  return (
    <div>
      <PageHeader title="New project" subtitle="Projects are reviewed before going live." />
      <ProjectEditor
        cities={cities}
        initial={{ name: "", tagline: "", description: "", cityId: "", locationSlug: null, locationLabel: "", address: "", status: "under_construction", constructionProgress: 0, launchDate: "", expectedCompletion: "", amenities: [], gallery: [], videoUrl: "", brochureUrl: "", units: [{ type: "apartment", name: "2 Bed Apartment", areaSqft: "", beds: 2, baths: 2, priceFrom: "", priceTo: "", totalUnits: "", availableUnits: "" }], plans: [{ name: "3-Year Plan", downPaymentPct: 20, durationMonths: 36, frequency: "monthly", possessionPct: 10, balloonPct: 0, notes: "" }] }}
      />
    </div>
  );
}
