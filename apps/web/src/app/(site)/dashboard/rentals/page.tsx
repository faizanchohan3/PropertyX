import { rentalDashboard } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { PageHeader } from "@/components/dashboard/ui";
import { RentalsWorkspace } from "@/components/dashboard/rentals-workspace";

export const metadata = { title: "Property management" };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : (d as string | null));

export default async function RentalsPage() {
  const user = await requirePermission("rental.manage", "/dashboard/rentals");
  const d = await rentalDashboard(db, user);
  const data = {
    ...d,
    payments: d.payments.map((p) => ({ ...p, paidAt: iso(p.paidAt) })),
    maintenance: d.maintenance.map((m) => ({ ...m, createdAt: iso(m.createdAt)! })),
  };
  return (
    <div>
      <PageHeader title="Property management" subtitle="Rent collection, leases, maintenance and expenses in one place." />
      <RentalsWorkspace data={data as Parameters<typeof RentalsWorkspace>[0]["data"]} />
    </div>
  );
}
