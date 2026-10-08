"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X, Video, Rotate3d, LayoutPanelLeft } from "lucide-react";

type Media = { url: string; caption?: string | null };

export function Gallery({ images, floorPlans, videoUrl, tourUrl, title }: { images: Media[]; floorPlans: Media[]; videoUrl?: string | null; tourUrl?: string | null; title: string }) {
  const [tab, setTab] = useState<"photos" | "video" | "tour" | "plans">("photos");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const list = tab === "plans" ? floorPlans : images;
  const next = useCallback(() => setLightbox((i) => (i == null ? i : (i + 1) % list.length)), [list.length]);
  const prev = useCallback(() => setLightbox((i) => (i == null ? i : (i - 1 + list.length) % list.length)), [list.length]);
  useEffect(() => {
    if (lightbox == null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [lightbox, next, prev]);

  const tabs = [
    { key: "photos" as const, label: `Photos (${images.length})`, icon: Images, show: true },
    { key: "video" as const, label: "Video", icon: Video, show: !!videoUrl },
    { key: "tour" as const, label: "360° Tour", icon: Rotate3d, show: !!tourUrl },
    { key: "plans" as const, label: `Floor plans (${floorPlans.length})`, icon: LayoutPanelLeft, show: floorPlans.length > 0 },
  ].filter((t) => t.show);

  return (
    <div>
      {tabs.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`chip shrink-0 ${tab === t.key ? "chip-active" : ""}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      )}
      {tab === "video" && videoUrl && (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe src={videoUrl} title={`${title} video`} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
        </div>
      )}
      {tab === "tour" && tourUrl && (
        <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900">
          <iframe src={tourUrl} title={`${title} 360° tour`} className="h-full w-full" allow="xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen loading="lazy" />
        </div>
      )}
      {(tab === "photos" || tab === "plans") &&
        (list.length === 0 ? (
          <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">No photos yet</div>
        ) : (
          <div className="grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[440px]">
            {list.slice(0, 5).map((m, i) => (
              <button key={m.url + i} onClick={() => setLightbox(i)} className={`group relative overflow-hidden bg-slate-100 ${i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block"}`} aria-label={`Open photo ${i + 1}`}>
                <Image src={m.url} alt={m.caption ?? `${title} — photo ${i + 1}`} fill priority={i === 0} sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "25vw"} className={`transition duration-500 group-hover:scale-105 ${tab === "plans" ? "object-contain bg-white p-2" : "object-cover"}`} />
                {i === 4 && list.length > 5 && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">+{list.length - 5} more</span>}
              </button>
            ))}
          </div>
        ))}
      {(tab === "photos" || tab === "plans") && list.length > 1 && (
        <button onClick={() => setLightbox(0)} className="btn-outline btn-sm mt-2 sm:hidden">
          <Images className="h-4 w-4" /> View all {list.length}
        </button>
      )}
      {lightbox != null && list[lightbox] && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {lightbox + 1} / {list.length}
            </span>
            <button onClick={() => setLightbox(null)} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={list[lightbox].url} alt={list[lightbox].caption ?? title} fill sizes="100vw" className="object-contain" />
            <button onClick={prev} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button onClick={next} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          {list[lightbox].caption && <p className="p-4 text-center text-sm text-slate-300">{list[lightbox].caption}</p>}
          <div className="flex gap-2 overflow-x-auto p-4">
            {list.map((m, i) => (
              <button key={i} onClick={() => setLightbox(i)} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ${i === lightbox ? "ring-2 ring-gold-400" : "opacity-60"}`}>
                <Image src={m.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
