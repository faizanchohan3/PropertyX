/**
 * Payment gateway abstraction. No provider is hard-coded: gateways register here
 * and are enabled through PAYMENT_GATEWAYS (comma-separated keys). Business logic
 * (activating subscriptions, featuring listings, starting ads) lives in the
 * application's fulfilment service and is triggered only after `verifyCallback`
 * confirms a payment.
 */
import { createHmac, createCipheriv, timingSafeEqual } from "node:crypto";

export interface PaymentIntent {
  id: string;
  invoiceNumber: string;
  amount: number; // PKR
  description: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export type CheckoutAction =
  | { type: "redirect"; url: string }
  | { type: "form_post"; url: string; fields: Record<string, string> };

export interface CallbackResult {
  invoiceNumber: string;
  status: "succeeded" | "failed" | "cancelled";
  providerRef: string | null;
  message?: string;
  raw: Record<string, string>;
}

export interface PaymentGateway {
  key: string;
  name: string;
  description: string;
  methods: string[];
  isConfigured(): boolean;
  createCheckout(intent: PaymentIntent, ctx: { appUrl: string; returnUrl: string }): Promise<CheckoutAction>;
  verifyCallback(params: Record<string, string>): Promise<CallbackResult>;
}

function secret() {
  return process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me-please-0123456789";
}

export function signSandbox(invoiceNumber: string, amount: number, status: string) {
  return createHmac("sha256", secret()).update(`${invoiceNumber}|${amount}|${status}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ---------------- Sandbox (built-in test gateway) ---------------- */

export const sandboxGateway: PaymentGateway = {
  key: "sandbox",
  name: "Test Gateway (Sandbox)",
  description: "Simulated checkout for development and QA. No real money moves.",
  methods: ["Test card", "Test wallet"],
  isConfigured: () => process.env.NODE_ENV !== "production" || process.env.ALLOW_SANDBOX_PAYMENTS === "true",
  async createCheckout(intent, ctx) {
    return { type: "redirect", url: `${ctx.appUrl}/checkout/sandbox/${intent.invoiceNumber}?return=${encodeURIComponent(ctx.returnUrl)}` };
  },
  async verifyCallback(p) {
    const status = p.status === "succeeded" ? "succeeded" : p.status === "cancelled" ? "cancelled" : "failed";
    const expected = signSandbox(p.invoiceNumber, Number(p.amount), p.status);
    if (!p.signature || !safeEqual(expected, p.signature)) return { invoiceNumber: p.invoiceNumber, status: "failed", providerRef: null, message: "Invalid signature", raw: p };
    return { invoiceNumber: p.invoiceNumber, status, providerRef: `SBX-${p.invoiceNumber}-${Date.now().toString(36).toUpperCase()}`, raw: p };
  },
};

/* ---------------- JazzCash (HTTP POST redirect, v1.1) ---------------- */

function jazzHash(fields: Record<string, string>, salt: string) {
  const values = Object.keys(fields)
    .filter((k) => k.startsWith("pp_") && k !== "pp_SecureHash" && fields[k] !== "")
    .sort()
    .map((k) => fields[k]);
  return createHmac("sha256", salt).update([salt, ...values].join("&")).digest("hex").toUpperCase();
}

const ts = (d: Date) => d.toISOString().replace(/[-:T]/g, "").slice(0, 14);

export const jazzCashGateway: PaymentGateway = {
  key: "jazzcash",
  name: "JazzCash",
  description: "Pay with JazzCash mobile account or debit/credit card.",
  methods: ["JazzCash wallet", "Card"],
  isConfigured: () => !!(process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_PASSWORD && process.env.JAZZCASH_INTEGRITY_SALT),
  async createCheckout(intent, ctx) {
    const now = new Date();
    const fields: Record<string, string> = {
      pp_Version: "1.1",
      pp_TxnType: "",
      pp_Language: "EN",
      pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID!,
      pp_Password: process.env.JAZZCASH_PASSWORD!,
      pp_TxnRefNo: intent.invoiceNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 20),
      pp_Amount: String(Math.round(intent.amount * 100)),
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: ts(now),
      pp_BillReference: intent.invoiceNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 20),
      pp_Description: intent.description.slice(0, 100),
      pp_TxnExpiryDateTime: ts(new Date(now.getTime() + 3600_000)),
      pp_ReturnURL: `${ctx.appUrl}/api/v1/payments/callback/jazzcash`,
      ppmpf_1: intent.invoiceNumber,
    };
    fields.pp_SecureHash = jazzHash(fields, process.env.JAZZCASH_INTEGRITY_SALT!);
    return { type: "form_post", url: process.env.JAZZCASH_ENDPOINT || "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/", fields };
  },
  async verifyCallback(p) {
    const expected = jazzHash(p, process.env.JAZZCASH_INTEGRITY_SALT!);
    const invoiceNumber = p.ppmpf_1 || p.pp_BillReference;
    if (!p.pp_SecureHash || !safeEqual(expected, p.pp_SecureHash.toUpperCase())) return { invoiceNumber, status: "failed", providerRef: null, message: "Hash mismatch", raw: p };
    return { invoiceNumber, status: p.pp_ResponseCode === "000" ? "succeeded" : "failed", providerRef: p.pp_RetreivalReferenceNo || p.pp_TxnRefNo || null, message: p.pp_ResponseMessage, raw: p };
  },
};

/* ---------------- Easypaisa (Easypay hosted checkout) ---------------- */

function easypaisaHash(params: Record<string, string>, key: string) {
  const str = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const cipher = createCipheriv("aes-128-ecb", Buffer.from(key.padEnd(16).slice(0, 16)), null);
  return Buffer.concat([cipher.update(str, "utf8"), cipher.final()]).toString("base64");
}

export const easypaisaGateway: PaymentGateway = {
  key: "easypaisa",
  name: "Easypaisa",
  description: "Pay with an Easypaisa mobile account.",
  methods: ["Easypaisa wallet", "Card"],
  isConfigured: () => !!(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY),
  async createCheckout(intent, ctx) {
    const params: Record<string, string> = {
      amount: intent.amount.toFixed(1),
      orderRefNum: intent.invoiceNumber,
      paymentMethod: "MA_PAYMENT_METHOD",
      postBackURL: `${ctx.appUrl}/api/v1/payments/callback/easypaisa`,
      storeId: process.env.EASYPAISA_STORE_ID!,
      timeStamp: new Date().toISOString().slice(0, 19),
    };
    return {
      type: "form_post",
      url: process.env.EASYPAISA_ENDPOINT || "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf",
      fields: { ...params, merchantHashedReq: easypaisaHash(params, process.env.EASYPAISA_HASH_KEY!), autoRedirect: "1" },
    };
  },
  async verifyCallback(p) {
    // Easypay posts back orderRefNumber + status; the status must be confirmed with the
    // Inquire Transaction API before fulfilment in production (see docs/payments.md).
    const invoiceNumber = p.orderRefNumber || p.orderRefNum;
    return { invoiceNumber, status: p.status === "0000" || p.status?.toLowerCase() === "paid" ? "succeeded" : "failed", providerRef: p.transactionRefNumber ?? null, raw: p };
  },
};

const REGISTRY: PaymentGateway[] = [sandboxGateway, jazzCashGateway, easypaisaGateway];

export function registerGateway(g: PaymentGateway) {
  const i = REGISTRY.findIndex((x) => x.key === g.key);
  if (i >= 0) REGISTRY[i] = g;
  else REGISTRY.push(g);
}

/** Gateways that are both enabled by configuration and have credentials. */
export function enabledGateways(): PaymentGateway[] {
  const keys = (process.env.PAYMENT_GATEWAYS ?? "sandbox").split(",").map((s) => s.trim()).filter(Boolean);
  return REGISTRY.filter((g) => keys.includes(g.key) && g.isConfigured());
}

export function getGateway(key: string): PaymentGateway | undefined {
  return enabledGateways().find((g) => g.key === key);
}

export function invoiceNumber() {
  const d = new Date();
  return `PX-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
