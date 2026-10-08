import { pgEnum } from "drizzle-orm/pg-core";
import {
  PURPOSES,
  PROPERTY_TYPE_KEYS,
  LISTING_STATUSES,
  FURNISHING,
  CONDITIONS,
  LEAD_STATUSES,
  APPOINTMENT_STATUSES,
  PROJECT_STATUSES,
  UNIT_TYPES,
  PAYMENT_PURPOSES,
  AREA_UNITS,
} from "@propertyx/shared";

export const purposeEnum = pgEnum("purpose", PURPOSES);
export const propertyTypeEnum = pgEnum("property_type", PROPERTY_TYPE_KEYS);
export const propertyCategoryEnum = pgEnum("property_category", ["residential", "plot", "commercial", "agricultural"]);
export const listingStatusEnum = pgEnum("listing_status", LISTING_STATUSES);
export const furnishingEnum = pgEnum("furnishing", FURNISHING);
export const conditionEnum = pgEnum("property_condition", CONDITIONS);
export const areaUnitEnum = pgEnum("area_unit", AREA_UNITS);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "pending", "deleted"]);
export const leadStatusEnum = pgEnum("lead_status", LEAD_STATUSES);
export const leadSourceEnum = pgEnum("lead_source", ["form", "call", "whatsapp", "chat", "visit", "offer", "payment_plan", "brochure", "ai_assistant"]);
export const appointmentStatusEnum = pgEnum("appointment_status", APPOINTMENT_STATUSES);
export const projectStatusEnum = pgEnum("project_status", PROJECT_STATUSES);
export const unitTypeEnum = pgEnum("unit_type", UNIT_TYPES);
export const mediaKindEnum = pgEnum("media_kind", ["image", "video", "floor_plan", "tour", "master_plan", "brochure"]);
export const messageKindEnum = pgEnum("message_kind", ["text", "image", "document", "property", "voice", "system"]);
export const paymentPurposeEnum = pgEnum("payment_purpose", PAYMENT_PURPOSES);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded", "cancelled"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "cancelled", "expired"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected", "expired", "cancelled"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "investigating", "resolved", "dismissed"]);
export const fraudStatusEnum = pgEnum("fraud_status", ["open", "confirmed", "dismissed"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high", "critical"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "published", "archived"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "published", "rejected", "flagged"]);
export const adStatusEnum = pgEnum("ad_status", ["draft", "pending", "active", "paused", "ended", "rejected"]);
export const adFormatEnum = pgEnum("ad_format", ["featured_listing", "top_search", "homepage_banner", "project_promotion", "area_sponsorship", "agent_promotion"]);
export const locationKindEnum = pgEnum("location_kind", ["province", "city", "area", "society", "block"]);
export const leaseStatusEnum = pgEnum("lease_status", ["draft", "active", "ended", "terminated"]);
export const rentStatusEnum = pgEnum("rent_status", ["due", "paid", "partial", "overdue", "waived"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", ["open", "in_progress", "resolved", "closed"]);
export const priorityEnum = pgEnum("priority", ["low", "normal", "high", "urgent"]);
export const unitOccupancyEnum = pgEnum("unit_occupancy", ["vacant", "occupied", "maintenance"]);
