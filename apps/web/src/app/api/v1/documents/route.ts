import { uploadDocument, myVerification, badRequest } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route(async ({ user }) => (await myVerification(db, user!)).docs, { auth: true });

/** multipart: file, kind, relatedType?, relatedId? — stored in PRIVATE storage */
export const POST = route(async ({ req, user }) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Choose a file");
  return uploadDocument(db, user, Buffer.from(await file.arrayBuffer()), {
    kind: String(form.get("kind") ?? "other"),
    originalName: file.name,
    relatedType: form.get("relatedType") ? String(form.get("relatedType")) : undefined,
    relatedId: form.get("relatedId") ? String(form.get("relatedId")) : undefined,
  });
}, { auth: true, rate: 30 });
