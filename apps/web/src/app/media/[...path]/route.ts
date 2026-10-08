import { getFile } from "@propertyx/core";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", avif: "image/avif", pdf: "application/pdf" };

/** Public uploads (listing photos, floor plans). Private documents are never served here. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  if (!/^(listings|projects|avatars|cms|ads)\//.test(key)) return new Response("Not found", { status: 404 });
  try {
    const data = await getFile("public", key);
    const ext = key.split(".").pop()!.toLowerCase();
    return new Response(new Uint8Array(data), { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
