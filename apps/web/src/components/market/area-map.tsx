"use client";

import dynamic from "next/dynamic";
import type { MapPolygon } from "@/components/map/leaflet-map";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), { ssr: false, loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-slate-100" /> });

/** Outline(s) of an area, society or a city's areas, for area guide pages. */
export function AreaMap({ center, polygons, zoom = 14, fit = true }: { center: [number, number]; polygons: MapPolygon[]; zoom?: number; fit?: boolean }) {
  return <LeafletMap center={center} zoom={zoom} polygons={polygons} fitPolygons={fit && polygons.length > 0} className="h-72 w-full" />;
}
