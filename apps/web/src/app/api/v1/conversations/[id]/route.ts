import { getConversation, sendMessage, setConversationBlocked, storeAttachment } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const GET = route<{ id: string }>(async ({ user, params, req }) => getConversation(db, user!, params.id, { after: req.nextUrl.searchParams.get("after") ?? undefined }), { auth: true });

/** JSON {body, listingId} or multipart with "file" (image, document, voice note) */
export const POST = route<{ id: string }>(async ({ user, params, req }) => {
  if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    let attachment;
    if (file instanceof File && file.size > 0) {
      const stored = await storeAttachment(Buffer.from(await file.arrayBuffer()), `chat/${params.id}`);
      attachment = { url: stored.url, name: file.name.slice(0, 120) || "attachment", mime: stored.mime, size: stored.sizeBytes };
    }
    return sendMessage(db, user, params.id, { body: String(form.get("body") ?? "") }, attachment);
  }
  return sendMessage(db, user, params.id, await body(req));
}, { auth: true, rate: 40 });

export const PATCH = route<{ id: string }>(async ({ user, params, req }) => {
  const b = await body<{ blocked: boolean }>(req);
  await setConversationBlocked(db, user, params.id, !!b.blocked);
  return { ok: true };
}, { auth: true });
