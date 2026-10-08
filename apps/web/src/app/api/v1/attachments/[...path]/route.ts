import { canAccessAttachment, getFile } from "@propertyx/core";
import { route, json } from "@/lib/api";
import { db } from "@/lib/server";

const TYPES: Record<string, string> = { webp: "image/webp", pdf: "application/pdf", webm: "audio/webm", ogg: "audio/ogg", mpeg: "audio/mpeg", mp4: "audio/mp4", jpeg: "image/jpeg", png: "image/png" };

/** Chat attachments: only conversation participants (or staff) can download. */
export const GET = route<{ path: string[] }>(async ({ params, user }) => {
  const key = params.path.join("/");
  const url = `/api/v1/attachments/${key}`;
  if (!(await canAccessAttachment(db, user!, url))) return json({ error: { code: "forbidden", message: "Not allowed" } }, 403);
  const data = await getFile("private", key);
  const ext = key.split(".").pop()!.toLowerCase();
  return new Response(new Uint8Array(data), { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff", "content-disposition": ext === "pdf" ? "inline" : "inline" } });
}, { auth: true });
