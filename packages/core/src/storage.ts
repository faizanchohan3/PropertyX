/**
 * File storage. Two visibilities:
 *  - public:  listing photos, floor plans, avatars, chat images (served at /media/<key>)
 *  - private: CNIC / ownership documents, contracts (NEVER served statically; streamed
 *             only through the authorised /api/v1/documents/:id route)
 * The local driver writes under STORAGE_PUBLIC_DIR / STORAGE_PRIVATE_DIR. An S3 driver can
 * implement the same StorageDriver interface for production.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { badRequest } from "./errors";

export type Visibility = "public" | "private";

function repoRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "packages")) && existsSync(path.join(dir, "apps"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function baseDir(v: Visibility) {
  const configured = v === "public" ? process.env.STORAGE_PUBLIC_DIR ?? "./storage/public" : process.env.STORAGE_PRIVATE_DIR ?? "./storage/private";
  return path.isAbsolute(configured) ? configured : path.resolve(repoRoot(), configured);
}

function safeKey(key: string) {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) throw badRequest("Invalid storage key");
  return key;
}

export async function putFile(v: Visibility, key: string, data: Buffer) {
  const file = path.join(baseDir(v), safeKey(key));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  return { key, url: v === "public" ? `/media/${key}` : null };
}

export async function getFile(v: Visibility, key: string) {
  return readFile(path.join(baseDir(v), safeKey(key)));
}

export async function fileExists(v: Visibility, key: string) {
  try {
    await stat(path.join(baseDir(v), safeKey(key)));
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(v: Visibility, key: string) {
  try {
    await unlink(path.join(baseDir(v), safeKey(key)));
  } catch {
    /* already gone */
  }
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ATTACHMENT_TYPES = [...DOCUMENT_TYPES, "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4"];
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_DOC_BYTES = 15 * 1024 * 1024;

/** Detect real file type from magic bytes (never trust the client's content-type). */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString().startsWith("ftypavif")) return "image/avif";
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "audio/webm";
  if (buf.subarray(0, 4).toString() === "OggS") return "audio/ogg";
  if (buf.subarray(0, 3).toString() === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (buf.subarray(4, 8).toString() === "ftyp") return "audio/mp4";
  return null;
}

export function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

/** 64-bit average hash for near-duplicate image detection. */
export async function averageHash(buf: Buffer): Promise<string> {
  const px = await sharp(buf).rotate().resize(8, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  const avg = px.reduce((s, v) => s + v, 0) / px.length;
  let bits = 0n;
  for (let i = 0; i < 64; i++) if (px[i] >= avg) bits |= 1n << BigInt(i);
  return bits.toString(16).padStart(16, "0");
}

export function hammingHex(a: string, b: string) {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/**
 * Validates, strips EXIF (privacy: removes GPS from phones), resizes to max 2000px
 * and re-encodes as WebP. Returns hashes for duplicate detection.
 */
export async function storeImage(buf: Buffer, folder: string) {
  if (buf.length > MAX_IMAGE_BYTES) throw badRequest("Image is larger than 12 MB");
  const mime = sniffMime(buf);
  if (!mime || !IMAGE_TYPES.includes(mime)) throw badRequest("Unsupported image type. Use JPG, PNG or WebP.");
  const img = sharp(buf, { failOn: "error" }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height || meta.width < 300 || meta.height < 200) throw badRequest("Image is too small (minimum 300×200).");
  const out = await img.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.webp`;
  const saved = await putFile("public", key, out.data);
  return { ...saved, width: out.info.width, height: out.info.height, sizeBytes: out.data.length, sha256: sha256(buf), perceptualHash: await averageHash(buf) };
}

export async function storePrivate(buf: Buffer, folder: string, allowed = DOCUMENT_TYPES) {
  if (buf.length > MAX_DOC_BYTES) throw badRequest("File is larger than 15 MB");
  const mime = sniffMime(buf);
  if (!mime || !allowed.includes(mime)) throw badRequest("Unsupported file type. Use PDF, JPG or PNG.");
  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1];
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  await putFile("private", key, buf);
  return { key, mime, sizeBytes: buf.length, sha256: sha256(buf) };
}

export async function storeAttachment(buf: Buffer, folder: string) {
  if (buf.length > MAX_DOC_BYTES) throw badRequest("File is larger than 15 MB");
  const mime = sniffMime(buf);
  if (!mime || !ATTACHMENT_TYPES.includes(mime)) throw badRequest("Unsupported attachment type.");
  let data = buf;
  let finalMime = mime;
  if (IMAGE_TYPES.includes(mime)) {
    // strip EXIF / GPS and normalise
    data = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    finalMime = "image/webp";
  }
  const ext = finalMime === "application/pdf" ? "pdf" : finalMime.split("/")[1];
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  await putFile("private", key, data);
  // served only to conversation participants via /api/v1/attachments/<key>
  return { url: `/api/v1/attachments/${key}`, key, mime: finalMime, sizeBytes: data.length };
}
