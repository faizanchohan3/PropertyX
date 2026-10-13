import { isUAE } from "@propertyx/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "Help & support", description: "Answers to common questions about searching, listing, messaging, verification and payments on Bismillah.", alternates: { canonical: "/help" } };

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: "How do I search for a property?", a: <>Use the search box on the <Link href="/">home page</Link>, browse <Link href="/buy">Buy</Link> or <Link href="/rent">Rent</Link>, or describe what you want to the <Link href="/ai">AI assistant</Link> in plain words — {isUAE ? "budget in AED, size in sq ft, and the community" : "budget in lakh or crore, size in marla, and the area"}.</> },
  { q: "How do I post my property?", a: <>Create a free account and press <Link href="/post-property">Post Property</Link>. The guided form takes a few minutes, and AI can help you write the title and description. Owners can list for free.</> },
  { q: "How do I contact a seller or agent?", a: <>On any property page, use the message box, call or WhatsApp buttons, or request a visit. Your conversations are in <Link href="/messages">Messages</Link>.</> },
  { q: "What do the verification badges mean?", a: <>Badges show what has been checked — from a verified phone number up to documents reviewed by our team. Always check ownership documents yourself before paying.</> },
  { q: "How do I save a search and get alerts?", a: <>Run a search, then press Save search. Manage your alerts in <Link href="/alerts">Alerts</Link> and choose how you're notified in <Link href="/account/notifications">notification settings</Link>.</> },
  { q: "How do I report a fake or suspicious listing?", a: <>Press Report on the property page and choose a reason. Our team reviews every report. Read our <Link href="/safety">safety tips</Link> to avoid common scams.</> },
  { q: "How do plans and payments work?", a: <>Owners list for free. Agents, agencies and developers can upgrade for more listings and featured placement — see <Link href="/pricing">Pricing</Link>.</> },
  { q: "I forgot my password", a: <>On the <Link href="/login">login page</Link>, use “Forgot password” to get a reset link.</> },
];

export default function HelpPage() {
  return (
    <StaticPage title="Help & support" intro="Quick answers to the most common questions.">
      {FAQ.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}
      <h2>Still need help?</h2>
      <p>Ask the <Link href="/forum">community forum</Link>, or log in and send us a message from your account. For urgent safety issues, use Report on the listing or conversation.</p>
    </StaticPage>
  );
}
