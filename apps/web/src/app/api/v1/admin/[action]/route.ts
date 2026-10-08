import type { AuthUser } from "@propertyx/auth";
import {
  moderateListing,
  adminUpdateListing,
  setUserStatus,
  setUserRole,
  reviewVerification,
  reviewFraudFlag,
  scanAllListings,
  resolveReport,
  moderateReview,
  moderateProject,
  saveLocationContent,
  addLocation,
  savePost,
  deletePost,
  moderateForum,
  moderateCampaign,
  updatePlan,
  refundPayment,
  setSetting,
  setConstructionRates,
  runScheduledJobs,
  badRequest,
  forbidden,
} from "@propertyx/core";
import type { ConstructionRates } from "@propertyx/shared";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

type B = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Every action re-checks the specific permission inside the core service and is audit-logged. */
const ACTIONS: Record<string, (u: AuthUser, b: B) => Promise<unknown>> = {
  "listing.moderate": (u, b) => moderateListing(db, u, b.id, b.decision, b.reason),
  "listing.update": (u, b) => adminUpdateListing(db, u, b.id, b),
  "user.status": (u, b) => setUserStatus(db, u, b.userId, b.status, b.reason),
  "user.role": (u, b) => setUserRole(db, u, b.userId, b.role, !!b.grant),
  "verification.review": (u, b) => reviewVerification(db, u, b.id, b.decision, b.notes, b.level ? Number(b.level) : undefined),
  "fraud.review": (u, b) => reviewFraudFlag(db, u, b.id, b.decision, b.note),
  "fraud.scan": async (u) => {
    if (!u.permissions.includes("fraud.manage")) throw forbidden();
    return scanAllListings(db);
  },
  "report.resolve": (u, b) => resolveReport(db, u, b.id, b.status, b.note, b.action || undefined),
  "review.moderate": (u, b) => moderateReview(db, u, b.id, b.status, b.note),
  "project.moderate": (u, b) => moderateProject(db, u, b.id, b.publishStatus, b.featured),
  "location.save": (u, b) => saveLocationContent(db, u, b.id, b),
  "location.add": (u, b) => addLocation(db, u, { kind: b.kind, cityId: b.cityId, parentSlug: b.parentSlug, name: b.name, lat: Number(b.lat), lng: Number(b.lng), description: b.description }),
  "post.save": (u, b) => savePost(db, u, b, b.id || undefined),
  "post.delete": (u, b) => deletePost(db, u, b.id),
  "forum.moderate": (u, b) => moderateForum(db, u, { threadId: b.threadId, postId: b.postId }, { hidden: b.hidden, locked: b.locked, pinned: b.pinned }),
  "ad.moderate": (u, b) => moderateCampaign(db, u, b.id, b.action, b.reason, { budget: b.budget ? Number(b.budget) : undefined, endAt: b.endAt }),
  "plan.update": (u, b) => updatePlan(db, u, b.id, b.patch ?? {}),
  "payment.refund": (u, b) => refundPayment(db, u, b.id, b.reason ?? ""),
  "setting.set": (u, b) => setSetting(db, u, b.key, b.value),
  "rates.set": (u, b) => setConstructionRates(db, u, b.cityId ?? null, b.rates as ConstructionRates),
  "jobs.run": async (u) => {
    if (!u.permissions.includes("settings.manage")) throw forbidden();
    return runScheduledJobs(db);
  },
};

export const POST = route<{ action: string }>(async ({ req, user, params }) => {
  if (!user!.permissions.includes("admin.access")) throw forbidden();
  const fn = ACTIONS[params.action];
  if (!fn) throw badRequest("Unknown admin action");
  return (await fn(user!, await body<B>(req))) ?? { ok: true };
}, { auth: true, rate: 120 });
