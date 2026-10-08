"use client";

/**
 * next/image loader. Unsplash (demo photos) is resized by its own CDN; our uploaded
 * media is already optimised to WebP on upload, so it is served as-is (a CDN in front
 * of /media can add resizing in production).
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const u = new URL(src);
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", String(quality ?? 70));
    u.searchParams.set("auto", "format");
    return u.toString();
  }
  return src.includes("?") ? src : `${src}?w=${width}`;
}
