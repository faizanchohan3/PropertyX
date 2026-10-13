import { completePayment } from "@propertyx/core";
import { db } from "@/lib/server";

/**
 * Stripe webhook (Dashboard → Developers → Webhooks → endpoint …/api/v1/payments/webhook/stripe,
 * events checkout.session.completed and checkout.session.async_payment_succeeded).
 * Activates the purchase even if the buyer closes the browser before returning. The event body is
 * not trusted: the session is fetched again from Stripe with our secret key before anything is fulfilled.
 */
export async function POST(req: Request) {
  const event = (await req.json().catch(() => null)) as { type?: string; data?: { object?: { id?: string; client_reference_id?: string } } } | null;
  const session = event?.data?.object;
  if (!event?.type?.startsWith("checkout.session.") || !session?.id || !session.client_reference_id) return Response.json({ received: true, ignored: true });
  try {
    const p = await completePayment(db, "stripe", { invoiceNumber: session.client_reference_id, session_id: session.id });
    return Response.json({ received: true, status: p.status });
  } catch (e) {
    console.error("[payments] stripe webhook", e);
    // 500 makes Stripe retry later
    return Response.json({ received: false }, { status: 500 });
  }
}
