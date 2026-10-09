/**
 * Rental & property management for landlords and property managers, plus the
 * tenant portal. Rent dues are generated monthly per active lease; reminders go out
 * three days before and on the due date.
 */
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { notify } from "@propertyx/notifications";
import { z } from "zod";
import { pkPhone, formatPKR } from "@propertyx/shared";
import { badRequest, forbidden, notFound, requirePerm, type Actor } from "./errors";

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);

function canManage(actor: Actor, mp: { ownerId: string; managerId: string | null }) {
  return mp.ownerId === actor.id || mp.managerId === actor.id || actor.isStaff;
}

async function loadProperty(db: Database, actor: Actor, id: string) {
  const [mp] = await db.select().from(s.managedProperties).where(eq(s.managedProperties.id, id));
  if (!mp) throw notFound("Property");
  if (!canManage(actor, mp)) throw forbidden();
  return mp;
}

async function loadUnit(db: Database, actor: Actor, unitId: string) {
  const [u] = await db.select({ u: s.rentalUnits, mp: s.managedProperties }).from(s.rentalUnits).innerJoin(s.managedProperties, eq(s.managedProperties.id, s.rentalUnits.managedPropertyId)).where(eq(s.rentalUnits.id, unitId));
  if (!u) throw notFound("Unit");
  if (!canManage(actor, u.mp)) throw forbidden();
  return u;
}

async function loadLease(db: Database, actor: Actor, leaseId: string) {
  const [l] = await db.select({ l: s.leases, mp: s.managedProperties, unit: s.rentalUnits }).from(s.leases).innerJoin(s.rentalUnits, eq(s.rentalUnits.id, s.leases.unitId)).innerJoin(s.managedProperties, eq(s.managedProperties.id, s.rentalUnits.managedPropertyId)).where(eq(s.leases.id, leaseId));
  if (!l) throw notFound("Lease");
  return l;
}

export async function rentalDashboard(db: Database, actor: Actor | null) {
  requirePerm(actor, "rental.manage");
  const props = await db.select().from(s.managedProperties).where(or(eq(s.managedProperties.ownerId, actor.id), eq(s.managedProperties.managerId, actor.id))).orderBy(s.managedProperties.name);
  const ids = props.map((p) => p.id);
  if (!ids.length) return { properties: [], units: [], leases: [], payments: [], maintenance: [], expenses: [], staff: [], kpis: { units: 0, occupied: 0, occupancy: 0, monthlyRent: 0, outstanding: 0, collectedThisMonth: 0, expensesThisMonth: 0, netIncomeThisMonth: 0 }, trend: [] };
  const inIds = sql.join(ids.map((i) => sql`${i}`), sql`, `);
  const units = await db.select().from(s.rentalUnits).where(inArray(s.rentalUnits.managedPropertyId, ids)).orderBy(s.rentalUnits.label);
  const unitIds = units.map((u) => u.id);
  const leases = unitIds.length ? await db.select().from(s.leases).where(inArray(s.leases.unitId, unitIds)).orderBy(desc(s.leases.startDate)) : [];
  const leaseIds = leases.map((l) => l.id);
  const payments = leaseIds.length ? await db.select().from(s.rentPayments).where(inArray(s.rentPayments.leaseId, leaseIds)).orderBy(desc(s.rentPayments.dueDate)) : [];
  const maintenance = unitIds.length ? await db.select().from(s.maintenanceRequests).where(inArray(s.maintenanceRequests.unitId, unitIds)).orderBy(desc(s.maintenanceRequests.createdAt)) : [];
  const expenses = await db.select().from(s.propertyExpenses).where(inArray(s.propertyExpenses.managedPropertyId, ids)).orderBy(desc(s.propertyExpenses.incurredOn));
  const staff = await db.select().from(s.propertyStaff).where(eq(s.propertyStaff.managerId, actor.id));
  const month = new Date().toISOString().slice(0, 7);
  const activeLeases = leases.filter((l) => l.status === "active");
  const occupied = units.filter((u) => u.occupancy === "occupied").length;
  const outstanding = payments.filter((p) => p.status !== "paid" && p.status !== "waived").reduce((t, p) => t + (p.amountDue - p.amountPaid), 0);
  const collected = payments.filter((p) => p.paidAt && p.paidAt.toISOString().slice(0, 7) === month).reduce((t, p) => t + p.amountPaid, 0);
  const exp = expenses.filter((e) => e.incurredOn.slice(0, 7) === month).reduce((t, e) => t + e.amount, 0);
  const trend = await db.execute<Row>(sql`
    select m as month,
      (select coalesce(sum(rp.amount_paid),0) from rent_payments rp join leases l on l.id = rp.lease_id join rental_units u on u.id = l.unit_id where u.managed_property_id in (${inIds}) and to_char(rp.paid_at, 'YYYY-MM') = m) as income,
      (select coalesce(sum(e.amount),0) from property_expenses e where e.managed_property_id in (${inIds}) and substr(e.incurred_on::text, 1, 7) = m) as expenses
    from (select to_char(generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month'), 'YYYY-MM') as m) months order by m`);
  return {
    properties: props,
    units,
    leases,
    payments,
    maintenance,
    expenses,
    staff,
    kpis: {
      units: units.length,
      occupied,
      occupancy: units.length ? Math.round((occupied / units.length) * 100) : 0,
      monthlyRent: activeLeases.reduce((t, l) => t + l.monthlyRent, 0),
      outstanding,
      collectedThisMonth: collected,
      expensesThisMonth: exp,
      netIncomeThisMonth: collected - exp,
    },
    trend: trend.map((t) => ({ month: t.month as string, income: n(t.income), expenses: n(t.expenses), net: n(t.income) - n(t.expenses) })),
  };
}

const propertySchema = z.object({ name: z.string().trim().min(2).max(120), address: z.string().trim().min(5).max(250), cityName: z.string().max(60).optional(), notes: z.string().max(1000).optional(), managerEmail: z.string().email().optional().or(z.literal("")) });
export async function createManagedProperty(db: Database, actor: Actor | null, raw: unknown) {
  requirePerm(actor, "rental.manage");
  const d = propertySchema.parse(raw);
  let managerId: string | null = actor.roles.includes("property_manager") ? actor.id : null;
  if (d.managerEmail) {
    const [m] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, d.managerEmail.toLowerCase()));
    if (!m) throw badRequest("No Bismillah account found for that manager email");
    managerId = m.id;
  }
  const [mp] = await db.insert(s.managedProperties).values({ ownerId: actor.id, managerId, name: d.name, address: d.address, cityName: d.cityName ?? null, notes: d.notes ?? null }).returning();
  return mp;
}

const unitSchema = z.object({ managedPropertyId: z.string().uuid(), label: z.string().trim().min(1).max(60), beds: z.coerce.number().int().min(0).max(20).optional().nullable(), baths: z.coerce.number().int().min(0).max(20).optional().nullable(), areaSqft: z.coerce.number().int().positive().optional().nullable(), marketRent: z.coerce.number().int().positive().optional().nullable() });
export async function createUnit(db: Database, actor: Actor | null, raw: unknown) {
  requirePerm(actor, "rental.manage");
  const d = unitSchema.parse(raw);
  await loadProperty(db, actor, d.managedPropertyId);
  const [u] = await db.insert(s.rentalUnits).values({ ...d, beds: d.beds ?? null, baths: d.baths ?? null, areaSqft: d.areaSqft ?? null, marketRent: d.marketRent ?? null }).returning();
  return u;
}

const leaseSchema = z.object({
  unitId: z.string().uuid(),
  tenantName: z.string().trim().min(2).max(80),
  tenantPhone: pkPhone,
  tenantEmail: z.string().email().optional().or(z.literal("")),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlyRent: z.coerce.number().int().positive(),
  securityDeposit: z.coerce.number().int().min(0).default(0),
  dueDay: z.coerce.number().int().min(1).max(28).default(5),
  annualIncreasePct: z.coerce.number().int().min(0).max(50).default(10),
  terms: z.string().max(4000).optional(),
});
export async function createLease(db: Database, actor: Actor | null, raw: unknown) {
  requirePerm(actor, "rental.manage");
  const parsed = leaseSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Check the lease details", parsed.error.flatten());
  const d = parsed.data;
  if (d.endDate <= d.startDate) throw badRequest("End date must be after start date");
  const { u, mp } = await loadUnit(db, actor, d.unitId);
  const [active] = await db.select().from(s.leases).where(and(eq(s.leases.unitId, u.id), eq(s.leases.status, "active")));
  if (active) throw badRequest("This unit already has an active lease. End it first.");
  // link to an existing tenant account by email so they get the tenant portal
  let tenantUserId: string | null = null;
  if (d.tenantEmail) {
    const [t] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, d.tenantEmail.toLowerCase()));
    tenantUserId = t?.id ?? null;
  }
  const [lease] = await db.insert(s.leases).values({ ...d, tenantEmail: d.tenantEmail || null, tenantUserId, landlordId: mp.ownerId, terms: d.terms ?? null }).returning();
  await db.update(s.rentalUnits).set({ occupancy: "occupied" }).where(eq(s.rentalUnits.id, u.id));
  await generateRentDues(db, lease.id);
  if (tenantUserId) await notify(db, { userId: tenantUserId, type: "rent", title: "Your lease is on Bismillah", body: `${mp.name} — ${u.label}. Rent ${formatPKR(d.monthlyRent)} due on day ${d.dueDay} each month.`, link: "/dashboard/tenant" });
  return lease;
}

export async function endLease(db: Database, actor: Actor | null, leaseId: string) {
  requirePerm(actor, "rental.manage");
  const l = await loadLease(db, actor, leaseId);
  if (!canManage(actor, l.mp)) throw forbidden();
  await db.update(s.leases).set({ status: "ended", endDate: new Date().toISOString().slice(0, 10) }).where(eq(s.leases.id, leaseId));
  await db.update(s.rentalUnits).set({ occupancy: "vacant" }).where(eq(s.rentalUnits.id, l.unit.id));
  await db.delete(s.rentPayments).where(and(eq(s.rentPayments.leaseId, leaseId), eq(s.rentPayments.status, "due"), sql`${s.rentPayments.dueDate} > now()`));
}

/** Creates rent dues for every month of the lease up to the current month (idempotent). */
export async function generateRentDues(db: Database, leaseId?: string) {
  const leases = leaseId ? await db.select().from(s.leases).where(eq(s.leases.id, leaseId)) : await db.select().from(s.leases).where(eq(s.leases.status, "active"));
  let created = 0;
  const now = new Date();
  for (const l of leases) {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(Math.min(end.getTime(), new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()));
    while (cursor <= last) {
      const due = new Date(cursor.getFullYear(), cursor.getMonth(), l.dueDay);
      if (due >= new Date(start.getFullYear(), start.getMonth(), 1) && due <= end) {
        const yearsIn = Math.floor((due.getTime() - start.getTime()) / (365 * 86400_000));
        const amount = Math.round(l.monthlyRent * Math.pow(1 + l.annualIncreasePct / 100, Math.max(0, yearsIn)));
        const period = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}`;
        const r = await db.insert(s.rentPayments).values({ leaseId: l.id, period, amountDue: amount, dueDate: `${period}-${String(l.dueDay).padStart(2, "0")}`, status: due < now ? "overdue" : "due" }).onConflictDoNothing().returning({ id: s.rentPayments.id });
        created += r.length;
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  await db.execute(sql`update rent_payments set status = 'overdue' where status = 'due' and due_date < current_date`);
  return created;
}

export async function recordRentPayment(db: Database, actor: Actor | null, paymentId: string, input: { amount: number; method: string; reference?: string }) {
  requirePerm(actor, "rental.manage");
  const [p] = await db.select().from(s.rentPayments).where(eq(s.rentPayments.id, paymentId));
  if (!p) throw notFound("Rent due");
  const l = await loadLease(db, actor, p.leaseId);
  if (!canManage(actor, l.mp)) throw forbidden();
  if (!(input.amount > 0)) throw badRequest("Enter the amount received");
  const paid = p.amountPaid + Math.round(input.amount);
  const status = paid >= p.amountDue ? "paid" : "partial";
  await db.update(s.rentPayments).set({ amountPaid: paid, status, paidAt: new Date(), method: input.method.slice(0, 40), reference: input.reference?.slice(0, 80) ?? null }).where(eq(s.rentPayments.id, paymentId));
  if (l.l.tenantUserId) await notify(db, { userId: l.l.tenantUserId, type: "payment", title: "Rent payment recorded", body: `${formatPKR(input.amount)} received for ${p.period}.`, link: "/dashboard/tenant" });
}

export async function sendRentReminders(db: Database) {
  const due = await db.execute<Row>(sql`
    select rp.id, rp.period, rp.amount_due - rp.amount_paid as balance, rp.due_date, rp.status, l.tenant_user_id, l.landlord_id, l.tenant_name, u.label, mp.name as property_name
    from rent_payments rp join leases l on l.id = rp.lease_id join rental_units u on u.id = l.unit_id join managed_properties mp on mp.id = u.managed_property_id
    where rp.status in ('due','overdue','partial') and l.status = 'active'
      and (rp.reminder_sent_at is null or rp.reminder_sent_at < now() - interval '3 days')
      and rp.due_date <= current_date + 3`);
  for (const r of due) {
    const overdue = new Date(r.due_date as string) < new Date(new Date().toDateString());
    if (r.tenant_user_id)
      await notify(db, { userId: r.tenant_user_id as string, type: "rent", title: overdue ? "Rent overdue" : "Rent due soon", body: `${formatPKR(n(r.balance))} for ${r.property_name} (${r.label}) — ${r.period}.`, link: "/dashboard/tenant" });
    if (overdue) await notify(db, { userId: r.landlord_id as string, type: "rent", title: "Rent overdue", body: `${r.tenant_name} owes ${formatPKR(n(r.balance))} for ${r.period} (${r.property_name}).`, link: "/dashboard/rentals" });
    await db.update(s.rentPayments).set({ reminderSentAt: new Date() }).where(eq(s.rentPayments.id, r.id as string));
  }
  return due.length;
}

const maintenanceSchema = z.object({ unitId: z.string().uuid().optional(), leaseId: z.string().uuid().optional(), title: z.string().trim().min(3).max(120), description: z.string().trim().min(5).max(2000), category: z.enum(["plumbing", "electrical", "appliance", "structural", "cleaning", "pest", "general"]).default("general"), priority: z.enum(["low", "normal", "high", "urgent"]).default("normal") });
export async function createMaintenance(db: Database, actor: Actor | null, raw: unknown) {
  if (!actor) throw forbidden();
  const d = maintenanceSchema.parse(raw);
  let unitId = d.unitId;
  let leaseId = d.leaseId ?? null;
  let notifyId: string | null = null;
  if (d.leaseId) {
    const l = await loadLease(db, actor, d.leaseId);
    if (l.l.tenantUserId !== actor.id && !canManage(actor, l.mp)) throw forbidden();
    unitId = l.unit.id;
    notifyId = l.l.tenantUserId === actor.id ? (l.mp.managerId ?? l.mp.ownerId) : null;
  } else if (unitId) {
    await loadUnit(db, actor, unitId);
  } else throw badRequest("Choose a unit");
  const [m] = await db.insert(s.maintenanceRequests).values({ unitId: unitId!, leaseId, requestedById: actor.id, title: d.title, description: d.description, category: d.category, priority: d.priority }).returning();
  if (notifyId) await notify(db, { userId: notifyId, type: "rent", title: `Maintenance request: ${d.title}`, body: `${actor.name}: ${d.description.slice(0, 120)}`, link: "/dashboard/rentals" });
  return m;
}

export async function updateMaintenance(db: Database, actor: Actor | null, id: string, patch: { status?: "open" | "in_progress" | "resolved" | "closed"; cost?: number; assignedStaffId?: string | null }) {
  requirePerm(actor, "rental.manage");
  const [m] = await db.select().from(s.maintenanceRequests).where(eq(s.maintenanceRequests.id, id));
  if (!m) throw notFound("Request");
  const { mp } = await loadUnit(db, actor, m.unitId);
  await db.update(s.maintenanceRequests).set({ ...patch, resolvedAt: patch.status === "resolved" ? new Date() : undefined }).where(eq(s.maintenanceRequests.id, id));
  if (patch.cost && patch.status === "resolved") await db.insert(s.propertyExpenses).values({ managedPropertyId: mp.id, unitId: m.unitId, category: "repairs", description: m.title, amount: Math.round(patch.cost), incurredOn: new Date().toISOString().slice(0, 10) });
  if (patch.status && m.requestedById && m.requestedById !== actor.id) await notify(db, { userId: m.requestedById, type: "rent", title: `Maintenance ${patch.status.replace("_", " ")}`, body: m.title, link: "/dashboard/tenant" });
}

const expenseSchema = z.object({ managedPropertyId: z.string().uuid(), category: z.enum(["repairs", "utilities", "tax", "salaries", "insurance", "other"]), description: z.string().max(200).optional(), amount: z.coerce.number().int().positive(), incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export async function addExpense(db: Database, actor: Actor | null, raw: unknown) {
  requirePerm(actor, "rental.manage");
  const d = expenseSchema.parse(raw);
  await loadProperty(db, actor, d.managedPropertyId);
  const [e] = await db.insert(s.propertyExpenses).values({ ...d, description: d.description ?? null }).returning();
  return e;
}

const staffSchema = z.object({ name: z.string().trim().min(2).max(80), role: z.enum(["caretaker", "guard", "electrician", "plumber", "cleaner", "accountant", "other"]), phone: z.union([z.literal(""), pkPhone]).optional(), monthlySalary: z.coerce.number().int().min(0).optional().nullable() });
export async function addStaff(db: Database, actor: Actor | null, raw: unknown) {
  requirePerm(actor, "rental.manage");
  const d = staffSchema.parse(raw);
  const [st] = await db.insert(s.propertyStaff).values({ managerId: actor.id, name: d.name, role: d.role, phone: d.phone || null, monthlySalary: d.monthlySalary ?? null }).returning();
  return st;
}

export async function tenantPortal(db: Database, actor: Actor | null) {
  if (!actor) throw forbidden();
  const leases = await db
    .select({ l: s.leases, unit: s.rentalUnits, mp: s.managedProperties, landlordName: s.users.name })
    .from(s.leases)
    .innerJoin(s.rentalUnits, eq(s.rentalUnits.id, s.leases.unitId))
    .innerJoin(s.managedProperties, eq(s.managedProperties.id, s.rentalUnits.managedPropertyId))
    .innerJoin(s.users, eq(s.users.id, s.leases.landlordId))
    .where(eq(s.leases.tenantUserId, actor.id))
    .orderBy(desc(s.leases.startDate));
  const ids = leases.map((x) => x.l.id);
  const payments = ids.length ? await db.select().from(s.rentPayments).where(inArray(s.rentPayments.leaseId, ids)).orderBy(desc(s.rentPayments.dueDate)) : [];
  const maintenance = ids.length ? await db.select().from(s.maintenanceRequests).where(inArray(s.maintenanceRequests.leaseId, ids)).orderBy(desc(s.maintenanceRequests.createdAt)) : [];
  const docs = ids.length ? await db.select({ id: s.documents.id, kind: s.documents.kind, originalName: s.documents.originalName, relatedId: s.documents.relatedId, createdAt: s.documents.createdAt }).from(s.documents).where(and(eq(s.documents.relatedType, "lease"), inArray(s.documents.relatedId, ids))) : [];
  return { leases, payments, maintenance, documents: docs };
}

export async function attachLeaseDocument(db: Database, actor: Actor | null, leaseId: string, documentId: string) {
  requirePerm(actor, "rental.manage");
  const l = await loadLease(db, actor, leaseId);
  if (!canManage(actor, l.mp)) throw forbidden();
  await db.update(s.documents).set({ relatedType: "lease", relatedId: leaseId }).where(and(eq(s.documents.id, documentId), eq(s.documents.ownerId, actor.id)));
  await db.update(s.leases).set({ agreementDocumentId: documentId }).where(eq(s.leases.id, leaseId));
}
