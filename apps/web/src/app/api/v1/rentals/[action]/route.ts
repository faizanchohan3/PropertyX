import { createManagedProperty, createUnit, createLease, endLease, recordRentPayment, createMaintenance, updateMaintenance, addExpense, addStaff, attachLeaseDocument, rentalDashboard, tenantPortal, badRequest } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

type B = Record<string, unknown>;

const ACTIONS: Record<string, (user: Parameters<typeof createUnit>[1], b: B) => Promise<unknown>> = {
  property: (u, b) => createManagedProperty(db, u, b),
  unit: (u, b) => createUnit(db, u, b),
  lease: (u, b) => createLease(db, u, b),
  "end-lease": (u, b) => endLease(db, u, String(b.leaseId)),
  payment: (u, b) => recordRentPayment(db, u, String(b.paymentId), { amount: Number(b.amount), method: String(b.method ?? "Cash"), reference: b.reference ? String(b.reference) : undefined }),
  maintenance: (u, b) => createMaintenance(db, u, b),
  "maintenance-update": (u, b) => updateMaintenance(db, u, String(b.id), { status: b.status as "resolved", cost: b.cost ? Number(b.cost) : undefined }),
  expense: (u, b) => addExpense(db, u, b),
  staff: (u, b) => addStaff(db, u, b),
  "attach-document": (u, b) => attachLeaseDocument(db, u, String(b.leaseId), String(b.documentId)),
};

export const GET = route<{ action: string }>(async ({ user, params }) => {
  if (params.action === "dashboard") return rentalDashboard(db, user);
  if (params.action === "tenant") return tenantPortal(db, user);
  throw badRequest("Unknown view");
}, { auth: true });

export const POST = route<{ action: string }>(async ({ req, user, params }) => {
  const fn = ACTIONS[params.action];
  if (!fn) throw badRequest("Unknown action");
  return (await fn(user, await body(req))) ?? { ok: true };
}, { auth: true, rate: 60 });
