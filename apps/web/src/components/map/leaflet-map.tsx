"use client";

import { useEffect, useRef } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = { lat: number; lng: number; html?: string; popup?: string; kind?: "property" | "poi" | "cluster"; onClick?: () => void; title?: string };

const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "&copy; OpenStreetMap contributors";

/** Thin Leaflet wrapper. `markers` is re-rendered whenever it changes. */
export function LeafletMap({
  center,
  zoom = 14,
  markers = [],
  className = "h-80 w-full",
  onReady,
  onMoveEnd,
  circle,
  fitMarkers = false,
}: {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  onReady?: (map: LMap, L: typeof import("leaflet")) => void;
  onMoveEnd?: (map: LMap) => void;
  circle?: { lat: number; lng: number; radiusKm: number } | null;
  fitMarkers?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const moveCb = useRef(onMoveEnd);
  moveCb.current = onMoveEnd;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(el.current, { center, zoom, scrollWheelZoom: true, zoomControl: true });
      leaflet.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(m);
      layer.current = leaflet.layerGroup().addTo(m);
      m.on("moveend", () => moveCb.current?.(m));
      map.current = m;
      onReady?.(m, leaflet);
      renderMarkers();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderMarkers = () => {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m || !layer.current) return;
    layer.current.clearLayers();
    for (const mk of markers) {
      const icon = leaflet.divIcon({
        className: "",
        html: mk.html ?? `<div style="width:18px;height:18px;border-radius:9999px;background:#047857;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:translate(-50%,-50%)"></div>`,
        iconSize: [0, 0],
      });
      const marker = leaflet.marker([mk.lat, mk.lng], { icon, title: mk.title, riseOnHover: true });
      if (mk.popup) marker.bindPopup(mk.popup, { maxWidth: 260 });
      if (mk.onClick) marker.on("click", mk.onClick);
      marker.addTo(layer.current);
    }
    if (circle) leaflet.circle([circle.lat, circle.lng], { radius: circle.radiusKm * 1000, color: "#c9922a", weight: 2, fillOpacity: 0.08 }).addTo(layer.current);
    if (fitMarkers && markers.length > 1) m.fitBounds(leaflet.latLngBounds(markers.map((x) => [x.lat, x.lng] as [number, number])), { padding: [30, 30], maxZoom: 15 });
  };

  useEffect(renderMarkers, [markers, circle, fitMarkers]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className={`${className} z-0 overflow-hidden rounded-2xl`} />;
}
