import type { Metadata } from "next";
import { requireUser } from "@/lib/server";
import { allCities } from "@/lib/queries";
import { ListingWizard } from "@/components/listing/listing-wizard";
import { BecomeSeller } from "@/components/become-seller";

export const metadata: Metadata = { title: "Post a property", robots: { index: false } };

export default async function PostPropertyPage() {
  const user = await requireUser("/post-property");
  const cities = await allCities();
  return (
    <div className="container-px py-8">
      <div className="mx-auto mb-6 max-w-4xl">
        <h1 className="text-3xl font-extrabold">Post your property</h1>
        <p className="mt-1 text-slate-500">Free for owners. Takes about 5 minutes — your progress is saved on this device.</p>
      </div>
      {user.permissions.includes("listing.create") ? (
        <ListingWizard cities={cities} contact={{ name: user.name, phone: user.phone?.replace("+92", "0") ?? "", email: user.email }} />
      ) : (
        <BecomeSeller />
      )}
    </div>
  );
}
