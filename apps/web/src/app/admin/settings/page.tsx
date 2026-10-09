import { eq } from "drizzle-orm";
import { siteSettings, constructionRates, cities } from "@propertyx/database";
import { DEFAULT_SETTINGS } from "@propertyx/database/reference";
import type { ConstructionRates } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader } from "@/components/admin/ui";
import { SettingsEditor } from "@/components/admin/settings-editor";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requirePermission("settings.manage", "/admin/settings");
  const [rows, rateRows, cityRows] = await Promise.all([
    db.select().from(siteSettings),
    db.select({ cityId: constructionRates.cityId, rates: constructionRates.rates, cityName: cities.name }).from(constructionRates).leftJoin(cities, eq(cities.id, constructionRates.cityId)),
    db.select({ slug: cities.slug, name: cities.name }).from(cities).orderBy(cities.sortOrder, cities.name),
  ]);
  const settings = { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  const rates = rateRows
    .map((r) => ({ cityId: r.cityId, cityName: r.cityName ?? "Default (all cities)", rates: r.rates as ConstructionRates }))
    .sort((a, b) => (a.cityId ? 1 : 0) - (b.cityId ? 1 : 0));
  return (
    <div>
      <AdminHeader title="Settings" subtitle="Platform configuration. Every change is recorded in the audit log." />
      <SettingsEditor settings={settings} rates={rates} cities={cityRows} />
    </div>
  );
}
