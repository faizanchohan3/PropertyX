import { NextResponse, type NextRequest } from "next/server";
import { completePayment, getPaymentByInvoice } from "@propertyx/core";
import { db, appUrl } from "@/lib/server";

/** Gateway return / IPN endpoint. Accepts form posts or query strings; always verifies signatures server-side. */
async function handle(req: NextRequest, gateway: string) {
  const params: Record<string, string> = Object.fromEntries(req.nextUrl.searchParams.entries());
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) Object.assign(params, await req.json());
    else for (const [k, v] of (await req.formData()).entries()) params[k] = String(v);
  }
  try {
    const p = await completePayment(db, gateway, params);
    const back = p.purpose === "advertising" ? "/dashboard/ads" : p.purpose === "featured_listing" ? "/dashboard/listings" : "/dashboard/billing";
    return NextResponse.redirect(new URL(`${back}?payment=${p.invoiceNumber}&status=${p.status}`, appUrl()), 303);
  } catch (e) {
    console.error("[payments] callback failed", gateway, e);
    const inv = params.invoiceNumber || params.ppmpf_1 || params.orderRefNumber;
    const p = inv ? await getPaymentByInvoice(db, inv) : null;
    return NextResponse.redirect(new URL(`/dashboard/billing?payment=${p?.invoiceNumber ?? ""}&status=failed`, appUrl()), 303);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ gateway: string }> }) {
  return handle(req, (await params).gateway);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ gateway: string }> }) {
  return handle(req, (await params).gateway);
}
