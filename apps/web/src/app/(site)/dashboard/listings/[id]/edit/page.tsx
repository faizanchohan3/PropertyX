import { notFound } from "next/navigation";
import { getListingForEdit, AppError } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { allCities } from "@/lib/queries";
import { ListingWizard, type WizardData } from "@/components/listing/listing-wizard";
import { PageHeader } from "@/components/dashboard/ui";
import { StatusPill } from "@/components/badges";

export const metadata = { title: "Edit listing" };

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("listing.create");
  let data;
  try {
    data = await getListingForEdit(db, user, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const cities = await allCities();
  const i = data.input;
  const initial: Partial<WizardData> = {
    ...i,
    rentPeriod: (i.rentPeriod as WizardData["rentPeriod"]) ?? "monthly",
    contactPhone: i.contactPhone.replace("+92", "0"),
    contactWhatsapp: (i.contactWhatsapp ?? "").replace("+92", "0"),
    media: i.media.map((m) => ({ ...m, kind: m.kind as "image" | "floor_plan" })),
  };
  return (
    <div>
      <PageHeader title="Edit listing" subtitle={i.title} actions={<StatusPill status={data.status} />} />
      {data.rejectionReason && data.status === "rejected" && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Moderator note: {data.rejectionReason}</p>}
      <ListingWizard listingId={id} initial={initial} cities={cities} contact={{ name: i.contactName, phone: i.contactPhone, email: i.contactEmail ?? "" }} />
    </div>
  );
}
