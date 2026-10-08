import { readDocument } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

/** Authorised stream of a private document (owner, lease party or verification staff). Never cached publicly. */
export const GET = route<{ id: string }>(async ({ user, params }) => {
  const { doc, data } = await readDocument(db, user, params.id);
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": doc.mime,
      "content-disposition": `inline; filename="${doc.originalName.replace(/[^\w.\- ]/g, "_")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}, { auth: true });
