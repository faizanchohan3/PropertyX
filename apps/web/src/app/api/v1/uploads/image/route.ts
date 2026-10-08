import { storeImage, badRequest, forbidden } from "@propertyx/core";
import { route } from "@/lib/api";

/** Generic public image upload for projects, ads and CMS content (validated, EXIF-stripped, WebP). */
const FOLDERS: Record<string, string> = { projects: "project.create", ads: "ads.create", cms: "content.manage", avatars: "message.send" };

export const POST = route(async ({ req, user }) => {
  const form = await req.formData();
  const folder = String(form.get("folder") ?? "");
  const perm = FOLDERS[folder];
  if (!perm) throw badRequest("Unknown upload folder");
  if (!user!.permissions.includes(perm as never)) throw forbidden();
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Choose a file");
  const img = await storeImage(Buffer.from(await file.arrayBuffer()), folder);
  return { url: img.url, width: img.width, height: img.height };
}, { auth: true, rate: 60 });
