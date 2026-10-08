"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { toast } from "./toast";

export function SaveButton({ listingId, initial = false, variant = "icon" }: { listingId: string; initial?: boolean; variant?: "icon" | "button" }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const path = usePathname();
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const next = !saved;
      setSaved(next);
      try {
        await api(`/api/v1/listings/${listingId}/save`, { method: next ? "POST" : "DELETE" });
        toast(next ? "Saved — we'll alert you if the price drops" : "Removed from saved");
      } catch (err) {
        setSaved(!next);
        if (err instanceof ApiError && err.status === 401) router.push(`/login?next=${encodeURIComponent(path)}`);
        else toast((err as Error).message, "error");
      }
    });
  };
  if (variant === "button")
    return (
      <button onClick={toggle} disabled={pending} className={`btn-outline ${saved ? "border-red-200 text-red-600" : ""}`} aria-pressed={saved}>
        <Heart className={`h-4 w-4 ${saved ? "fill-red-500 text-red-500" : ""}`} /> {saved ? "Saved" : "Save"}
      </button>
    );
  return (
    <button onClick={toggle} disabled={pending} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save property"} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition hover:scale-105">
      <Heart className={`h-[18px] w-[18px] ${saved ? "fill-red-500 text-red-500" : "text-slate-700"}`} />
    </button>
  );
}
