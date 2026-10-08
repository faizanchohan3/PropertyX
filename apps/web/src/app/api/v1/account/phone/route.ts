import { requestPhoneOtp, confirmPhoneOtp } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

/** POST {phone} sends a code; PUT {phone, code} verifies it. */
export const POST = route(async ({ req, user }) => requestPhoneOtp(db, user, (await body<{ phone: string }>(req)).phone), { auth: true, rate: 5 });
export const PUT = route(async ({ req, user }) => {
  const b = await body<{ phone: string; code: string }>(req);
  return confirmPhoneOtp(db, user, b.phone, b.code);
}, { auth: true, rate: 10 });
