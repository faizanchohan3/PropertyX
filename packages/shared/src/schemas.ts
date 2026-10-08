import { z } from "zod";
import { FEATURES, FURNISHING, CONDITIONS, PROPERTY_TYPE_KEYS, PURPOSES, REPORT_REASONS, APPOINTMENT_STATUSES, LEAD_STATUSES, NOTIFICATION_CHANNELS } from "./constants";
import { AREA_UNITS } from "./units";
import { SELF_SERVICE_ROLES } from "./permissions";

/** Pakistani mobile: 03XXXXXXXXX or +923XXXXXXXXX. Normalised to +923XXXXXXXXX */
export const pkPhone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .refine((s) => /^(\+92|0092|92|0)3\d{9}$/.test(s), "Enter a valid Pakistani mobile number, e.g. 0300 1234567")
  .transform((s) => "+92" + s.replace(/^(\+92|0092|92|0)/, ""));

export const optionalPkPhone = z.union([z.literal("").transform(() => undefined), pkPhone]).optional();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), "Use letters and numbers");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: optionalPkPhone,
  password: passwordSchema,
  role: z.enum(SELF_SERVICE_ROLES as [string, ...string[]]).default("buyer"),
  agencyName: z.string().trim().max(120).optional(),
  companyName: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const featureKeys = FEATURES.map((f) => f.key) as unknown as [string, ...string[]];

export const listingInputSchema = z.object({
  purpose: z.enum(PURPOSES),
  type: z.enum(PROPERTY_TYPE_KEYS),
  cityId: z.string().uuid({ message: "Select a city" }),
  areaId: z.string().uuid().optional().nullable(),
  societyId: z.string().uuid().optional().nullable(),
  blockId: z.string().uuid().optional().nullable(),
  address: z.string().trim().max(200).optional().default(""),
  lat: z.coerce.number().min(23).max(38).optional().nullable(),
  lng: z.coerce.number().min(60).max(78).optional().nullable(),
  price: z.coerce.number().int().positive("Enter a price").max(1e12),
  rentPeriod: z.enum(["monthly", "yearly"]).optional().nullable(),
  installmentAvailable: z.boolean().default(false),
  advanceAmount: z.coerce.number().int().nonnegative().optional().nullable(),
  monthlyInstallment: z.coerce.number().int().nonnegative().optional().nullable(),
  installmentsRemaining: z.coerce.number().int().nonnegative().optional().nullable(),
  areaValue: z.coerce.number().positive("Enter the area"),
  areaUnit: z.enum(AREA_UNITS),
  beds: z.coerce.number().int().min(0).max(20).optional().nullable(),
  baths: z.coerce.number().int().min(0).max(20).optional().nullable(),
  parkingSpaces: z.coerce.number().int().min(0).max(50).optional().nullable(),
  floors: z.coerce.number().int().min(0).max(100).optional().nullable(),
  floorNumber: z.coerce.number().int().min(-3).max(150).optional().nullable(),
  yearBuilt: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  furnishing: z.enum(FURNISHING).optional().nullable(),
  condition: z.enum(CONDITIONS).optional().nullable(),
  features: z.array(z.enum(featureKeys)).max(60).default([]),
  title: z.string().trim().min(10, "Title should be at least 10 characters").max(120),
  description: z.string().trim().min(40, "Describe the property in at least 40 characters").max(6000),
  highlights: z.array(z.string().trim().max(120)).max(8).default([]),
  videoUrl: z.string().url().max(500).optional().or(z.literal("")).nullable(),
  tourUrl: z.string().url().max(500).optional().or(z.literal("")).nullable(),
  contactName: z.string().trim().min(2).max(80),
  contactPhone: pkPhone,
  contactWhatsapp: optionalPkPhone,
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  media: z
    .array(z.object({ id: z.string().uuid(), kind: z.enum(["image", "floor_plan", "video"]), caption: z.string().max(120).optional() }))
    .max(40)
    .default([]),
});
export type ListingInput = z.infer<typeof listingInputSchema>;

export const leadInputSchema = z.object({
  listingId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  phone: pkPhone,
  email: z.string().trim().email().optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().default(""),
  source: z.enum(["form", "call", "whatsapp", "offer", "payment_plan", "brochure", "ai_assistant"]).default("form"),
  offerAmount: z.coerce.number().int().positive().optional(),
});

export const appointmentInputSchema = z.object({
  listingId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  visitors: z.coerce.number().int().min(1).max(10).default(1),
  message: z.string().trim().max(1000).optional().default(""),
  phone: pkPhone,
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
  note: z.string().max(500).optional(),
});

export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(4000).optional(),
});

export const messageInputSchema = z.object({
  body: z.string().trim().max(4000).default(""),
  kind: z.enum(["text", "image", "document", "property", "voice"]).default("text"),
  attachmentId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
});

export const reviewInputSchema = z.object({
  targetType: z.enum(["agent", "agency", "developer", "project"]),
  targetId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(3000),
});

const reportReasons = REPORT_REASONS.map((r) => r.key) as unknown as [string, ...string[]];
export const reportInputSchema = z.object({
  targetType: z.enum(["listing", "agent", "agency", "user", "review", "project", "message", "forum_post"]),
  targetId: z.string().uuid(),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(2000).optional().default(""),
});

export const savedSearchInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  query: z.record(z.any()),
  frequency: z.enum(["instant", "daily", "weekly"]).default("instant"),
});

export const notificationPrefsSchema = z.record(z.record(z.enum(NOTIFICATION_CHANNELS), z.boolean()));
