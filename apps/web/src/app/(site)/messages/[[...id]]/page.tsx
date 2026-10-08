import { listConversations } from "@propertyx/core";
import { requireUser, db } from "@/lib/server";
import { Inbox } from "@/components/messages/inbox";

export const metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesPage({ params }: { params: Promise<{ id?: string[] }> }) {
  const { id } = await params;
  const user = await requireUser(`/messages${id?.[0] ? `/${id[0]}` : ""}`);
  const conversations = await listConversations(db, user);
  return (
    <div className="container-px py-6">
      <h1 className="mb-4 text-2xl font-extrabold">Messages</h1>
      <Inbox conversations={conversations} activeId={id?.[0]} />
    </div>
  );
}
