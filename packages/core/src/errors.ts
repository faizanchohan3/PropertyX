export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new AppError(404, "not_found", `${what} not found`);
export const forbidden = (msg = "You don't have permission to do that") => new AppError(403, "forbidden", msg);
export const unauthorized = (msg = "Please sign in to continue") => new AppError(401, "unauthorized", msg);
export const badRequest = (msg: string, details?: unknown) => new AppError(400, "bad_request", msg, details);
export const conflict = (msg: string) => new AppError(409, "conflict", msg);
export const tooMany = (msg = "Too many requests. Please slow down.") => new AppError(429, "rate_limited", msg);
export const paymentRequired = (msg: string) => new AppError(402, "upgrade_required", msg);

/** Minimal actor shape used by services (matches AuthUser from @propertyx/auth). */
export interface Actor {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  isStaff: boolean;
  phoneVerified?: boolean;
  verificationLevel?: number;
}

export function requirePerm(actor: Actor | null | undefined, perm: string): asserts actor is Actor {
  if (!actor) throw unauthorized();
  if (!actor.permissions.includes(perm)) throw forbidden();
}

export function requireActor(actor: Actor | null | undefined): asserts actor is Actor {
  if (!actor) throw unauthorized();
}
