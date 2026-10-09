import { notFound } from "next/navigation";
import { getPaymentByInvoice } from "@propertyx/core";
import { formatPKRFull } from "@propertyx/shared";
import { requireUser, db } from "@/lib/server";
import { LogoMark } from "@/components/logo";
import { StatusPill } from "@/components/badges";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser();
  const p = await getPaymentByInvoice(db, number);
  if (!p || (p.userId !== user.id && !user.permissions.includes("billing.manage"))) notFound();
  return (
    <div className="card mx-auto max-w-2xl p-8 print:shadow-none">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="font-bold">Bismillah Pakistan</p>
            <p className="text-xs text-slate-500">Invoice / receipt</p>
          </div>
        </div>
        <StatusPill status={p.status} />
      </div>
      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Invoice number</dt><dd className="font-semibold">{p.invoiceNumber}</dd></div>
        <div><dt className="text-slate-500">Date</dt><dd className="font-semibold">{(p.paidAt ?? p.createdAt).toLocaleDateString("en-PK", { dateStyle: "long" })}</dd></div>
        <div><dt className="text-slate-500">Billed to</dt><dd className="font-semibold">{user.name}<br /><span className="font-normal text-slate-500">{user.email}</span></dd></div>
        <div><dt className="text-slate-500">Payment method</dt><dd className="font-semibold capitalize">{p.provider}{p.providerRef ? ` · ${p.providerRef}` : ""}</dd></div>
      </dl>
      <table className="mt-8 w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
        <tbody><tr><td className="py-3">{p.description}</td><td className="py-3 text-right">{formatPKRFull(p.amount)}</td></tr></tbody>
        <tfoot className="border-t border-slate-200"><tr><td className="py-3 font-bold">Total</td><td className="py-3 text-right text-lg font-extrabold">{formatPKRFull(p.amount)}</td></tr></tfoot>
      </table>
      <p className="mt-6 text-xs text-slate-500">Prices include applicable taxes where required. Keep this receipt for your records.</p>
      <div className="mt-6 print:hidden"><PrintButton /></div>
    </div>
  );
}
