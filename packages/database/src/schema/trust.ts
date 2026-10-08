import { pgTable, text, uuid, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { id, createdAt, updatedAt, isSeed } from "./_helpers";
import { users } from "./identity";
import { verificationStatusEnum, reportStatusEnum, fraudStatusEnum, severityEnum } from "./enums";

export const verificationRequests = pgTable(
  "verification_requests",
  {
    id: id(),
    /** user | agent | agency | developer | listing | project */
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    requestedLevel: integer("requested_level").notNull(),
    status: verificationStatusEnum("status").notNull().default("pending"),
    submittedById: uuid("submitted_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    notes: text("notes"),
    reviewerNotes: text("reviewer_notes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_subject_idx").on(t.subjectType, t.subjectId), index("verification_status_idx").on(t.status, t.createdAt)],
);

/**
 * Private documents. Files live in private storage (never under a public path) and
 * are streamed only through the authorised /api/v1/documents/:id route.
 */
export const documents = pgTable(
  "documents",
  {
    id: id(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    verificationRequestId: uuid("verification_request_id").references(() => verificationRequests.id, { onDelete: "set null" }),
    /** listing | project | lease | agency | developer */
    relatedType: text("related_type"),
    relatedId: uuid("related_id"),
    /** cnic_front | cnic_back | ownership | allotment | noc | contract | rental_agreement | developer_license | utility_bill | other */
    kind: text("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    /** AI / OCR extracted fields (never shown publicly) */
    extracted: jsonb("extracted").$type<Record<string, unknown>>(),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("documents_owner_idx").on(t.ownerId), index("documents_related_idx").on(t.relatedType, t.relatedId), index("documents_sha_idx").on(t.sha256)],
);

export const reports = pgTable(
  "reports",
  {
    id: id(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("open"),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("reports_target_idx").on(t.targetType, t.targetId), index("reports_status_idx").on(t.status, t.createdAt)],
);

export const fraudFlags = pgTable(
  "fraud_flags",
  {
    id: id(),
    targetType: text("target_type").notNull(), // listing | user | agent | document | message
    targetId: uuid("target_id").notNull(),
    rule: text("rule").notNull(),
    severity: severityEnum("severity").notNull().default("medium"),
    score: integer("score").notNull().default(0),
    summary: text("summary").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    status: fraudStatusEnum("status").notNull().default("open"),
    reviewedById: uuid("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("fraud_target_idx").on(t.targetType, t.targetId), index("fraud_status_idx").on(t.status, t.severity, t.createdAt)],
);
