import { pgTable, text, uuid, integer, timestamp, index, bigint, date, uniqueIndex } from "drizzle-orm/pg-core";
import { id, createdAt, updatedAt, isSeed } from "./_helpers";
import { users } from "./identity";
import { properties } from "./properties";
import { documents } from "./trust";
import { leaseStatusEnum, rentStatusEnum, maintenanceStatusEnum, priorityEnum, unitOccupancyEnum } from "./enums";

/** A property under management (by its landlord or a property manager). */
export const managedProperties = pgTable(
  "managed_properties",
  {
    id: id(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id").references(() => users.id, { onDelete: "set null" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    cityName: text("city_name"),
    notes: text("notes"),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("managed_owner_idx").on(t.ownerId), index("managed_manager_idx").on(t.managerId)],
);

export const rentalUnits = pgTable(
  "rental_units",
  {
    id: id(),
    managedPropertyId: uuid("managed_property_id").notNull().references(() => managedProperties.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    beds: integer("beds"),
    baths: integer("baths"),
    areaSqft: integer("area_sqft"),
    marketRent: bigint("market_rent", { mode: "number" }),
    occupancy: unitOccupancyEnum("occupancy").notNull().default("vacant"),
    isSeed: isSeed(),
  },
  (t) => [index("rental_units_property_idx").on(t.managedPropertyId)],
);

export const leases = pgTable(
  "leases",
  {
    id: id(),
    unitId: uuid("unit_id").notNull().references(() => rentalUnits.id, { onDelete: "cascade" }),
    landlordId: uuid("landlord_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tenantUserId: uuid("tenant_user_id").references(() => users.id, { onDelete: "set null" }),
    tenantName: text("tenant_name").notNull(),
    tenantPhone: text("tenant_phone").notNull(),
    tenantEmail: text("tenant_email"),
    tenantCnicLast4: text("tenant_cnic_last4"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    monthlyRent: bigint("monthly_rent", { mode: "number" }).notNull(),
    securityDeposit: bigint("security_deposit", { mode: "number" }).notNull().default(0),
    dueDay: integer("due_day").notNull().default(5),
    annualIncreasePct: integer("annual_increase_pct").notNull().default(10),
    status: leaseStatusEnum("status").notNull().default("active"),
    agreementDocumentId: uuid("agreement_document_id").references(() => documents.id, { onDelete: "set null" }),
    terms: text("terms"),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leases_unit_idx").on(t.unitId), index("leases_landlord_idx").on(t.landlordId), index("leases_tenant_idx").on(t.tenantUserId)],
);

export const rentPayments = pgTable(
  "rent_payments",
  {
    id: id(),
    leaseId: uuid("lease_id").notNull().references(() => leases.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    amountDue: bigint("amount_due", { mode: "number" }).notNull(),
    amountPaid: bigint("amount_paid", { mode: "number" }).notNull().default(0),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    method: text("method"),
    reference: text("reference"),
    status: rentStatusEnum("status").notNull().default("due"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("rent_payments_period_uq").on(t.leaseId, t.period), index("rent_payments_status_idx").on(t.status, t.dueDate)],
);

export const maintenanceRequests = pgTable(
  "maintenance_requests",
  {
    id: id(),
    unitId: uuid("unit_id").notNull().references(() => rentalUnits.id, { onDelete: "cascade" }),
    leaseId: uuid("lease_id").references(() => leases.id, { onDelete: "set null" }),
    requestedById: uuid("requested_by_id").references(() => users.id, { onDelete: "set null" }),
    assignedStaffId: uuid("assigned_staff_id"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().default("general"),
    priority: priorityEnum("priority").notNull().default("normal"),
    status: maintenanceStatusEnum("status").notNull().default("open"),
    cost: bigint("cost", { mode: "number" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("maintenance_unit_idx").on(t.unitId, t.status)],
);

export const propertyExpenses = pgTable(
  "property_expenses",
  {
    id: id(),
    managedPropertyId: uuid("managed_property_id").notNull().references(() => managedProperties.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => rentalUnits.id, { onDelete: "set null" }),
    category: text("category").notNull(), // repairs | utilities | tax | salaries | insurance | other
    description: text("description"),
    amount: bigint("amount", { mode: "number" }).notNull(),
    incurredOn: date("incurred_on").notNull(),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("expenses_property_idx").on(t.managedPropertyId, t.incurredOn)],
);

export const propertyStaff = pgTable("property_staff", {
  id: id(),
  managerId: uuid("manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(), // caretaker | guard | electrician | plumber | cleaner
  phone: text("phone"),
  monthlySalary: bigint("monthly_salary", { mode: "number" }),
  isSeed: isSeed(),
  createdAt: createdAt(),
});

