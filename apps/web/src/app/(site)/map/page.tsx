import type { Metadata } from "next";
import { Suspense } from "react";
import { MapSearch } from "@/components/map/map-search";
import { allCities } from "@/lib/queries";

export const metadata: Metadata = { title: "Map search", description: "Search properties on an interactive map of Pakistan. Draw an area, search a radius and see nearby schools, hospitals and mosques.", alternates: { canonical: "/map" } };

export default async function MapPage() {
  const cities = await allCities();
  return (
    <Suspense>
      <MapSearch cities={cities.map((c) => ({ slug: c.slug, name: c.name, lat: c.lat, lng: c.lng }))} />
    </Suspense>
  );
}
