import { uploadListingMedia, badRequest } from "@propertyx/core";
import { route } from "@/lib/api";
import { db } from "@/lib/server";

/** multipart: file, kind (image | floor_plan). Validates real file type, strips EXIF, converts to WebP. */
export const POST = route(async ({ req, user }) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Choose a file");
  const kind = form.get("kind") === "floor_plan" ? "floor_plan" : "image";
  return uploadListingMedia(db, user, Buffer.from(await file.arrayBuffer()), kind);
}, { auth: true, rate: 60 });
