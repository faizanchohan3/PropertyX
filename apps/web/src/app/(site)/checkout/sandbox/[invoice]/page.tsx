import { notFound } from "next/navigation";
import { getPaymentByInvoice } from "@propertyx/core";
import { signSandbox } from "@propertyx/payments";
import { formatPKRFull } from "@propertyx/shared";
import { requireUser, db } from "@/lib/server";
import { LogoMark } from "@/components/logo";

export const metadata = { title: "Test checkout", robots: { index: false } };

/** Built-in test gateway. Simulates a hosted payment page; no real money moves. */
export default async function SandboxCheckout({ params }: { params: Promise<{ invoice: string }> }) {
  const { invoice } = await params;
  const user = await requireUser(`/checkout/sandbox/${invoice}`);
  const p = await getPaymentByInvoice(db, invoice);
  if (!p || p.userId !== user.id || p.provider !== "sandbox") notFound();
  const done = p.status !== "pending";
  const form = (status: "succeeded" | "failed" | "cancelled", label: string, cls: string) => (
    <form action="/api/v1/payments/callback/sandbox" method="post">
      <input type="hidden" name="invoiceNumber" value={p.invoiceNumber} />
      <input type="hidden" name="amount" value={p.amount} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="signature" value={signSandbox(p.invoiceNumber, p.amount, status)} />
      <button className={`${cls} w-full`}>{label}</button>
    </form>
  );
  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-gold-300">Test gateway — sandbox</p>
          <p className="text-sm text-slate-300">No real payment is taken. Use this to test checkout flows.</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="font-bold">Bismillah Pakistan</p>
              <p className="text-xs text-slate-500">Invoice {p.invoiceNumber}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">{p.description}</p>
            <p className="mt-1 text-3xl font-extrabold">{formatPKRFull(p.amount)}</p>
          </div>
          {done ? (
            <p className="mt-6 rounded-xl bg-slate-100 p-3 text-center text-sm">This payment is already {p.status}.</p>
          ) : (
            <div className="mt-6 space-y-2">
              {form("succeeded", "Pay now (simulate success)", "btn-primary py-3")}
              {form("failed", "Simulate a declined payment", "btn-outline")}
              {form("cancelled", "Cancel", "btn-ghost")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
